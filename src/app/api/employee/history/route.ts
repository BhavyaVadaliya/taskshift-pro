import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getTodayDateString } from '@/lib/utils';
import { logEmployeeActivity } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || getTodayDateString();
  const todayStr = getTodayDateString();
  const isToday = date === todayStr;

  // 1. Fetch user profile, assigned shift, and attendance
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    include: {
      profile: {
        include: {
          department: true,
          assignedShift: true,
        },
      },
      attendances: {
        where: { date },
        include: { shift: true },
        take: 1,
      },
    },
  });

  const attendance = user?.attendances?.[0] || null;
  const shift = attendance?.shift || user?.profile?.assignedShift || {
    name: 'Morning Shift',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodMinutes: 15,
  };

  const isShiftActive = Boolean(attendance?.actualStart && !attendance?.actualEnd);

  // 2. Fetch the primary checklist task and its 7 items
  let dailyTask = await prisma.task.findFirst({
    where: {
      OR: [
        { category: 'Company Checklist' },
        { name: { contains: 'Checklist' } },
        { name: { contains: 'Daily' } },
      ],
    },
    include: {
      checklists: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!dailyTask) {
    dailyTask = await prisma.task.findFirst({
      include: {
        checklists: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  const checklists = dailyTask?.checklists || [];
  const checklistMap = new Map(checklists.map((c) => [c.id, c]));

  // 3. Fetch check activity logs for the selected date
  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(`${date}T23:59:59.999Z`);

  const activityLogs = await prisma.employeeActivityLog.findMany({
    where: {
      userId: auth.user.id,
      timestamp: { gte: startOfDay, lte: endOfDay },
      action: { in: ['CHECKLIST_ITEM_COMPLETED', 'CHECKLIST_SLOT_CHECKED'] },
    },
    orderBy: { timestamp: 'desc' },
  });

  // 4. Build exact check history logs
  const historyLogs: Array<{
    id: string;
    checklistId: string;
    taskName: string;
    checkedAt: string; // ISO
    checkedAtTime: string; // "11:51:18 AM"
    checkedAtDate: string; // "Nov 6, 2026"
    intervalMinutes: number; // 15 or 60
    nextDueAt: string; // ISO
    nextDueAtTime: string; // "12:06:18 PM"
    comments?: string;
    isLate?: boolean;
  }> = [];

  for (const log of activityLogs) {
    try {
      const details = log.details ? JSON.parse(log.details) : {};
      const c = checklistMap.get(details.checklistId);
      if (c) {
        const interval = c.timerMinutes || 60;
        const checkedDate = new Date(log.timestamp);
        const nextDueDate = new Date(checkedDate.getTime() + interval * 60 * 1000);

        historyLogs.push({
          id: log.id,
          checklistId: c.id,
          taskName: c.title,
          checkedAt: checkedDate.toISOString(),
          checkedAtTime: checkedDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          checkedAtDate: checkedDate.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          intervalMinutes: interval,
          nextDueAt: nextDueDate.toISOString(),
          nextDueAtTime: nextDueDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          comments: details.comments || undefined,
          isLate: Boolean(details.isLate),
        });
      }
    } catch (e) {
      // ignore JSON parse errors
    }
  }

  // 5. Also check TaskInstance checklist completions if no activity log exists
  const taskInstance = dailyTask
    ? await prisma.taskInstance.findFirst({
        where: {
          taskId: dailyTask.id,
          userId: auth.user.id,
          date,
        },
        include: {
          checklistCompletions: true,
        },
      })
    : null;

  // Build current live status for the 7 tasks
  const now = new Date();
  const currentMs = now.getTime();
  const shiftStartMs = attendance?.actualStart
    ? new Date(attendance.actualStart).getTime()
    : currentMs;

  const taskStatuses = checklists.map((c) => {
    const interval = c.timerMinutes || 60;
    // Find the latest check log for this task today
    const latestLog = historyLogs.find((l) => l.checklistId === c.id);
    const instanceComp = taskInstance?.checklistCompletions.find((ic) => ic.checklistId === c.id);

    let lastCompletedAt: string | null = null;
    let nextDueAt: string | null = null;
    let secondsUntilDue: number = 0;

    if (latestLog) {
      lastCompletedAt = latestLog.checkedAt;
      nextDueAt = latestLog.nextDueAt;
      const nextDueMs = new Date(latestLog.nextDueAt).getTime();
      secondsUntilDue = Math.floor((nextDueMs - currentMs) / 1000);
    } else if (instanceComp?.isCompleted && instanceComp.completedAt) {
      lastCompletedAt = instanceComp.completedAt.toISOString();
      const compMs = new Date(instanceComp.completedAt).getTime();
      const nextDueMs = compMs + interval * 60 * 1000;
      nextDueAt = new Date(nextDueMs).toISOString();
      secondsUntilDue = Math.floor((nextDueMs - currentMs) / 1000);
    } else if (isShiftActive) {
      // Shift active but not checked yet: due from shift start + interval
      const dueMs = shiftStartMs + interval * 60 * 1000;
      nextDueAt = new Date(dueMs).toISOString();
      secondsUntilDue = Math.floor((dueMs - currentMs) / 1000);
    }

    let statusText: 'DUE_NOW' | 'UPCOMING' | 'PENDING' | 'INACTIVE' = 'INACTIVE';
    if (!isShiftActive) {
      statusText = 'INACTIVE';
    } else if (lastCompletedAt && secondsUntilDue > 0) {
      statusText = 'UPCOMING';
    } else {
      statusText = 'DUE_NOW';
    }

    return {
      id: c.id,
      title: c.title,
      timerMinutes: interval,
      isRequired: c.isRequired,
      sortOrder: c.sortOrder,
      lastCompletedAt,
      nextDueAt,
      secondsUntilDue,
      status: statusText,
    };
  });

  return NextResponse.json({
    success: true,
    date,
    shift: {
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      isShiftActive,
      actualStart: attendance?.actualStart || null,
      actualEnd: attendance?.actualEnd || null,
    },
    tasks: taskStatuses,
    historyLogs,
    summary: {
      totalChecksToday: historyLogs.length,
      activeTasksCount: checklists.length,
      isShiftActive,
    },
  });
}

// POST endpoint: Allows recording an exact check log
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const now = new Date();
  const body = await req.json();
  const { checklistId, comments = '', date = getTodayDateString() } = body;

  if (!checklistId) {
    return NextResponse.json(
      { success: false, error: 'Checklist ID is required.' },
      { status: 400 }
    );
  }

  const checklist = await prisma.taskChecklist.findUnique({
    where: { id: checklistId },
    include: { task: true },
  });

  if (!checklist) {
    return NextResponse.json({ success: false, error: 'Checklist not found.' }, { status: 404 });
  }

  // Log in EmployeeActivityLog with exact timestamp
  await logEmployeeActivity({
    userId: auth.user.id,
    action: 'CHECKLIST_ITEM_COMPLETED',
    details: {
      checklistId,
      checklistTitle: checklist.title,
      date,
      comments,
      completedAt: now.toISOString(),
    },
    req,
  });

  // Also update or create TaskInstance and ChecklistCompletion
  const instance = await prisma.taskInstance.findFirst({
    where: {
      taskId: checklist.taskId,
      userId: auth.user.id,
      date,
    },
  });

  if (instance) {
    await prisma.checklistCompletion.upsert({
      where: {
        taskInstanceId_checklistId: {
          taskInstanceId: instance.id,
          checklistId,
        },
      },
      update: {
        isCompleted: true,
        completedAt: now,
        comments: comments || undefined,
      },
      create: {
        taskInstanceId: instance.id,
        checklistId,
        isCompleted: true,
        completedAt: now,
        comments: comments || null,
      },
    });
  }

  const interval = checklist.timerMinutes || 60;
  const nextDue = new Date(now.getTime() + interval * 60 * 1000);

  return NextResponse.json({
    success: true,
    message: 'Check recorded successfully with exact time',
    checkedAt: now.toISOString(),
    nextDueAt: nextDue.toISOString(),
    intervalMinutes: interval,
  });
}
