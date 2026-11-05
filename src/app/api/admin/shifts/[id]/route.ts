import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/logger';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const data = await req.json();
    const existing = await prisma.shift.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Shift not found.' }, { status: 404 });
    }

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
      isActive,
    } = data;

    let autoOvernight = isOvernight;
    if (startTime && endTime && autoOvernight === undefined) {
      const [sH, sM] = startTime.split(':').map(Number);
      const [eH, eM] = endTime.split(':').map(Number);
      autoOvernight = eH < sH || (eH === sH && eM <= sM);
    }

    const updated = await prisma.shift.update({
      where: { id: params.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(startTime ? { startTime } : {}),
        ...(endTime ? { endTime } : {}),
        ...(breakDurationMinutes !== undefined ? { breakDurationMinutes: Number(breakDurationMinutes) } : {}),
        ...(gracePeriodMinutes !== undefined ? { gracePeriodMinutes: Number(gracePeriodMinutes) } : {}),
        ...(workingDays ? { workingDays: JSON.stringify(workingDays) } : {}),
        ...(earlyLoginMinutes !== undefined ? { earlyLoginMinutes: Number(earlyLoginMinutes) } : {}),
        ...(lateLoginRules !== undefined ? { lateLoginRules } : {}),
        ...(autoLogoutMinutes !== undefined ? { autoLogoutMinutes: Number(autoLogoutMinutes) } : {}),
        ...(autoOvernight !== undefined ? { isOvernight: Boolean(autoOvernight) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    await logAudit({
      userId: adminAuth.user.id,
      action: 'UPDATE_SHIFT',
      entity: 'Shift',
      entityId: params.id,
      oldValues: existing as any,
      newValues: updated as any,
      req,
    });

    return NextResponse.json({ success: true, shift: updated });
  } catch (error: any) {
    console.error('Update shift error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const existing = await prisma.shift.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { profiles: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Shift not found.' }, { status: 404 });
    }

    if (existing._count.profiles > 0) {
      // Deactivate instead of hard deleting to protect existing employee records
      await prisma.shift.update({
        where: { id: params.id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: 'Shift has assigned employees. It has been deactivated instead of deleted.',
      });
    }

    await prisma.shift.delete({ where: { id: params.id } });

    await logAudit({
      userId: adminAuth.user.id,
      action: 'DELETE_SHIFT',
      entity: 'Shift',
      entityId: params.id,
      req,
    });

    return NextResponse.json({ success: true, message: 'Shift deleted successfully.' });
  } catch (error: any) {
    console.error('Delete shift error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

