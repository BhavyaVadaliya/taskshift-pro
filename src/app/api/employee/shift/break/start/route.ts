import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logEmployeeActivity } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const now = new Date();
  const { reason } = await req.json().catch(() => ({ reason: 'Standard Break' }));

  const attendance = await prisma.shiftAttendance.findFirst({
    where: {
      userId: auth.user.id,
      actualEnd: null,
      status: { in: ['ACTIVE', 'ON_TIME', 'LATE'] as any },
    },
    include: { breaks: true },
  });

  if (!attendance) {
    return NextResponse.json({ success: false, error: 'No active shift found.' }, { status: 400 });
  }

  // Check if break already open
  const openBreak = attendance.breaks.find((b) => b.endTime === null);
  if (openBreak) {
    return NextResponse.json({ success: false, error: 'A break is already active.' }, { status: 400 });
  }

  const shiftBreak = await prisma.shiftBreak.create({
    data: {
      attendanceId: attendance.id,
      startTime: now,
      reason: reason || 'Break',
    },
  });

  await logEmployeeActivity({
    userId: auth.user.id,
    action: 'BREAK_STARTED',
    details: { reason: reason || 'Break' },
    req,
  });

  return NextResponse.json({
    success: true,
    message: 'Break started.',
    shiftBreak,
  });
}

