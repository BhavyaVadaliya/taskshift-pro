import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logEmployeeActivity } from '@/lib/logger';
import { getTodayDateString } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const now = new Date();
  const userId = auth.user.id;
  const todayStr = getTodayDateString();

  try {
    const body = await req.json();
    const eventType = body.eventType || body.action || 'MOUSE_PULSE';
    const isIdle = Boolean(body.isIdle ?? (eventType === 'MOUSE_INACTIVE_15M'));
    const idleDurationMinutes = body.idleDurationMinutes || body.idleMinutes || 0;

    // Fetch user profile and today's attendance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        attendances: {
          where: { date: todayStr },
          include: { breaks: true },
          take: 1,
        },
      },
    });

    if (!user || !user.profile) {
      return NextResponse.json({ success: false, error: 'User profile not found.' }, { status: 404 });
    }

    const attendance = user.attendances?.[0];
    const isShiftActive = Boolean(attendance?.actualStart && !attendance?.actualEnd);
    const activeBreak = attendance?.breaks?.find((b) => b.endTime === null) || null;

    // Case 1: Inactivity detected (15+ min of no mouse activity)
    if (eventType === 'MOUSE_INACTIVE_15M' || (isIdle && !user.profile.isIdle)) {
      // If user is currently on an authorized break, do not log a negative inactivity alert
      if (activeBreak) {
        return NextResponse.json({
          success: true,
          message: `User is on authorized break (${activeBreak.reason || 'Break'}), inactivity ignored.`,
          isOnBreak: true,
        });
      }

      const idleStartedAt = user.profile.lastActiveAt || new Date(now.getTime() - 15 * 60 * 1000);

      await prisma.employeeProfile.update({
        where: { userId },
        data: {
          isIdle: true,
          idleSince: idleStartedAt,
        },
      });

      // Log in EmployeeActivityLog
      await logEmployeeActivity({
        userId,
        action: 'MOUSE_INACTIVE_15M',
        details: {
          idleMinutes: idleDurationMinutes || 15,
          idleStartedAt: idleStartedAt.toISOString(),
          detectedAt: now.toISOString(),
          isShiftActive,
          notes: 'No mouse or keyboard interaction detected for 15+ minutes during shift.',
        },
        req,
      });

      return NextResponse.json({
        success: true,
        message: 'Inactivity logged (15m+ no mouse activity)',
        isIdle: true,
        idleSince: idleStartedAt.toISOString(),
      });
    }

    // Case 2: User resumed activity after being idle
    if (eventType === 'MOUSE_RESUMED' || (!isIdle && user.profile.isIdle)) {
      const idleSince = user.profile.idleSince ? new Date(user.profile.idleSince) : new Date(now.getTime() - 15 * 60 * 1000);
      const totalIdleMinutes = Math.max(15, Math.round((now.getTime() - idleSince.getTime()) / 60000));

      await prisma.employeeProfile.update({
        where: { userId },
        data: {
          isIdle: false,
          idleSince: null,
          lastActiveAt: now,
        },
      });

      // Log the resume event
      await logEmployeeActivity({
        userId,
        action: 'MOUSE_ACTIVITY_RESUMED',
        details: {
          resumedAt: now.toISOString(),
          idleStartedAt: idleSince.toISOString(),
          totalIdleMinutes,
          isShiftActive,
          notes: `User resumed work after ${totalIdleMinutes} minutes of inactivity.`,
        },
        req,
      });

      return NextResponse.json({
        success: true,
        message: 'Mouse activity resumed',
        isIdle: false,
        totalIdleMinutes,
        lastActiveAt: now.toISOString(),
      });
    }

    // Case 3: Normal active pulse / mouse movement
    await prisma.employeeProfile.update({
      where: { userId },
      data: {
        lastActiveAt: now,
        isIdle: false,
        idleSince: null,
      },
    });

    return NextResponse.json({
      success: true,
      lastActiveAt: now.toISOString(),
      isIdle: false,
    });
  } catch (err: any) {
    console.error('Heartbeat error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
