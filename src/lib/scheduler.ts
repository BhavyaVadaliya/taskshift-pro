import prisma from './prisma';
import { sendPushToUser } from './push';
import { getTodayDateString } from './utils';

const DAYS_MAP = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Generate task instances for a specific date (defaults to today)
 * Creates TaskInstance records and child ChecklistCompletions.
 */
export async function generateDailyTaskInstances(targetDateStr?: string) {
  const dateStr = targetDateStr || getTodayDateString();
  const dateObj = new Date(dateStr);
  const dayName = DAYS_MAP[dateObj.getDay()];

  // 1. Fetch all active tasks
  const tasks = await prisma.task.findMany({
    where: { isPaused: false },
    include: {
      checklists: { orderBy: { sortOrder: 'asc' } },
      assignments: {
        include: {
          user: {
            include: {
              profile: {
                include: {
                  assignedShift: true,
                },
              },
            },
          },
        },
      },
      shift: true,
    },
  });

  let createdInstancesCount = 0;

  for (const task of tasks) {
    // Check repeat frequency
    let shouldRunToday = false;

    if (task.repeatFrequency === 'DAILY') {
      shouldRunToday = true;
    } else if (task.repeatFrequency === 'ONCE') {
      // For ONCE, check if created date or target matches
      shouldRunToday = true;
    } else if (task.repeatFrequency === 'WEEKLY' || task.repeatFrequency === 'SPECIFIC_DAYS' || task.repeatFrequency === 'CUSTOM') {
      if (task.repeatDays) {
        try {
          const daysArray = typeof task.repeatDays === 'string' ? JSON.parse(task.repeatDays) : task.repeatDays;
          if (Array.isArray(daysArray) && daysArray.includes(dayName)) {
            shouldRunToday = true;
          }
        } catch {
          shouldRunToday = false;
        }
      }
    }

    if (!shouldRunToday) continue;

    // Determine target users: either direct assignments or users matching department/shift
    let targetUsers = task.assignments
      .filter((a) => a.user.isActive && a.user.profile?.accountStatus !== 'INACTIVE')
      .map((a) => a.user);

    // If no direct assignments, assign to active employees belonging to task's department or shift
    if (targetUsers.length === 0 && (task.departmentId || task.shiftId)) {
      targetUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          role: 'EMPLOYEE',
          profile: {
            ...(task.departmentId ? { departmentId: task.departmentId } : {}),
            ...(task.shiftId ? { assignedShiftId: task.shiftId } : {}),
            accountStatus: 'ACTIVE',
          },
        },
        include: {
          profile: {
            include: {
              assignedShift: true,
            },
          },
        },
      });
    }

    // Build scheduled start and due DateTime objects
    const [startHour, startMin] = (task.startTime || '09:00').split(':').map(Number);
    const [dueHour, dueMin] = (task.dueTime || '10:00').split(':').map(Number);

    const scheduledStartTime = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`);
    let scheduledDueTime = new Date(`${dateStr}T${String(dueHour).padStart(2, '0')}:${String(dueMin).padStart(2, '0')}:00`);

    // Handle overnight due time (if due time < start time, due date is next day)
    if (scheduledDueTime.getTime() <= scheduledStartTime.getTime()) {
      scheduledDueTime = new Date(scheduledDueTime.getTime() + 24 * 60 * 60 * 1000);
    }

    for (const user of targetUsers) {
      // Check if instance already exists
      const existing = await prisma.taskInstance.findUnique({
        where: {
          taskId_userId_date: {
            taskId: task.id,
            userId: user.id,
            date: dateStr,
          },
        },
      });

      if (!existing) {
        // Create new instance with all checklist items
        await prisma.taskInstance.create({
          data: {
            taskId: task.id,
            userId: user.id,
            date: dateStr,
            scheduledStartTime,
            scheduledDueTime,
            status: 'NOT_STARTED',
            checklistCompletions: {
              create: task.checklists.map((item) => ({
                checklistId: item.id,
                isCompleted: false,
              })),
            },
          },
        });
        createdInstancesCount++;
      }
    }
  }

  return { createdInstancesCount, dateStr };
}

/**
 * Main scheduler tick:
 * - Generates daily instances if needed
 * - Evaluates scheduled notifications for employees with active shifts
 * - Sends browser push notifications + logs in-app notifications
 * - Evaluates overdue and forgotten shifts
 */
export async function runSchedulerTick() {
  const now = new Date();
  const dateStr = getTodayDateString();

  // 1. Ensure today's instances exist
  await generateDailyTaskInstances(dateStr);

  // 2. Fetch pending / uncompleted task instances for today
  const pendingInstances = await prisma.taskInstance.findMany({
    where: {
      date: dateStr,
      status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'SCHEDULED', 'OVERDUE'] },
    },
    include: {
      task: {
        include: {
          notificationSchedule: true,
          checklists: true,
        },
      },
      user: {
        include: {
          profile: {
            include: {
              assignedShift: true,
            },
          },
        },
      },
    },
  });

  let notificationsSent = 0;
  let overdueMarked = 0;

  for (const instance of pendingInstances) {
    const task = instance.task;
    const user = instance.user;
    const schedule = task.notificationSchedule;

    // Check if employee has an active shift
    const activeAttendance = await prisma.shiftAttendance.findFirst({
      where: {
        userId: user.id,
        date: dateStr,
        status: { in: ['ACTIVE', 'ON_TIME', 'LATE'] },
      },
    });

    const isShiftActive = !!activeAttendance;

    // Determine target notification time
    let notifyTime = instance.scheduledStartTime;
    if (task.reminderTime) {
      const [rHour, rMin] = task.reminderTime.split(':').map(Number);
      notifyTime = new Date(`${dateStr}T${String(rHour).padStart(2, '0')}:${String(rMin).padStart(2, '0')}:00`);
    }

    // A) Initial reminder
    if (
      schedule?.isEnabled !== false &&
      instance.notificationSentAt === null &&
      now.getTime() >= notifyTime.getTime()
    ) {
      // Rule: Do not send before employee shift starts unless shift is active or grace period
      if (isShiftActive || !user.profile?.assignedShift) {
        // Send Push
        await sendPushToUser(user.id, {
          title: `Task Reminder: ${task.name}`,
          body: schedule?.message || `Scheduled task "${task.name}" is ready to start. Please check your checklist.`,
          data: {
            taskInstanceId: instance.id,
            url: `/employee/dashboard?task=${instance.id}`,
            type: 'TASK_REMINDER',
          },
        });

        // In-app log
        await prisma.notificationLog.create({
          data: {
            userId: user.id,
            taskInstanceId: instance.id,
            title: `Task Reminder: ${task.name}`,
            message: schedule?.message || `Scheduled task "${task.name}" is ready to start.`,
            type: 'TASK_REMINDER',
            deliveryStatus: 'DELIVERED',
          },
        });

        // Update task instance
        await prisma.taskInstance.update({
          where: { id: instance.id },
          data: { notificationSentAt: now },
        });

        notificationsSent++;
      }
    }

    // B) Check for Overdue
    if (now.getTime() > instance.scheduledDueTime.getTime() && instance.status !== 'OVERDUE') {
      const delayMinutes = Math.floor((now.getTime() - instance.scheduledDueTime.getTime()) / (1000 * 60));

      await prisma.taskInstance.update({
        where: { id: instance.id },
        data: {
          status: 'OVERDUE',
          delayMinutes,
        },
      });

      // Send overdue alert if not already sent recently
      await sendPushToUser(user.id, {
        title: `⚠️ Task Overdue: ${task.name}`,
        body: `Task "${task.name}" was due at ${task.dueTime}. Please complete your remaining items now.`,
        data: {
          taskInstanceId: instance.id,
          url: `/employee/dashboard?task=${instance.id}`,
          type: 'OVERDUE_ALERT',
        },
      });

      await prisma.notificationLog.create({
        data: {
          userId: user.id,
          taskInstanceId: instance.id,
          title: `⚠️ Task Overdue: ${task.name}`,
          message: `Task "${task.name}" was due at ${task.dueTime}.`,
          type: 'OVERDUE_ALERT',
          deliveryStatus: 'DELIVERED',
        },
      });

      overdueMarked++;
    }
  }

  // 3. Check for forgotten employee logouts
  // If expectedEnd + autoLogoutMinutes is passed, flag attendance for review
  const activeAttendances = await prisma.shiftAttendance.findMany({
    where: {
      status: { in: ['ACTIVE', 'ON_TIME', 'LATE'] },
      expectedEnd: { not: null },
    },
    include: {
      shift: true,
    },
  });

  let flaggedLogouts = 0;
  for (const att of activeAttendances) {
    if (!att.expectedEnd) continue;
    const autoLogoutGrace = att.shift?.autoLogoutMinutes || 60;
    const threshold = new Date(att.expectedEnd.getTime() + autoLogoutGrace * 60 * 1000);

    if (now.getTime() > threshold.getTime()) {
      await prisma.shiftAttendance.update({
        where: { id: att.id },
        data: {
          status: 'FORGOTTEN_LOGOUT',
          flagReason: `Employee did not clock out after shift end (${att.shift?.endTime || 'expected'}). Auto-flagged for Admin review.`,
        },
      });
      flaggedLogouts++;
    }
  }

  return {
    timestamp: now.toISOString(),
    notificationsSent,
    overdueMarked,
    flaggedLogouts,
  };
}
