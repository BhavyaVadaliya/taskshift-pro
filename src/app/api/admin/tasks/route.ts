import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/logger';
import { generateDailyTaskInstances } from '@/lib/scheduler';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');
  const shiftId = searchParams.get('shiftId');
  const category = searchParams.get('category');

  const tasks = await prisma.task.findMany({
    where: {
      ...(departmentId ? { departmentId } : {}),
      ...(shiftId ? { shiftId } : {}),
      ...(category ? { category } : {}),
    },
    include: {
      department: true,
      shift: true,
      checklists: { orderBy: { sortOrder: 'asc' } },
      assignments: {
        include: {
          user: {
            include: { profile: true },
          },
        },
      },
      notificationSchedule: true,
      _count: {
        select: { instances: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = tasks.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    instructions: t.instructions,
    departmentId: t.departmentId,
    departmentName: t.department?.name || 'All Departments',
    shiftId: t.shiftId,
    shiftName: t.shift?.name || 'All Shifts',
    priority: t.priority,
    category: t.category,
    startTime: t.startTime,
    dueTime: t.dueTime,
    reminderTime: t.reminderTime,
    repeatFrequency: t.repeatFrequency,
    repeatDays: t.repeatDays ? JSON.parse(t.repeatDays) : [],
    requiredCompletion: t.requiredCompletion,
    allowEarlyCompletion: t.allowEarlyCompletion,
    isPaused: t.isPaused,
    checklists: t.checklists,
    assignments: t.assignments.map((a) => ({
      userId: a.userId,
      employeeName: a.user.profile?.fullName || a.user.employeeId,
      employeeId: a.user.employeeId,
    })),
    notificationSchedule: t.notificationSchedule,
    totalInstancesCount: t._count.instances,
    createdAt: t.createdAt.toISOString(),
  }));

  return NextResponse.json({ success: true, tasks: formatted });
}

export async function POST(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const data = await req.json();
    const {
      name,
      description,
      instructions,
      departmentId,
      assignedEmployeeIds,
      shiftId,
      priority,
      category,
      startTime,
      dueTime,
      reminderTime,
      repeatFrequency,
      repeatDays,
      checklists,
      requiredCompletion,
      allowEarlyCompletion,
      notificationMessage,
      repeatIntervalMinutes,
      maxReminders,
      escalationMinutes,
    } = data;

    if (!name || !startTime || !dueTime) {
      return NextResponse.json(
        { success: false, error: 'Task name, start time, and due time are required.' },
        { status: 400 }
      );
    }

    const newTask = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          instructions: instructions?.trim() || null,
          departmentId: departmentId || null,
          shiftId: shiftId || null,
          priority: priority || 'MEDIUM',
          category: category || 'General',
          startTime,
          dueTime,
          reminderTime: reminderTime || startTime,
          repeatFrequency: repeatFrequency || 'DAILY',
          repeatDays: repeatDays ? JSON.stringify(repeatDays) : null,
          requiredCompletion: requiredCompletion !== undefined ? Boolean(requiredCompletion) : true,
          allowEarlyCompletion: Boolean(allowEarlyCompletion),
          isPaused: false,
          checklists: {
            create: (checklists || []).map((c: any, index: number) => ({
              title: typeof c === 'string' ? c : c.title,
              isRequired: c.isRequired !== undefined ? Boolean(c.isRequired) : true,
              sortOrder: index,
            })),
          },
          assignments: {
            create: (assignedEmployeeIds || []).map((userId: string) => ({
              userId,
            })),
          },
          notificationSchedule: {
            create: {
              notificationTime: reminderTime || startTime,
              message: notificationMessage || `Please complete your assigned task "${name}".`,
              repeatIntervalMinutes: Number(repeatIntervalMinutes) || 15,
              maxReminders: Number(maxReminders) || 3,
              escalationMinutes: Number(escalationMinutes) || 30,
              isEnabled: true,
            },
          },
        },
        include: {
          checklists: true,
          assignments: true,
          notificationSchedule: true,
        },
      });

      return task;
    });

    // Auto generate instances for today if applicable
    await generateDailyTaskInstances();

    await logAudit({
      userId: adminAuth.user.id,
      action: 'CREATE_TASK',
      entity: 'Task',
      entityId: newTask.id,
      newValues: { name: newTask.name, priority, startTime, dueTime },
      req,
    });

    return NextResponse.json({ success: true, task: newTask });
  } catch (error: any) {
    console.error('Create task error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
