import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getTodayDateString } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const dateStr = getTodayDateString();

  // Find user's profile and assigned shift
  const profile = await prisma.employeeProfile.findUnique({
    where: { userId: auth.user.id },
    include: { assignedShift: true },
  });

  // Find today's attendance record (or active attendance from overnight shift)
  const attendance = await prisma.shiftAttendance.findFirst({
    where: {
      userId: auth.user.id,
      OR: [
        { date: dateStr },
        { status: 'ACTIVE' as any },
        { status: 'ON_TIME' as any },
        { status: 'LATE' as any },
      ],
    },
    include: {
      shift: true,
      breaks: {
        orderBy: { startTime: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const activeBreak = attendance?.breaks.find((b) => b.endTime === null) || null;

  return NextResponse.json({
    success: true,
    assignedShift: profile?.assignedShift || null,
    attendance: attendance || null,
    activeBreak: activeBreak || null,
    isShiftActive:
      attendance &&
      (attendance.status === 'ACTIVE' || attendance.status === 'ON_TIME' || attendance.status === 'LATE') &&
      !attendance.actualEnd,
  });
}

