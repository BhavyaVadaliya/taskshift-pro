import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getTodayDateString } from '@/lib/utils';
import { logEmployeeActivity } from '@/lib/logger';

// Helper: convert HH:mm to minutes from midnight
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 540; // 09:00 default
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

// Helper: convert minutes from midnight to "HH:mm"
function minutesToTime(mins: number): string {
  const norm = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Helper: format "HH:mm" to "hh:mm AM/PM"
function formatToAmPm(timeStr: string): string {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

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

  // 2. Fetch the primary Daily Operational Checklist task
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

  const taskColumns = (dailyTask?.checklists || []).map((c) => ({
    id: c.id,
    title: c.title,
    timerMinutes: c.timerMinutes || 30,
    isRequired: c.isRequired,
    sortOrder: c.sortOrder,
    targetTime: c.targetTime,
  }));

  // 3. Determine Shift Timing Bounds
  const startMins = timeToMinutes(shift.startTime || '09:00');
  let endMins = timeToMinutes(shift.endTime || '18:00');
  if (endMins <= startMins) {
    // Overnight shift: add 24 hours (1440 mins)
    endMins += 1440;
  }

  // Current time in minutes for today
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  // 4. Generate 15-Minute Slots
  const slots: Array<{
    slotTime: string; // "09:00"
    label: string; // "09:00 AM"
    slotMinutes: number;
    isPast: boolean;
    isCurrent: boolean;
  }> = [];

  for (let m = startMins; m <= endMins; m += 15) {
    const time24 = minutesToTime(m);
    const label = formatToAmPm(time24);
    const isPast = isToday ? m < currentMins - 7 : date < todayStr;
    const isCurrent = isToday && Math.abs(m - currentMins) <= 7;

    slots.push({
      slotTime: time24,
      label,
      slotMinutes: m,
      isPast,
      isCurrent,
    });
  }

  // 5. Fetch Activity Logs & Checklist Completions for this date
  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(`${date}T23:59:59.999Z`);

  const activityLogs = await prisma.employeeActivityLog.findMany({
    where: {
      userId: auth.user.id,
      timestamp: { gte: startOfDay, lte: endOfDay },
      action: { in: ['CHECKLIST_ITEM_COMPLETED', 'CHECKLIST_SLOT_CHECKED', 'CHECKLIST_ITEM_UNCHECKED'] },
    },
    orderBy: { timestamp: 'asc' },
  });

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

  // Build a lookup map of recorded completions per checklist and slot
  // Key: `${checklistId}_${slotTime}` or `${checklistId}_${closestSlot}`
  const completionMap: Record<
    string,
    { completedAt: string; comments?: string; isLate?: boolean }
  > = {};

  // First check activity logs
  for (const log of activityLogs) {
    try {
      const details = log.details ? JSON.parse(log.details) : {};
      const cId = details.checklistId;
      if (!cId) continue;

      if (log.action === 'CHECKLIST_ITEM_UNCHECKED') {
        const slotKey = details.slotTime ? `${cId}_${details.slotTime}` : null;
        if (slotKey) delete completionMap[slotKey];
        continue;
      }

      const logDate = new Date(log.timestamp);
      const logMins = logDate.getHours() * 60 + logDate.getMinutes();

      // If slotTime was specified directly
      if (details.slotTime) {
        completionMap[`${cId}_${details.slotTime}`] = {
          completedAt: log.timestamp.toISOString(),
          comments: details.comments,
          isLate: details.isLate,
        };
      } else {
        // Find closest matching slot
        let closestSlot = slots[0]?.slotTime;
        let minDiff = 9999;
        for (const s of slots) {
          const diff = Math.abs(s.slotMinutes - logMins);
          if (diff < minDiff) {
            minDiff = diff;
            closestSlot = s.slotTime;
          }
        }
        if (closestSlot && minDiff <= 30) {
          completionMap[`${cId}_${closestSlot}`] = {
            completedAt: log.timestamp.toISOString(),
            comments: details.comments,
            isLate: details.isLate,
          };
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  // Also include taskInstance checklist completions if not already mapped
  if (taskInstance?.checklistCompletions) {
    for (const comp of taskInstance.checklistCompletions) {
      if (comp.isCompleted && comp.completedAt) {
        const compDate = new Date(comp.completedAt);
        const compMins = compDate.getHours() * 60 + compDate.getMinutes();

        // Find closest slot
        let closestSlot = slots[0]?.slotTime;
        let minDiff = 9999;
        for (const s of slots) {
          const diff = Math.abs(s.slotMinutes - compMins);
          if (diff < minDiff) {
            minDiff = diff;
            closestSlot = s.slotTime;
          }
        }
        const key = `${comp.checklistId}_${closestSlot}`;
        if (!completionMap[key]) {
          completionMap[key] = {
            completedAt: comp.completedAt.toISOString(),
            comments: comp.comments || undefined,
            isLate: comp.isLate,
          };
        }
      }
    }
  }

  // 6. Build the 2D Matrix Rows
  let totalScheduledChecks = 0;
  let completedChecks = 0;
  let missedChecks = 0;

  const matrixRows = slots.map((slot) => {
    const taskCells: Record<
      string,
      {
        isScheduled: boolean;
        status: 'CHECKED' | 'DUE_NOW' | 'MISSED' | 'SCHEDULED' | 'NOT_APPLICABLE';
        completedAt?: string;
        isLate?: boolean;
        comments?: string;
      }
    > = {};

    taskColumns.forEach((task) => {
      const interval = task.timerMinutes || 30;
      // Is this task scheduled at this slot interval?
      // For tasks with interval 15: every slot (offset % 15 === 0)
      // For interval 30: every 30 mins (offset % 30 === 0)
      // For interval 60: every 60 mins (offset % 60 === 0)
      const offsetMins = slot.slotMinutes - startMins;
      const isScheduled = offsetMins >= 0 && offsetMins % interval === 0;

      if (!isScheduled) {
        taskCells[task.id] = {
          isScheduled: false,
          status: 'NOT_APPLICABLE',
        };
        return;
      }

      totalScheduledChecks++;
      const compKey = `${task.id}_${slot.slotTime}`;
      const record = completionMap[compKey];

      if (record) {
        completedChecks++;
        taskCells[task.id] = {
          isScheduled: true,
          status: 'CHECKED',
          completedAt: record.completedAt,
          isLate: record.isLate,
          comments: record.comments,
        };
      } else if (slot.isCurrent) {
        taskCells[task.id] = {
          isScheduled: true,
          status: 'DUE_NOW',
        };
      } else if (slot.isPast) {
        missedChecks++;
        taskCells[task.id] = {
          isScheduled: true,
          status: 'MISSED',
        };
      } else {
        taskCells[task.id] = {
          isScheduled: true,
          status: 'SCHEDULED',
        };
      }
    });

    return {
      slotTime: slot.slotTime,
      label: slot.label,
      slotMinutes: slot.slotMinutes,
      isPast: slot.isPast,
      isCurrent: slot.isCurrent,
      tasks: taskCells,
    };
  });

  const completionRate =
    totalScheduledChecks > 0 ? Math.round((completedChecks / totalScheduledChecks) * 100) : 0;

  return NextResponse.json({
    success: true,
    date,
    shift: {
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      startLabel: formatToAmPm(shift.startTime),
      endLabel: formatToAmPm(shift.endTime),
      actualStart: attendance?.actualStart || null,
      actualEnd: attendance?.actualEnd || null,
      isShiftActive: Boolean(attendance?.actualStart && !attendance?.actualEnd),
    },
    tasks: taskColumns,
    matrix: matrixRows,
    summary: {
      totalScheduledChecks,
      completedChecks,
      missedChecks,
      completionRate,
    },
  });
}

// POST endpoint: Allows recording or toggling a check directly for a specific time slot
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const now = new Date();
  const body = await req.json();
  const { checklistId, slotTime, isCompleted = true, comments = '', date = getTodayDateString() } = body;

  if (!checklistId || !slotTime) {
    return NextResponse.json(
      { success: false, error: 'Checklist ID and slotTime are required.' },
      { status: 400 }
    );
  }

  // Find checklist title for audit
  const checklist = await prisma.taskChecklist.findUnique({
    where: { id: checklistId },
    include: { task: true },
  });

  if (!checklist) {
    return NextResponse.json({ success: false, error: 'Checklist not found.' }, { status: 404 });
  }

  // Log in EmployeeActivityLog with slotTime
  await logEmployeeActivity({
    userId: auth.user.id,
    action: isCompleted ? 'CHECKLIST_SLOT_CHECKED' : 'CHECKLIST_ITEM_UNCHECKED',
    details: {
      checklistId,
      checklistTitle: checklist.title,
      slotTime,
      date,
      comments,
      completedAt: isCompleted ? now.toISOString() : null,
    },
    req,
  });

  // Also update or create TaskInstance and ChecklistCompletion if instance exists
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
        isCompleted: Boolean(isCompleted),
        completedAt: isCompleted ? now : null,
        comments: comments || undefined,
      },
      create: {
        taskInstanceId: instance.id,
        checklistId,
        isCompleted: Boolean(isCompleted),
        completedAt: isCompleted ? now : null,
        comments: comments || null,
      },
    });
  }

  return NextResponse.json({
    success: true,
    message: isCompleted ? 'Task checked for scheduled slot' : 'Task unchecked',
    slotTime,
    checklistId,
  });
}
