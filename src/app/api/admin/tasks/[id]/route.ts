import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/logger';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const data = await req.json();
    const taskId = params.id;

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: { checklists: true, assignments: true, notificationSchedule: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
    }

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
      isPaused,
      notificationMessage,
      repeatIntervalMinutes,
      maxReminders,
      escalationMinutes,
      notificationEnabled,
    } = data;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update task root fields
      const task = await tx.task.update({
        where: { id: taskId },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(description !== undefined ? { description: description?.trim() || null } : {}),
          ...(instructions !== undefined ? { instructions: instructions?.trim() || null } : {}),
          ...(departmentId !== undefined ? { departmentId: departmentId || null } : {}),
          ...(shiftId !== undefined ? { shiftId: shiftId || null } : {}),
          ...(priority ? { priority } : {}),
          ...(category ? { category } : {}),
          ...(startTime ? { startTime } : {}),
          ...(dueTime ? { dueTime } : {}),
          ...(reminderTime ? { reminderTime } : {}),
          ...(repeatFrequency ? { repeatFrequency } : {}),
          ...(repeatDays !== undefined ? { repeatDays: JSON.stringify(repeatDays) } : {}),
          ...(requiredCompletion !== undefined ? { requiredCompletion: Boolean(requiredCompletion) } : {}),
          ...(allowEarlyCompletion !== undefined ? { allowEarlyCompletion: Boolean(allowEarlyCompletion) } : {}),
          ...(isPaused !== undefined ? { isPaused: Boolean(isPaused) } : {}),
        },
      });

      // 2. Update assignments if provided
      if (Array.isArray(assignedEmployeeIds)) {
        await tx.taskAssignment.deleteMany({ where: { taskId } });
        if (assignedEmployeeIds.length > 0) {
          await tx.taskAssignment.createMany({
            data: assignedEmployeeIds.map((userId: string) => ({
              taskId,
              userId,
            })),
          });
        }
      }

      // 3. Update checklists if provided
      if (Array.isArray(checklists)) {
        // Keep existing checklist items referenced in completions, add or update new ones
        await tx.taskChecklist.deleteMany({ where: { taskId } });
        if (checklists.length > 0) {
          await tx.taskChecklist.createMany({
            data: checklists.map((c: any, index: number) => ({
              taskId,
              title: typeof c === 'string' ? c : c.title,
              isRequired: c.isRequired !== undefined ? Boolean(c.isRequired) : true,
              sortOrder: index,
            })),
          });
        }
      }

      // 4. Update notification schedule
      if (notificationMessage !== undefined || repeatIntervalMinutes !== undefined || notificationEnabled !== undefined) {
        await tx.notificationSchedule.upsert({
          where: { taskId },
          update: {
            notificationTime: reminderTime || startTime || existing.startTime,
            message: notificationMessage || existing.notificationSchedule?.message || `Reminder for task ${task.name}`,
            repeatIntervalMinutes: Number(repeatIntervalMinutes) || 15,
            maxReminders: Number(maxReminders) || 3,
            escalationMinutes: Number(escalationMinutes) || 30,
            isEnabled: notificationEnabled !== undefined ? Boolean(notificationEnabled) : true,
          },
          create: {
            taskId,
            notificationTime: reminderTime || startTime || existing.startTime,
            message: notificationMessage || `Reminder for task ${task.name}`,
            repeatIntervalMinutes: Number(repeatIntervalMinutes) || 15,
            maxReminders: Number(maxReminders) || 3,
            escalationMinutes: Number(escalationMinutes) || 30,
            isEnabled: notificationEnabled !== undefined ? Boolean(notificationEnabled) : true,
          },
        });
      }

      return task;
    });

    await logAudit({
      userId: adminAuth.user.id,
      action: 'UPDATE_TASK',
      entity: 'Task',
      entityId: taskId,
      oldValues: { name: existing.name, isPaused: existing.isPaused },
      newValues: { name: updated.name, isPaused: updated.isPaused },
      req,
    });

    return NextResponse.json({ success: true, task: updated });
  } catch (error: any) {
    console.error('Update task error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const taskId = params.id;
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: { _count: { select: { instances: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
    }

    // If task has completed historical instances, pause it rather than destroying audit trail
    if (existing._count.instances > 0) {
      await prisma.task.update({
        where: { id: taskId },
        data: { isPaused: true },
      });
      return NextResponse.json({
        success: true,
        message: 'Task has historical completion records. It has been deactivated/paused to preserve history.',
      });
    }

    await prisma.task.delete({ where: { id: taskId } });

    await logAudit({
      userId: adminAuth.user.id,
      action: 'DELETE_TASK',
      entity: 'Task',
      entityId: taskId,
      req,
    });

    return NextResponse.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error: any) {
    console.error('Delete task error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
