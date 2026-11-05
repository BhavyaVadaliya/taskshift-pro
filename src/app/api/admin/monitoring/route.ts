import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getTodayDateString } from '@/lib/utils';
import { generateDailyTaskInstances } from '@/lib/scheduler';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date') || getTodayDateString();
  const departmentId = searchParams.get('departmentId');
  const status = searchParams.get('status');
  const employeeId = searchParams.get('employeeId');

  await generateDailyTaskInstances(dateStr);

  const instances = await prisma.taskInstance.findMany({
    where: {
      date: dateStr,
      ...(status ? { status } : {}),
      ...(employeeId ? { userId: employeeId } : {}),
      task: {
        ...(departmentId ? { departmentId } : {}),
      },
    },
    include: {
      task: {
        include: {
          department: true,
          checklists: { orderBy: { sortOrder: 'asc' } },
        },
      },
      user: {
        include: {
          profile: {
            include: { department: true, assignedShift: true },
          },
        },
      },
      checklistCompletions: true,
    },
    orderBy: [{ scheduledStartTime: 'asc' }, { createdAt: 'desc' }],
  });

  const now = new Date();

  const formatted = instances.map((inst) => {
    const totalChecklists = inst.task.checklists.length;
    const completedChecklists = inst.checklistCompletions.filter((c) => c.isCompleted).length;
    const progressPercent = totalChecklists > 0 ? Math.round((completedChecklists / totalChecklists) * 100) : 0;

    // Calculate delay duration if overdue or completed late
    let delayMinutes = inst.delayMinutes;
    if (inst.status === 'OVERDUE' && inst.completedAt === null) {
      delayMinutes = Math.max(0, Math.floor((now.getTime() - inst.scheduledDueTime.getTime()) / (60 * 1000)));
    }

    return {
      instanceId: inst.id,
      taskId: inst.taskId,
      taskName: inst.task.name,
      priority: inst.task.priority,
      category: inst.task.category,
      departmentName: inst.task.department?.name || 'All',
      userId: inst.userId,
      employeeName: inst.user.profile?.fullName || 'Employee',
      employeeId: inst.user.employeeId,
      shiftName: inst.user.profile?.assignedShift?.name || 'Standard',
      date: inst.date,
      scheduledStartTime: inst.scheduledStartTime.toISOString(),
      scheduledDueTime: inst.scheduledDueTime.toISOString(),
      startTimeFormatted: inst.task.startTime,
      dueTimeFormatted: inst.task.dueTime,
      notificationSentAt: inst.notificationSentAt ? inst.notificationSentAt.toISOString() : null,
      notificationAcknowledgedAt: inst.notificationAcknowledgedAt
        ? inst.notificationAcknowledgedAt.toISOString()
        : null,
      startedAt: inst.startedAt ? inst.startedAt.toISOString() : null,
      completedAt: inst.completedAt ? inst.completedAt.toISOString() : null,
      status: inst.status,
      delayMinutes,
      checklistProgress: {
        total: totalChecklists,
        completed: completedChecklists,
        percent: progressPercent,
      },
      employeeComments: inst.employeeComments,
    };
  });

  return NextResponse.json({
    success: true,
    date: dateStr,
    totalCount: formatted.length,
    tasks: formatted,
  });
}
