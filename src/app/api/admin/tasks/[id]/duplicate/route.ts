import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/logger';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const taskId = params.id;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        checklists: { orderBy: { sortOrder: 'asc' } },
        assignments: true,
        notificationSchedule: true,
      },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
    }

    const duplicated = await prisma.$transaction(async (tx) => {
      const copy = await tx.task.create({
        data: {
          name: `${task.name} (Copy)`,
          description: task.description,
          instructions: task.instructions,
          departmentId: task.departmentId,
          shiftId: task.shiftId,
          priority: task.priority,
          category: task.category,
          startTime: task.startTime,
          dueTime: task.dueTime,
          reminderTime: task.reminderTime,
          repeatFrequency: task.repeatFrequency,
          repeatDays: task.repeatDays,
          requiredCompletion: task.requiredCompletion,
          allowEarlyCompletion: task.allowEarlyCompletion,
          isPaused: false,
          checklists: {
            create: task.checklists.map((c, idx) => ({
              title: c.title,
              isRequired: c.isRequired,
              sortOrder: idx,
            })),
          },
          assignments: {
            create: task.assignments.map((a) => ({
              userId: a.userId,
            })),
          },
          notificationSchedule: task.notificationSchedule
            ? {
                create: {
                  notificationTime: task.notificationSchedule.notificationTime,
                  message: task.notificationSchedule.message,
                  repeatIntervalMinutes: task.notificationSchedule.repeatIntervalMinutes,
                  maxReminders: task.notificationSchedule.maxReminders,
                  escalationMinutes: task.notificationSchedule.escalationMinutes,
                  isEnabled: task.notificationSchedule.isEnabled,
                },
              }
            : undefined,
        },
        include: {
          checklists: true,
          assignments: true,
          notificationSchedule: true,
        },
      });

      return copy;
    });

    await logAudit({
      userId: adminAuth.user.id,
      action: 'DUPLICATE_TASK',
      entity: 'Task',
      entityId: duplicated.id,
      newValues: { originalId: taskId, name: duplicated.name },
      req,
    });

    return NextResponse.json({ success: true, task: duplicated });
  } catch (error: any) {
    console.error('Duplicate task error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
