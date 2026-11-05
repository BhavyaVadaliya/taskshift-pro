import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logEmployeeActivity } from '@/lib/logger';
import { getTodayDateString } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const now = new Date();

  // Find active attendance
  const attendance = await prisma.shiftAttendance.findFirst({
    where: {
      userId: auth.user.id,
      actualEnd: null,
      status: { in: ['ACTIVE', 'ON_TIME', 'LATE'] },
    },
    include: {
      breaks: true,
      shift: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!attendance) {
    return NextResponse.json({ success: false, error: 'No active shift found to end.' }, { status: 400 });
  }

  // 1. Close any open break if still running
  let totalBreakMins = attendance.breakMinutes;
  for (const b of attendance.breaks) {
    if (b.endTime === null) {
      const bDuration = Math.max(1, Math.round((now.getTime() - b.startTime.getTime()) / (60 * 1000)));
      await prisma.shiftBreak.update({
        where: { id: b.id },
        data: { endTime: now, durationMinutes: bDuration },
      });
      totalBreakMins += bDuration;
    }
  }

  // 2. Calculate total gross and net working minutes
  const grossMinutes = Math.max(1, Math.round((now.getTime() - attendance.actualStart.getTime()) / (60 * 1000)));
  const netDurationMinutes = Math.max(0, grossMinutes - totalBreakMins);

  // 3. Check for any incomplete tasks for this employee today
  const pendingTasks = await prisma.taskInstance.findMany({
    where: {
      userId: auth.user.id,
      date: attendance.date,
      status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'OVERDUE'] },
    },
  });

  let remainingNotice = '';
  if (pendingTasks.length > 0) {
    // Mark unfinished tasks as MISSED upon shift departure
    await prisma.taskInstance.updateMany({
      where: {
        id: { in: pendingTasks.map((t) => t.id) },
      },
      data: {
        status: 'MISSED',
      },
    });
    remainingNotice = ` (${pendingTasks.length} unfinished tasks marked as MISSED)`;
  }

  // 4. Update attendance record
  const updated = await prisma.shiftAttendance.update({
    where: { id: attendance.id },
    data: {
      actualEnd: now,
      breakMinutes: totalBreakMins,
      totalDurationMinutes: netDurationMinutes,
      status: 'COMPLETED',
      notes: `${attendance.notes || ''} Clocked out at ${now.toLocaleTimeString()}.${remainingNotice}`.trim(),
    },
  });

  // 5. Activity log
  await logEmployeeActivity({
    userId: auth.user.id,
    action: 'SHIFT_ENDED',
    details: {
      durationMinutes: netDurationMinutes,
      breakMinutes: totalBreakMins,
      unfinishedTasksCount: pendingTasks.length,
    },
    req,
  });

  return NextResponse.json({
    success: true,
    message: `Shift ended successfully. Total duration: ${Math.floor(netDurationMinutes / 60)}h ${netDurationMinutes % 60}m.${remainingNotice}`,
    attendance: updated,
  });
}
