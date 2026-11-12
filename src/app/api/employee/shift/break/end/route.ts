import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logEmployeeActivity } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const now = new Date();

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

  const openBreak = attendance.breaks.find((b) => b.endTime === null);
  if (!openBreak) {
    return NextResponse.json({ success: false, error: 'No active break found to end.' }, { status: 400 });
  }

  const durationMinutes = Math.max(1, Math.round((now.getTime() - openBreak.startTime.getTime()) / (60 * 1000)));

  await prisma.shiftBreak.update({
    where: { id: openBreak.id },
    data: {
      endTime: now,
      durationMinutes,
    },
  });

  await prisma.shiftAttendance.update({
    where: { id: attendance.id },
    data: {
      breakMinutes: attendance.breakMinutes + durationMinutes,
    },
  });

  await logEmployeeActivity({
    userId: auth.user.id,
    action: 'BREAK_ENDED',
    details: { durationMinutes },
    req,
  });

  return NextResponse.json({
    success: true,
    message: `Break ended. Duration: ${durationMinutes} minutes.`,
  });
}

