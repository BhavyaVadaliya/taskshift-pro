import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getTodayDateString } from '@/lib/utils';
import { logAudit } from '@/lib/logger';
import { sendPushToUser } from '@/lib/push';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date') || getTodayDateString();

  // 1. Fetch all active employees
  const employees = await prisma.user.findMany({
    where: {
      role: 'EMPLOYEE',
      isActive: true,
      profile: { accountStatus: 'ACTIVE' },
    },
    include: {
      profile: {
        include: { department: true, assignedShift: true },
      },
    },
    orderBy: { profile: { fullName: 'asc' } },
  });

  // 2. Find or create the primary "Company Daily Checklist" (available to all users)
  let mainChecklistTask = await prisma.task.findFirst({
    where: {
      isPaused: false,
      OR: [
        { category: 'Company Checklist' },
        { name: { contains: 'Checklist' } },
      ],
    },
    include: {
      checklists: { orderBy: { sortOrder: 'asc' } },
      department: true,
      shift: true,
    },
  });

  // If exists with old department/shift restrictions, make it universal for all employees
  if (mainChecklistTask && (mainChecklistTask.departmentId || mainChecklistTask.shiftId || mainChecklistTask.category !== 'Company Checklist')) {
    mainChecklistTask = await prisma.task.update({
      where: { id: mainChecklistTask.id },
      data: {
        category: 'Company Checklist',
        departmentId: null,
        shiftId: null,
        allowEarlyCompletion: true,
      },
      include: {
        checklists: { orderBy: { sortOrder: 'asc' } },
        department: true,
        shift: true,
      },
    });
    await prisma.taskAssignment.deleteMany({ where: { taskId: mainChecklistTask.id } });
  }
  if (!mainChecklistTask) {
    mainChecklistTask = await prisma.task.create({
      data: {
        name: 'Daily Operational Checklist',
        description: 'Mandatory daily checklist required for all active company employees to verify on their dashboard.',
        instructions: 'Check off each item as you complete it during your shift.',
        category: 'Company Checklist',
        priority: 'HIGH',
        startTime: '09:00',
        dueTime: '18:00',
        reminderTime: '09:15',
        repeatFrequency: 'DAILY',
        repeatDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
        requiredCompletion: true,
        allowEarlyCompletion: true,
        isPaused: false,
        checklists: {
          create: [
            { title: 'Bold Desk - ticket software', timerMinutes: 10, targetTime: '09:10', isRequired: true, sortOrder: 0 },
            { title: 'WP engine', timerMinutes: 60, targetTime: '10:00', isRequired: true, sortOrder: 1 },
            { title: 'Ms teams - A1p tier 1 support new msgs', timerMinutes: 60, targetTime: '10:00', isRequired: true, sortOrder: 2 },
            { title: 'Twillio Tasks - running more than 1 hr', timerMinutes: 60, targetTime: '10:00', isRequired: true, sortOrder: 3 },
            { title: 'outlook - new emails or replies from henry or etc', timerMinutes: 60, targetTime: '10:00', isRequired: true, sortOrder: 4 },
            { title: 'Twilio status page', timerMinutes: 60, targetTime: '10:00', isRequired: true, sortOrder: 5 },
            { title: 'Pantheon status page', timerMinutes: 60, targetTime: '10:00', isRequired: true, sortOrder: 6 },
          ],
        },
      },
      include: {
        checklists: { orderBy: { sortOrder: 'asc' } },
        department: true,
        shift: true,
      },
    });
  }

  // 3. For each employee, ensure a TaskInstance exists for today, and sync checklist completions
  const [startH, startM] = (mainChecklistTask.startTime || '09:00').split(':').map(Number);
  const [dueH, dueM] = (mainChecklistTask.dueTime || '18:00').split(':').map(Number);

  const scheduledStartTime = new Date(`${dateStr}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
  let scheduledDueTime = new Date(`${dateStr}T${String(dueH).padStart(2, '0')}:${String(dueM).padStart(2, '0')}:00`);
  if (scheduledDueTime.getTime() <= scheduledStartTime.getTime()) {
    scheduledDueTime = new Date(scheduledDueTime.getTime() + 24 * 60 * 60 * 1000);
  }

  for (const emp of employees) {
    let instance = await prisma.taskInstance.findUnique({
      where: {
        taskId_userId_date: {
          taskId: mainChecklistTask.id,
          userId: emp.id,
          date: dateStr,
        },
      },
      include: { checklistCompletions: true },
    });

    if (!instance) {
      instance = await prisma.taskInstance.create({
        data: {
          taskId: mainChecklistTask.id,
          userId: emp.id,
          date: dateStr,
          scheduledStartTime,
          scheduledDueTime,
          status: 'NOT_STARTED',
          checklistCompletions: {
            create: mainChecklistTask.checklists.map((item) => ({
              checklistId: item.id,
              isCompleted: false,
            })),
          },
        },
        include: { checklistCompletions: true },
      });
    } else if (instance) {
      // Ensure any newly added checklist items exist in completions
      const existingChecklistIds = new Set(instance.checklistCompletions.map((c) => c.checklistId));
      const missing = mainChecklistTask.checklists.filter((cl) => !existingChecklistIds.has(cl.id));

      if (missing.length > 0) {
        await prisma.checklistCompletion.createMany({
          data: missing.map((cl) => ({
            taskInstanceId: instance!.id,
            checklistId: cl.id,
            isCompleted: false,
          })),
        });
      }
    }
  }

  // 4. Fetch all employee task instances for this checklist today
  const instances = await prisma.taskInstance.findMany({
    where: {
      taskId: mainChecklistTask.id,
      date: dateStr,
    },
    include: {
      user: {
        include: {
          profile: {
            include: { department: true, assignedShift: true },
          },
        },
      },
      checklistCompletions: {
        include: { checklist: true },
      },
    },
  });

  const instancesMap = new Map(instances.map((i) => [i.userId, i]));

  // Build per-employee progress matrix
  const employeeProgress = employees.map((emp) => {
    const inst = instancesMap.get(emp.id);
    const completions = inst?.checklistCompletions || [];
    const compMap = new Map(completions.map((c) => [c.checklistId, c]));

    const checklistItemsStatus = mainChecklistTask!.checklists.map((cl) => {
      const c = compMap.get(cl.id);
      return {
        checklistId: cl.id,
        title: cl.title,
        isRequired: cl.isRequired,
        isCompleted: Boolean(c?.isCompleted),
        completedAt: c?.completedAt?.toISOString() || null,
        comments: c?.comments || null,
      };
    });

    const totalItems = checklistItemsStatus.length;
    const completedItems = checklistItemsStatus.filter((c) => c.isCompleted).length;
    const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      userId: emp.id,
      employeeName: emp.profile?.fullName || emp.email,
      employeeId: emp.employeeId,
      departmentName: emp.profile?.department?.name || 'Unassigned',
      shiftName: emp.profile?.assignedShift?.name || 'Standard Shift',
      taskInstanceId: inst?.id || null,
      status: inst?.status || 'NOT_STARTED',
      totalItems,
      completedItems,
      progressPercent: percent,
      isFullyCompleted: totalItems > 0 && completedItems === totalItems,
      checklistItems: checklistItemsStatus,
    };
  });

  // Calculate team summary stats
  const totalEmployees = employeeProgress.length;
  const fullyCompletedEmployees = employeeProgress.filter((e) => e.isFullyCompleted).length;
  const inProgressEmployees = employeeProgress.filter((e) => e.completedItems > 0 && !e.isFullyCompleted).length;
  const notStartedEmployees = employeeProgress.filter((e) => e.completedItems === 0).length;

  return NextResponse.json({
    success: true,
    date: dateStr,
    checklistTask: {
      id: mainChecklistTask.id,
      name: mainChecklistTask.name,
      description: mainChecklistTask.description,
      instructions: mainChecklistTask.instructions,
      startTime: mainChecklistTask.startTime,
      dueTime: mainChecklistTask.dueTime,
      reminderTime: mainChecklistTask.reminderTime,
      priority: mainChecklistTask.priority,
      category: mainChecklistTask.category,
      allowEarlyCompletion: mainChecklistTask.allowEarlyCompletion,
      items: mainChecklistTask.checklists.map((cl) => ({
        id: cl.id,
        title: cl.title,
        isRequired: cl.isRequired,
        sortOrder: cl.sortOrder,
        targetTime: cl.targetTime || '09:30',
        timerMinutes: cl.timerMinutes || 30,
      })),
    },
    summary: {
      totalEmployees,
      fullyCompletedEmployees,
      inProgressEmployees,
      notStartedEmployees,
      teamCompletionRate:
        totalEmployees > 0
          ? Math.round(
              (employeeProgress.reduce((acc, e) => acc + e.completedItems, 0) /
                (totalEmployees * (mainChecklistTask.checklists.length || 1))) *
                100
            )
          : 0,
    },
    employeeProgress,
  });
}

/**
 * PUT: Admin updates the Daily Checklist items and timing,
 * and pushes the update to ALL user dashboards immediately!
 */
export async function PUT(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const data = await req.json();
    const { taskId, name, description, instructions, startTime, dueTime, reminderTime, items } = data;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one checklist item is required.' },
        { status: 400 }
      );
    }

    const dateStr = getTodayDateString();

    // 1. Update task root - ensure it is universal (no department/shift restrictions)
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        name: name?.trim() || 'Daily Operational Checklist',
        description: description !== undefined ? description?.trim() : undefined,
        instructions: instructions !== undefined ? instructions?.trim() : undefined,
        category: 'Company Checklist',
        startTime: startTime || '00:00',
        dueTime: dueTime || '23:59',
        reminderTime: reminderTime || '00:00',
        allowEarlyCompletion: true,
        departmentId: null,
        shiftId: null,
      },
    });

    // Remove any restrictive direct assignments so it applies to ALL employees
    await prisma.taskAssignment.deleteMany({
      where: { taskId },
    });

    // 2. Re-sync checklist items
    // Process items: keep existing or create new
    const existingChecklists = await prisma.taskChecklist.findMany({ where: { taskId } });
    const existingMap = new Map(existingChecklists.map((c) => [c.id, c]));

    const keptIds = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const title = typeof it === 'string' ? it.trim() : it.title.trim();
      const isRequired = it.isRequired !== undefined ? Boolean(it.isRequired) : true;
      const targetTime = it.targetTime ? String(it.targetTime).trim() : null;
      const timerMinutes = it.timerMinutes ? Number(it.timerMinutes) : 30;

      if (it.id && existingMap.has(it.id)) {
        await prisma.taskChecklist.update({
          where: { id: it.id },
          data: { title, isRequired, sortOrder: i, targetTime, timerMinutes },
        });
        keptIds.add(it.id);
      } else {
        const created = await prisma.taskChecklist.create({
          data: {
            taskId,
            title,
            isRequired,
            sortOrder: i,
            targetTime,
            timerMinutes,
          },
        });
        keptIds.add(created.id);
      }
    }

    // Delete items that were removed
    for (const ec of existingChecklists) {
      if (!keptIds.has(ec.id)) {
        // Delete completion records first if any, then item
        await prisma.checklistCompletion.deleteMany({ where: { checklistId: ec.id } });
        await prisma.taskChecklist.delete({ where: { id: ec.id } });
      }
    }

    // 3. Fetch full updated checklists
    const freshChecklists = await prisma.taskChecklist.findMany({
      where: { taskId },
      orderBy: { sortOrder: 'asc' },
    });

    // 4. Update today's task instances for ALL active employees
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', isActive: true },
    });

    const [startH, startM] = (updatedTask.startTime || '09:00').split(':').map(Number);
    const [dueH, dueM] = (updatedTask.dueTime || '18:00').split(':').map(Number);

    const scheduledStartTime = new Date(`${dateStr}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
    let scheduledDueTime = new Date(`${dateStr}T${String(dueH).padStart(2, '0')}:${String(dueM).padStart(2, '0')}:00`);
    if (scheduledDueTime.getTime() <= scheduledStartTime.getTime()) {
      scheduledDueTime = new Date(scheduledDueTime.getTime() + 24 * 60 * 60 * 1000);
    }

    for (const emp of employees) {
      // Find or create instance
      let instance = await prisma.taskInstance.findUnique({
        where: {
          taskId_userId_date: {
            taskId,
            userId: emp.id,
            date: dateStr,
          },
        },
        include: { checklistCompletions: true },
      });

      if (!instance) {
        await prisma.taskInstance.create({
          data: {
            taskId,
            userId: emp.id,
            date: dateStr,
            scheduledStartTime,
            scheduledDueTime,
            status: 'NOT_STARTED',
            checklistCompletions: {
              create: freshChecklists.map((cl) => ({
                checklistId: cl.id,
                isCompleted: false,
              })),
            },
          },
        });
      } else {
        // Ensure every fresh checklist has a completion record
        const existingCompMap = new Map(instance.checklistCompletions.map((c) => [c.checklistId, c]));
        for (const cl of freshChecklists) {
          if (!existingCompMap.has(cl.id)) {
            await prisma.checklistCompletion.create({
              data: {
                taskInstanceId: instance.id,
                checklistId: cl.id,
                isCompleted: false,
              },
            });
          }
        }
      }

      // Send in-app notification to employee
      await prisma.notificationLog.create({
        data: {
          userId: emp.id,
          title: '📋 Checklist Updated by Admin',
          message: `The daily checklist "${updatedTask.name}" has been updated with new items. Please check your dashboard.`,
          type: 'TASK_REMINDER',
          deliveryStatus: 'DELIVERED',
        },
      });

      // Send push notification if subscribed
      sendPushToUser(emp.id, {
        title: '📋 Daily Checklist Updated',
        body: `Admin updated "${updatedTask.name}". Please open your dashboard to view the checklist.`,
        data: { url: '/employee/tasks', type: 'CHECKLIST_UPDATE' },
      }).catch(() => {});
    }

    // 5. Audit log
    await logAudit({
      userId: adminAuth.user.id,
      action: 'UPDATE_COMPANY_CHECKLIST',
      entity: 'Task',
      entityId: taskId,
      newValues: {
        taskName: updatedTask.name,
        itemCount: freshChecklists.length,
        employeesPushed: employees.length,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Checklist "${updatedTask.name}" updated successfully and pushed to all ${employees.length} employee dashboards!`,
      updatedChecklists: freshChecklists,
    });
  } catch (error: any) {
    console.error('Update checklist error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
