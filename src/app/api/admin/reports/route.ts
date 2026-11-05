import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getTodayDateString } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const { searchParams } = new URL(req.url);
  const timePreset = searchParams.get('preset') || 'thisMonth';
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const departmentId = searchParams.get('departmentId');
  const employeeId = searchParams.get('employeeId');
  const format = searchParams.get('format'); // 'csv' or json

  // Calculate date range
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  if (timePreset === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (timePreset === 'yesterday') {
    const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    startDate = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate());
    endDate = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59);
  } else if (timePreset === 'thisWeek') {
    const day = now.getDay() || 7;
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    endDate = new Date();
  } else if (timePreset === 'lastWeek') {
    const day = now.getDay() || 7;
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 6);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  } else if (timePreset === 'thisMonth') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date();
  } else if (timePreset === 'custom' && startDateParam && endDateParam) {
    startDate = new Date(`${startDateParam}T00:00:00`);
    endDate = new Date(`${endDateParam}T23:59:59`);
  } else {
    // Default 30 days
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    endDate = new Date();
  }

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  // 1. Fetch Employees matching filter
  const employees = await prisma.user.findMany({
    where: {
      role: 'EMPLOYEE',
      ...(employeeId ? { id: employeeId } : {}),
      profile: {
        ...(departmentId ? { departmentId } : {}),
      },
    },
    include: {
      profile: {
        include: { department: true, assignedShift: true },
      },
    },
  });

  const empIds = employees.map((e) => e.id);

  // 2. Fetch all attendances in range
  const attendances = await prisma.shiftAttendance.findMany({
    where: {
      userId: { in: empIds },
      date: { gte: startStr, lte: endStr },
    },
  });

  // 3. Fetch all task instances in range
  const taskInstances = await prisma.taskInstance.findMany({
    where: {
      userId: { in: empIds },
      date: { gte: startStr, lte: endStr },
    },
  });

  // 4. Calculate per-employee statistics
  const employeeReports = employees.map((emp) => {
    const empAttendances = attendances.filter((a) => a.userId === emp.id);
    const empTasks = taskInstances.filter((t) => t.userId === emp.id);

    const totalShifts = empAttendances.length;
    const totalWorkingMinutes = empAttendances.reduce((acc, curr) => acc + (curr.totalDurationMinutes || 0), 0);
    const totalWorkingHours = (totalWorkingMinutes / 60).toFixed(1);
    const avgShiftDurationMinutes = totalShifts > 0 ? Math.round(totalWorkingMinutes / totalShifts) : 0;

    const totalTasksAssigned = empTasks.length;
    const completedTasks = empTasks.filter((t) => t.status === 'COMPLETED').length;
    const completedLateTasks = empTasks.filter((t) => t.status === 'COMPLETED_LATE').length;
    const allCompleted = completedTasks + completedLateTasks;
    const pendingTasks = empTasks.filter(
      (t) => t.status === 'NOT_STARTED' || t.status === 'IN_PROGRESS' || t.status === 'SCHEDULED'
    ).length;
    const overdueTasks = empTasks.filter((t) => t.status === 'OVERDUE').length;
    const missedTasks = empTasks.filter((t) => t.status === 'MISSED').length;

    // Average completion time (minutes between scheduled start and completion)
    const completedWithTimestamps = empTasks.filter((t) => t.completedAt && t.startedAt);
    let avgCompletionMinutes = 0;
    if (completedWithTimestamps.length > 0) {
      const totalMinutes = completedWithTimestamps.reduce((acc, curr) => {
        const mins = Math.max(0, Math.round((curr.completedAt!.getTime() - curr.startedAt!.getTime()) / (60 * 1000)));
        return acc + mins;
      }, 0);
      avgCompletionMinutes = Math.round(totalMinutes / completedWithTimestamps.length);
    }

    const onTimeCompletionPercentage =
      totalTasksAssigned > 0 ? Math.round((completedTasks / totalTasksAssigned) * 100) : 0;

    return {
      userId: emp.id,
      employeeName: emp.profile?.fullName || 'Employee',
      employeeId: emp.employeeId,
      department: emp.profile?.department?.name || 'Unassigned',
      shiftName: emp.profile?.assignedShift?.name || 'Standard',
      totalShifts,
      totalWorkingHours: Number(totalWorkingHours),
      avgShiftDurationMinutes,
      totalTasksAssigned,
      completedTasks: allCompleted,
      completedOnTime: completedTasks,
      completedLate: completedLateTasks,
      pendingTasks,
      overdueTasks,
      missedTasks,
      avgCompletionMinutes,
      onTimeCompletionPercentage,
    };
  });

  // Overall totals
  const overall = {
    totalEmployees: employees.length,
    totalShiftsLogged: attendances.length,
    totalWorkingHours: (attendances.reduce((acc, a) => acc + (a.totalDurationMinutes || 0), 0) / 60).toFixed(1),
    totalTasksAssigned: taskInstances.length,
    totalTasksCompleted: taskInstances.filter((t) => t.status === 'COMPLETED' || t.status === 'COMPLETED_LATE').length,
    totalOverdue: taskInstances.filter((t) => t.status === 'OVERDUE').length,
    totalMissed: taskInstances.filter((t) => t.status === 'MISSED').length,
    overallOnTimePercentage:
      taskInstances.length > 0
        ? Math.round(
            (taskInstances.filter((t) => t.status === 'COMPLETED').length / taskInstances.length) * 100
          )
        : 0,
  };

  // CSV export generator if requested
  if (format === 'csv') {
    const headers = [
      'Employee Name',
      'Employee ID',
      'Department',
      'Assigned Shift',
      'Total Shifts',
      'Total Working Hours',
      'Avg Shift Mins',
      'Assigned Tasks',
      'Completed Tasks',
      'Completed On-Time',
      'Completed Late',
      'Pending Tasks',
      'Overdue Tasks',
      'Missed Tasks',
      'On-Time %',
    ];

    const rows = employeeReports.map((r) => [
      `"${r.employeeName}"`,
      `"${r.employeeId}"`,
      `"${r.department}"`,
      `"${r.shiftName}"`,
      r.totalShifts,
      r.totalWorkingHours,
      r.avgShiftDurationMinutes,
      r.totalTasksAssigned,
      r.completedTasks,
      r.completedOnTime,
      r.completedLate,
      r.pendingTasks,
      r.overdueTasks,
      r.missedTasks,
      `${r.onTimeCompletionPercentage}%`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="employee_report_${startStr}_to_${endStr}.csv"`,
      },
    });
  }

  return NextResponse.json({
    success: true,
    range: { startDate: startStr, endDate: endStr, preset: timePreset },
    overall,
    employeeReports,
  });
}

