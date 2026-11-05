import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const shifts = await prisma.shift.findMany({
    include: {
      _count: {
        select: {
          profiles: true,
          tasks: true,
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  const formatted = shifts.map((s) => ({
    ...s,
    workingDays: typeof s.workingDays === 'string' ? JSON.parse(s.workingDays) : s.workingDays,
    employeeCount: s._count.profiles,
    taskCount: s._count.tasks,
  }));

  return NextResponse.json({ success: true, shifts: formatted });
}

export async function POST(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const data = await req.json();
    const {
      name,
      startTime,
      endTime,
      breakDurationMinutes,
      gracePeriodMinutes,
      workingDays,
      earlyLoginMinutes,
      lateLoginRules,
      autoLogoutMinutes,
      isOvernight,
    } = data;

    if (!name || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Shift name, start time, and end time are required.' },
        { status: 400 }
      );
    }

    // Auto calculate if overnight if not explicitly set
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const autoOvernight = isOvernight !== undefined ? Boolean(isOvernight) : (eH < sH || (eH === sH && eM <= sM));

    const shift = await prisma.shift.create({
      data: {
        name: name.trim(),
        startTime,
        endTime,
        breakDurationMinutes: Number(breakDurationMinutes) || 60,
        gracePeriodMinutes: Number(gracePeriodMinutes) || 15,
        workingDays: JSON.stringify(workingDays || ['MON', 'TUE', 'WED', 'THU', 'FRI']),
        earlyLoginMinutes: Number(earlyLoginMinutes) || 30,
        lateLoginRules: lateLoginRules || 'Flag as late if clock in exceeds grace period',
        autoLogoutMinutes: Number(autoLogoutMinutes) || 60,
        isOvernight: autoOvernight,
        isActive: true,
      },
    });

    await logAudit({
      userId: adminAuth.user.id,
      action: 'CREATE_SHIFT',
      entity: 'Shift',
      entityId: shift.id,
      newValues: { name: shift.name, startTime, endTime, isOvernight: autoOvernight },
      req,
    });

    return NextResponse.json({ success: true, shift });
  } catch (error: any) {
    console.error('Create shift error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
