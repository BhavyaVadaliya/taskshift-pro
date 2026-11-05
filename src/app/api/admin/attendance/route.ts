import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/logger';
import { getTodayDateString } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || getTodayDateString();
  const departmentId = searchParams.get('departmentId');
  const shiftId = searchParams.get('shiftId');
  const employeeId = searchParams.get('employeeId');
  const status = searchParams.get('status');

  const attendances = await prisma.shiftAttendance.findMany({
    where: {
      ...(date ? { date } : {}),
      ...(employeeId ? { userId: employeeId } : {}),
      ...(shiftId ? { shiftId } : {}),
      ...(status ? { status } : {}),
      user: {
        profile: {
          ...(departmentId ? { departmentId } : {}),
        },
      },
    },
    include: {
      user: {
        include: {
          profile: {
            include: { department: true, assignedShift: true },
          },
        },
      },
      shift: true,
      breaks: true,
    },
    orderBy: { actualStart: 'desc' },
  });

  const formatted = attendances.map((att) => ({
    id: att.id,
    userId: att.userId,
    employeeName: att.user.profile?.fullName || 'Employee',
    employeeId: att.user.employeeId,
    departmentName: att.user.profile?.department?.name || 'Unassigned',
    shiftName: att.shift?.name || 'Standard Shift',
    date: att.date,
    actualStart: att.actualStart.toISOString(),
    actualEnd: att.actualEnd ? att.actualEnd.toISOString() : null,
    expectedEnd: att.expectedEnd ? att.expectedEnd.toISOString() : null,
    breakMinutes: att.breakMinutes,
    totalDurationMinutes: att.totalDurationMinutes,
    status: att.status,
    isLate: att.isLate,
    lateMinutes: att.lateMinutes,
    notes: att.notes,
    flagReason: att.flagReason,
    breaks: att.breaks,
  }));

  return NextResponse.json({ success: true, attendances: formatted });
}

export async function PUT(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const data = await req.json();
    const { attendanceId, actualStart, actualEnd, breakMinutes, status, notes, adminReason } = data;

    if (!attendanceId) {
      return NextResponse.json({ success: false, error: 'Attendance ID required.' }, { status: 400 });
    }

    const existing = await prisma.shiftAttendance.findUnique({
      where: { id: attendanceId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Attendance record not found.' }, { status: 404 });
    }

    const start = actualStart ? new Date(actualStart) : existing.actualStart;
    const end = actualEnd ? new Date(actualEnd) : existing.actualEnd;
    const breaks = breakMinutes !== undefined ? Number(breakMinutes) : existing.breakMinutes;

    let totalDuration = existing.totalDurationMinutes;
    if (end) {
      const gross = Math.max(0, Math.round((end.getTime() - start.getTime()) / (60 * 1000)));
      totalDuration = Math.max(0, gross - breaks);
    }

    const updated = await prisma.shiftAttendance.update({
      where: { id: attendanceId },
      data: {
        actualStart: start,
        actualEnd: end,
        breakMinutes: breaks,
        totalDurationMinutes: totalDuration,
        status: status || existing.status,
        notes: notes !== undefined ? notes : existing.notes,
        flagReason: null, // Clear flag once reviewed and corrected
      },
    });

    await logAudit({
      userId: adminAuth.user.id,
      action: 'OVERRIDE_ATTENDANCE',
      entity: 'ShiftAttendance',
      entityId: attendanceId,
      oldValues: existing as any,
      newValues: { ...updated, adminReason },
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Attendance record updated with administrative audit log.',
      attendance: updated,
    });
  } catch (error: any) {
    console.error('Update attendance error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
