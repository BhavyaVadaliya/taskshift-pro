import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getTodayDateString } from '@/lib/utils';
import { generateDailyTaskInstances } from '@/lib/scheduler';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const dateStr = getTodayDateString();

  // Make sure today's instances are generated
  await generateDailyTaskInstances(dateStr);

  const instances = await prisma.taskInstance.findMany({
    where: {
      userId: auth.user.id,
      date: dateStr,
    },
    include: {
      task: {
        include: {
          department: true,
          checklists: { orderBy: { sortOrder: 'asc' } },
        },
      },
      checklistCompletions: {
        include: {
          checklist: true,
        },
      },
    },
    orderBy: { scheduledStartTime: 'asc' },
  });

  // Calculate totals and format items
  let totalRequiredItems = 0;
  let completedRequiredItems = 0;

  const formattedInstances = instances.map((inst) => {
    const completionsMap = new Map(inst.checklistCompletions.map((c) => [c.checklistId, c]));

    const checklistDTOs = inst.task.checklists.map((cl) => {
      const completion = completionsMap.get(cl.id);
      const isCompleted = Boolean(completion?.isCompleted);

      if (cl.isRequired) {
        totalRequiredItems++;
        if (isCompleted) completedRequiredItems++;
      }

      return {
        id: cl.id,
        title: cl.title,
        isRequired: cl.isRequired,
        sortOrder: cl.sortOrder,
        targetTime: cl.targetTime || null,
        timerMinutes: cl.timerMinutes || null,
        isCompleted,
        completedAt: completion?.completedAt?.toISOString() || null,
        comments: completion?.comments || null,
        isLate: Boolean(completion?.isLate),
      };
    });

    const totalChecklists = checklistDTOs.length;
    const completedChecklists = checklistDTOs.filter((c) => c.isCompleted).length;
    const progressPercent = totalChecklists > 0 ? Math.round((completedChecklists / totalChecklists) * 100) : 0;

    return {
      id: inst.id,
      taskId: inst.taskId,
      taskName: inst.task.name,
      description: inst.task.description,
      instructions: inst.task.instructions,
      category: inst.task.category,
      priority: inst.task.priority as any,
      date: inst.date,
      startTime: inst.task.startTime,
      dueTime: inst.task.dueTime,
      scheduledStartTime: inst.scheduledStartTime.toISOString(),
      scheduledDueTime: inst.scheduledDueTime.toISOString(),
      status: inst.status as any,
      startedAt: inst.startedAt?.toISOString() || null,
      completedAt: inst.completedAt?.toISOString() || null,
      delayMinutes: inst.delayMinutes,
      employeeComments: inst.employeeComments,
      notificationSentAt: inst.notificationSentAt?.toISOString() || null,
      notificationAcknowledgedAt: inst.notificationAcknowledgedAt?.toISOString() || null,
      allowEarlyCompletion: inst.task.allowEarlyCompletion,
      departmentName: inst.task.department?.name,
      checklists: checklistDTOs,
      totalChecklists,
      completedChecklists,
      progressPercent,
    };
  });

  const activeTasks = formattedInstances.filter(
    (t) => t.status === 'IN_PROGRESS' || t.status === 'NOT_STARTED'
  );
  const upcomingTasks = formattedInstances.filter((t) => t.status === 'SCHEDULED');
  const overdueTasks = formattedInstances.filter((t) => t.status === 'OVERDUE');
  const completedTasks = formattedInstances.filter(
    (t) => t.status === 'COMPLETED' || t.status === 'COMPLETED_LATE'
  );

  const overallProgressPercent =
    totalRequiredItems > 0 ? Math.round((completedRequiredItems / totalRequiredItems) * 100) : 100;

  return NextResponse.json({
    success: true,
    tasks: formattedInstances,
    activeTasks,
    upcomingTasks,
    overdueTasks,
    completedTasks,
    progress: {
      totalRequiredItems,
      completedRequiredItems,
      progressPercent: overallProgressPercent,
    },
  });
}

