import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logEmployeeActivity } from '@/lib/logger';
import { getTodayDateString } from '@/lib/utils';
import { generateDailyTaskInstances } from '@/lib/scheduler';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const now = new Date();
  const dateStr = getTodayDateString();

  // 1. Prevent multiple active shifts!
  const activeAttendance = await prisma.shiftAttendance.findFirst({
    where: {
      userId: auth.user.id,
      actualEnd: null,
      status: { in: ['ACTIVE', 'ON_TIME', 'LATE'] },
    },
  });

  if (activeAttendance) {
    return NextResponse.json(
      { success: false, error: 'You already have an active shift in progress. End current shift first.' },
      { status: 400 }
    );
  }

  // 2. Fetch employee profile and assigned shift
  const profile = await prisma.employeeProfile.findUnique({
    where: { userId: auth.user.id },
    include: { assignedShift: true },
  });

  const shift = profile?.assignedShift;

  // Calculate expectedEnd and late status
  let expectedEnd: Date | null = null;
  let isLate = false;
  let lateMinutes = 0;
  let status = 'ACTIVE';

  if (shift) {
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);

    const shiftStartToday = new Date(`${dateStr}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
    const graceThreshold = new Date(shiftStartToday.getTime() + (shift.gracePeriodMinutes || 15) * 60 * 1000);

    // If clocked in after grace period
    if (now.getTime() > graceThreshold.getTime()) {
      isLate = true;
      lateMinutes = Math.floor((now.getTime() - shiftStartToday.getTime()) / (60 * 1000));
      status = 'LATE';
    } else {
      status = 'ON_TIME';
    }

    // Expected end calculation
    expectedEnd = new Date(`${dateStr}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);
    if (shift.isOvernight || expectedEnd.getTime() <= shiftStartToday.getTime()) {
      expectedEnd = new Date(expectedEnd.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  // 3. Create attendance record using transaction
  const newAttendance = await prisma.$transaction(async (tx) => {
    const created = await tx.shiftAttendance.create({
      data: {
        userId: auth.user.id,
        shiftId: shift?.id || null,
        date: dateStr,
        actualStart: now,
        expectedEnd,
        status,
        isLate,
        lateMinutes,
        notes: isLate ? `Clocked in ${lateMinutes} minutes late (grace period: ${shift?.gracePeriodMinutes || 15}m)` : 'Clocked in on time',
      },
      include: {
        shift: true,
      },
    });
    return created;
  });

  // 4. Generate daily tasks if not generated already
  await generateDailyTaskInstances(dateStr);

  // 5. Activity log
  await logEmployeeActivity({
    userId: auth.user.id,
    action: 'SHIFT_STARTED',
    details: {
      shiftName: shift?.name || 'Default Shift',
      actualStart: now.toISOString(),
      isLate,
      lateMinutes,
    },
    req,
  });

  return NextResponse.json({
    success: true,
    message: isLate
      ? `Shift started at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Late by ${lateMinutes}m).`
      : `Shift started successfully at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
    attendance: newAttendance,
  });
}

