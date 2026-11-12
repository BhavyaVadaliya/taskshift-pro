import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getTodayDateString } from '@/lib/utils';
import { generateDailyTaskInstances } from '@/lib/scheduler';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const { searchParams } = new URL(req.url);
  const filterDate = searchParams.get('date') || getTodayDateString();
  const filterDepartment = searchParams.get('department') || '';
  const filterShift = searchParams.get('shift') || '';
  const filterEmployee = searchParams.get('employee') || '';
  const filterStatus = searchParams.get('status') || '';

  // Make sure today's instances exist
  await generateDailyTaskInstances(filterDate);

  // 1. Fetch all employees
  const employees = await prisma.user.findMany({
    where: {
      role: 'EMPLOYEE',
      ...(filterEmployee ? { id: filterEmployee } : {}),
      profile: {
        ...(filterDepartment ? { departmentId: filterDepartment } : {}),
        ...(filterShift ? { assignedShiftId: filterShift } : {}),
      },
    },
    include: {
      profile: {
        include: {
          department: true,
          assignedShift: true,
        },
      },
      activityLogs: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
    },
  });

  const employeeIds = employees.map((e) => e.id);

  // 2. Fetch Attendances for the selected date
  const attendances = await prisma.shiftAttendance.findMany({
    where: {
      date: filterDate,
      userId: { in: employeeIds },
    },
    include: {
      shift: true,
      breaks: true,
    },
  });

  const attendanceMap = new Map(attendances.map((a) => [a.userId, a]));

  // 3. Fetch Task Instances for the selected date
  const taskInstances = await prisma.taskInstance.findMany({
    where: {
      date: filterDate,
      userId: { in: employeeIds },
      ...(filterStatus ? { status: filterStatus as any } : {}),
    },
    include: {
      task: {
        include: { department: true },
      },
      checklistCompletions: true,
    },
  });

  // Calculate Overview Metrics
  const totalEmployeesCount = employees.length;
  const now = new Date();
  const currentMs = now.getTime();

  let employeesWorkingCount = 0;
  let employeesOnBreakCount = 0;
  let employeesCompletedShiftCount = 0;
  let employeesNotStartedCount = 0;
  let employeesIdleCount = 0;

  for (const emp of employees) {
    const att = attendanceMap.get(emp.id);
    if (!att) {
      employeesNotStartedCount++;
    } else if (att.actualEnd) {
      employeesCompletedShiftCount++;
    } else {
      const activeBreak = att.breaks.find((b) => b.endTime === null);
      if (activeBreak) {
        employeesOnBreakCount++;
      } else {
        employeesWorkingCount++;
      }

      // Check mouse activity
      const lastActive = emp.profile?.lastActiveAt ? new Date(emp.profile.lastActiveAt) : null;
      let idleMins = 0;
      if (lastActive) {
        idleMins = Math.max(0, Math.floor((currentMs - lastActive.getTime()) / 60000));
      } else if (att.actualStart) {
        idleMins = Math.max(0, Math.floor((currentMs - new Date(att.actualStart).getTime()) / 60000));
      }
      if (idleMins >= 15 || emp.profile?.isIdle) {
        employeesIdleCount++;
      }
    }
  }

  const completedTasksToday = taskInstances.filter(
    (t) => t.status === 'COMPLETED' || t.status === 'COMPLETED_LATE'
  ).length;

  const onTimeTasks = taskInstances.filter((t) => t.status === 'COMPLETED').length;
  const lateTasks = taskInstances.filter((t) => t.status === 'COMPLETED_LATE').length;
  const pendingTasks = taskInstances.filter(
    (t) => t.status === 'NOT_STARTED' || t.status === 'IN_PROGRESS' || t.status === 'SCHEDULED'
  ).length;
  const overdueTasks = taskInstances.filter((t) => t.status === 'OVERDUE').length;
  const missedTasks = taskInstances.filter((t) => t.status === 'MISSED').length;

  // Build Live Employee Activity section rows
  const liveActivity = employees.map((emp) => {
    const att = attendanceMap.get(emp.id);
    const empTasks = taskInstances.filter((t) => t.userId === emp.id);

    const empCompleted = empTasks.filter(
      (t) => t.status === 'COMPLETED' || t.status === 'COMPLETED_LATE'
    ).length;
    const empPending = empTasks.filter(
      (t) => t.status === 'NOT_STARTED' || t.status === 'IN_PROGRESS' || t.status === 'OVERDUE'
    ).length;

    let currentStatus = 'Not Started';
    let shiftDurationMins = 0;

    if (att) {
      if (att.actualEnd) {
        currentStatus = 'Shift Ended';
        shiftDurationMins = att.totalDurationMinutes;
      } else if (att.status === 'FORGOTTEN_LOGOUT') {
        currentStatus = 'Forgotten Logout';
      } else {
        const activeBreak = att.breaks.find((b) => b.endTime === null);
        if (activeBreak) {
          currentStatus = 'On Break';
        } else if (att.isLate) {
          currentStatus = 'Working (Late In)';
        } else {
          currentStatus = 'Working';
        }

        const now = new Date();
        const gross = Math.max(0, Math.round((now.getTime() - att.actualStart.getTime()) / (60 * 1000)));
        shiftDurationMins = Math.max(0, gross - att.breakMinutes);
      }
    }

    const isShiftActive = Boolean(att && !att.actualEnd);
    const lastActive = emp.profile?.lastActiveAt ? new Date(emp.profile.lastActiveAt) : null;
    let idleMinutes = 0;
    if (lastActive) {
      idleMinutes = Math.max(0, Math.floor((currentMs - lastActive.getTime()) / 60000));
    } else if (att?.actualStart) {
      idleMinutes = Math.max(0, Math.floor((currentMs - new Date(att.actualStart).getTime()) / 60000));
    }
    const isIdle = isShiftActive && (idleMinutes >= 15 || Boolean(emp.profile?.isIdle));
    const mouseStatus = !isShiftActive ? 'OFFLINE' : isIdle ? 'IDLE_15M' : 'ACTIVE';
    const mouseStatusLabel = !isShiftActive
      ? 'Shift Inactive ⚪'
      : isIdle
      ? `⚠️ Inactive ${idleMinutes}m (No Mouse)`
      : `🟢 Active (${idleMinutes === 0 ? 'Just now' : `${idleMinutes}m ago`})`;

    return {
      userId: emp.id,
      employeeName: emp.profile?.fullName || 'Employee',
      employeeId: emp.employeeId,
      department: emp.profile?.department?.name || 'Unassigned',
      shiftName: emp.profile?.assignedShift?.name || 'Standard',
      shiftStartTime: emp.profile?.assignedShift?.startTime || '--:--',
      expectedShiftEnd: emp.profile?.assignedShift?.endTime || '--:--',
      actualShiftStart: att ? att.actualStart.toISOString() : null,
      actualShiftEnd: att?.actualEnd ? att.actualEnd.toISOString() : null,
      currentStatus,
      completedTasks: empCompleted,
      pendingTasks: empPending,
      totalAssignedTasks: empTasks.length,
      lastActivity: emp.activityLogs[0]
        ? {
            action: emp.activityLogs[0].action,
            timestamp: emp.activityLogs[0].timestamp.toISOString(),
          }
        : null,
      shiftDurationMins,
      isLate: att?.isLate || false,
      lateMinutes: att?.lateMinutes || 0,
      // Mouse activity metrics
      isShiftActive,
      lastActiveAt: emp.profile?.lastActiveAt || null,
      isIdle,
      idleMinutes,
      mouseStatus,
      mouseStatusLabel,
    };
  });

  // Chart 1: Daily Task Completion (last 7 days)
  const last7Days: any[] = [];
  const curr = new Date(filterDate);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(curr.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString([], { weekday: 'short' });

    // Count completions for this day
    const dayInstances = await prisma.taskInstance.findMany({
      where: { date: dayStr },
      select: { status: true },
    });

    last7Days.push({
      date: dayStr,
      day: dayName,
      completed: dayInstances.filter((t) => t.status === 'COMPLETED' || t.status === 'COMPLETED_LATE').length,
      overdue: dayInstances.filter((t) => t.status === 'OVERDUE').length,
      missed: dayInstances.filter((t) => t.status === 'MISSED').length,
      total: dayInstances.length,
    });
  }

  // Chart 2: Employee-wise Performance Top 5
  const employeePerformance = liveActivity
    .map((e) => ({
      name: e.employeeName,
      completed: e.completedTasks,
      pending: e.pendingTasks,
      total: e.totalAssignedTasks,
      completionRate: e.totalAssignedTasks > 0 ? Math.round((e.completedTasks / e.totalAssignedTasks) * 100) : 0,
    }))
    .slice(0, 7);

  // Departments list and Shifts list for filter dropdowns
  const departments = await prisma.department.findMany({ select: { id: true, name: true } });
  const shifts = await prisma.shift.findMany({ select: { id: true, name: true } });

  // Inactivity audit logs for selected date
  const startOfDay = new Date(`${filterDate}T00:00:00.000Z`);
  const endOfDay = new Date(`${filterDate}T23:59:59.999Z`);
  const mouseInactivityLogs = await prisma.employeeActivityLog.findMany({
    where: {
      action: { in: ['MOUSE_INACTIVE_15M', 'MOUSE_ACTIVITY_RESUMED'] },
      timestamp: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      user: { include: { profile: true } },
    },
    orderBy: { timestamp: 'desc' },
    take: 40,
  });

  const parsedInactivityLogs = mouseInactivityLogs.map((log) => {
    let details: any = {};
    try {
      details = typeof log.details === 'string' ? JSON.parse(log.details) : (log.details as any || {});
    } catch {
      details = {};
    }
    return {
      id: log.id,
      employeeName: log.user?.profile?.fullName || 'Employee',
      employeeId: log.user?.employeeId || '',
      action: log.action,
      actionLabel:
        log.action === 'MOUSE_INACTIVE_15M'
          ? '15m+ Inactivity (No Mouse Movement)'
          : 'Mouse Activity Resumed',
      timestamp: log.timestamp.toISOString(),
      timeFormatted: new Date(log.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      idleMinutes: details.idleMinutes || details.totalIdleMinutes || 15,
      notes: details.notes || '',
    };
  });

  return NextResponse.json({
    success: true,
    metrics: {
      totalEmployees: totalEmployeesCount,
      employeesWorking: employeesWorkingCount,
      employeesNotStarted: employeesNotStartedCount,
      employeesOnBreak: employeesOnBreakCount,
      employeesCompletedShift: employeesCompletedShiftCount,
      employeesIdle15mCount: employeesIdleCount,
      completedTasksToday,
      pendingTasks,
      overdueTasks,
      missedTasks,
      onTimeTasks,
      lateTasks,
    },
    charts: {
      dailyCompletion: last7Days,
      employeePerformance,
      taskStatusBreakdown: [
        { name: 'Completed On-Time', value: onTimeTasks, color: '#10b981' },
        { name: 'Completed Late', value: lateTasks, color: '#f59e0b' },
        { name: 'Pending / Active', value: pendingTasks, color: '#3b82f6' },
        { name: 'Overdue', value: overdueTasks, color: '#ef4444' },
        { name: 'Missed', value: missedTasks, color: '#6b7280' },
      ],
      shiftAttendanceStats: [
        { name: 'Working On-Time', value: employeesWorkingCount, color: '#10b981' },
        { name: 'On Break', value: employeesOnBreakCount, color: '#3b82f6' },
        { name: 'Completed Shift', value: employeesCompletedShiftCount, color: '#6366f1' },
        { name: 'Not Started', value: employeesNotStartedCount, color: '#9ca3af' },
      ],
    },
    liveActivity,
    inactivityLogs: parsedInactivityLogs,
    filters: {
      departments,
      shifts,
      current: {
        date: filterDate,
        department: filterDepartment,
        shift: filterShift,
        employee: filterEmployee,
        status: filterStatus,
      },
    },
  });
}

