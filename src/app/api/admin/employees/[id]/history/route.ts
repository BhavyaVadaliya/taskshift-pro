import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getTodayDateString } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || getTodayDateString();
  const userId = params.id;

  // 1. Fetch employee details
  const employeeUser = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!employeeUser) {
    return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
  }

  const attendance = employeeUser.attendances?.[0] || null;
  const shift = attendance?.shift || employeeUser.profile?.assignedShift || {
    name: 'Morning Shift',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodMinutes: 15,
  };

  const isShiftActive = Boolean(attendance?.actualStart && !attendance?.actualEnd);

  // 2. Fetch the 7 support checklist tasks
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
      userId,
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
    intervalMinutes: number; // 10 or 60
    nextDueAt: string; // ISO
    nextDueAtTime: string; // "12:01:18 PM"
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
          userId,
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

  // Recent 10 attendances for this employee
  const recentAttendances = await prisma.shiftAttendance.findMany({
    where: { userId },
    include: { shift: true },
    orderBy: { date: 'desc' },
    take: 10,
  });

  return NextResponse.json({
    success: true,
    date,
    employee: {
      id: employeeUser.id,
      fullName: employeeUser.profile?.fullName || 'Employee',
      employeeId: employeeUser.employeeId,
      email: employeeUser.email,
      phone: employeeUser.profile?.phone || null,
      department: employeeUser.profile?.department?.name || 'Technical Support',
      designation: employeeUser.profile?.designation || 'Specialist',
      assignedShift: employeeUser.profile?.assignedShift?.name || 'Morning Shift',
      accountStatus: employeeUser.profile?.accountStatus || 'ACTIVE',
    },
    shift: {
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      isShiftActive,
      actualStart: attendance?.actualStart || null,
      actualEnd: attendance?.actualEnd || null,
      lateMinutes: attendance?.lateMinutes || 0,
      totalDurationMinutes: attendance?.totalDurationMinutes || 0,
      attendanceStatus: attendance?.status || (isShiftActive ? 'PRESENT' : 'OFF'),
    },
    tasks: taskStatuses,
    historyLogs,
    recentAttendances: recentAttendances.map((a) => ({
      id: a.id,
      date: a.date,
      shiftName: a.shift?.name || 'Standard Shift',
      actualStart: a.actualStart,
      actualEnd: a.actualEnd,
      status: a.status,
      durationMinutes: a.totalDurationMinutes,
      lateMinutes: a.lateMinutes,
    })),
    summary: {
      totalChecksToday: historyLogs.length,
      activeTasksCount: checklists.length,
      isShiftActive,
    },
  });
}

