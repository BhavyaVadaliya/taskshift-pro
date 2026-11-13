import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getTodayDateString, formatDurationMinutes } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const now = new Date();
  const currentMs = now.getTime();
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date') || getTodayDateString();

  // 1. Fetch all employees with profile and today's attendance
  const employees = await prisma.user.findMany({
    where: {
      role: 'EMPLOYEE',
      isActive: true,
      profile: { accountStatus: 'ACTIVE' },
    },
    include: {
      profile: {
        include: {
          department: true,
          assignedShift: true,
        },
      },
      attendances: {
        where: { date: dateStr },
        include: { breaks: true },
        take: 1,
      },
    },
    orderBy: { profile: { fullName: 'asc' } },
  });

  let activeWorkingCount = 0;
  let idleCount = 0;
  let clockedInCount = 0;
  let onBreakCount = 0;

  const employeeStatuses = employees.map((emp) => {
    const attendance = emp.attendances?.[0];
    const isShiftActive = Boolean(attendance?.actualStart && !attendance?.actualEnd);
    if (isShiftActive) clockedInCount++;

    const activeBreak = attendance?.breaks?.find((b) => b.endTime === null) || null;
    const isOnBreak = Boolean(isShiftActive && activeBreak);
    if (isOnBreak) onBreakCount++;

    const lastActive = emp.profile?.lastActiveAt ? new Date(emp.profile.lastActiveAt) : null;
    let idleMinutes = 0;
    let isIdle = false;

    if (lastActive) {
      idleMinutes = Math.max(0, Math.floor((currentMs - lastActive.getTime()) / 60000));
    } else if (attendance?.actualStart) {
      // Clocked in but no mouse pulse received yet
      const startMs = new Date(attendance.actualStart).getTime();
      idleMinutes = Math.max(0, Math.floor((currentMs - startMs) / 60000));
    }

    if (isShiftActive) {
      if (isOnBreak) {
        // User is on authorized break, do not flag as negative idle
        isIdle = false;
      } else if (idleMinutes >= 15 || emp.profile?.isIdle) {
        isIdle = true;
        idleCount++;
      } else {
        activeWorkingCount++;
      }
    }

    let statusType: 'ACTIVE' | 'IDLE_15M' | 'OFFLINE' | 'ON_BREAK' = 'OFFLINE';
    let statusLabel = 'Shift Inactive ⚪';

    if (!isShiftActive) {
      statusType = 'OFFLINE';
      statusLabel = 'Shift Inactive ⚪';
    } else if (isOnBreak) {
      statusType = 'ON_BREAK';
      statusLabel = `⏸️ On Break (${activeBreak?.reason || 'Break'})`;
    } else if (isIdle) {
      statusType = 'IDLE_15M';
      statusLabel = `⚠️ Inactive ${idleMinutes}m (No Mouse Activity)`;
    } else {
      statusType = 'ACTIVE';
      statusLabel = `🟢 Active (${idleMinutes === 0 ? 'Just now' : `${idleMinutes}m ago`})`;
    }

    return {
      userId: emp.id,
      fullName: emp.profile?.fullName || 'Employee',
      employeeId: emp.employeeId,
      email: emp.email,
      departmentName: emp.profile?.department?.name || 'Technical Support',
      designation: emp.profile?.designation || 'Staff',
      shiftName: emp.profile?.assignedShift?.name || 'Morning Shift',
      isShiftActive,
      isOnBreak,
      breakReason: activeBreak?.reason || null,
      breakStartTime: activeBreak?.startTime ? activeBreak.startTime.toISOString() : null,
      lastActiveAt: emp.profile?.lastActiveAt || null,
      idleSince: emp.profile?.idleSince || null,
      idleMinutes,
      isIdle,
      statusType,
      statusLabel,
      shiftStart: attendance?.actualStart || null,
    };
  });

  // 2. Fetch all 15m+ inactivity logs for the specified date
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  const activityLogs = await prisma.employeeActivityLog.findMany({
    where: {
      action: { in: ['MOUSE_INACTIVE_15M', 'MOUSE_ACTIVITY_RESUMED'] },
      timestamp: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      user: {
        include: { profile: true },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  const parsedInactivityLogs = activityLogs.map((log) => {
    let details: any = {};
    try {
      details = typeof log.details === 'string' ? JSON.parse(log.details) : (log.details as any || {});
    } catch {
      details = {};
    }

    return {
      id: log.id,
      userId: log.userId,
      employeeName: log.user?.profile?.fullName || 'Employee',
      employeeId: log.user?.employeeId || '',
      action: log.action,
      actionLabel:
        log.action === 'MOUSE_INACTIVE_15M'
          ? '15m+ Inactivity Detected (No Mouse Movement)'
          : 'Mouse Activity Resumed',
      timestamp: log.timestamp.toISOString(),
      timeFormatted: new Date(log.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      idleMinutes: details.idleMinutes || details.totalIdleMinutes || 15,
      notes: details.notes || (log.action === 'MOUSE_INACTIVE_15M' ? 'No mouse activity for 15+ minutes' : 'Resumed work'),
    };
  });

  return NextResponse.json({
    success: true,
    date: dateStr,
    summary: {
      totalEmployees: employees.length,
      clockedInCount,
      activeWorkingCount,
      onBreakCount,
      idleCount, // Employees idle for 15+ mins right now
    },
    employees: employeeStatuses,
    inactivityLogs: parsedInactivityLogs,
  });
}

