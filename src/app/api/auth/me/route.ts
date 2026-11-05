import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }

  // Fetch full details including assignedShift and company settings
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      profile: {
        include: {
          department: true,
          assignedShift: true,
        },
      },
    },
  });

  const settings = await prisma.companySetting.findMany();
  const settingsMap: Record<string, any> = {};
  for (const s of settings) {
    try {
      settingsMap[s.key] = JSON.parse(s.value);
    } catch {
      settingsMap[s.key] = s.value;
    }
  }

  return NextResponse.json({
    success: true,
    user: {
      ...user,
      phone: fullUser?.profile?.phone,
      weeklyWorkingDays: fullUser?.profile?.weeklyWorkingDays
        ? JSON.parse(fullUser.profile.weeklyWorkingDays)
        : null,
      workingHours: fullUser?.profile?.workingHours
        ? JSON.parse(fullUser.profile.workingHours)
        : null,
      assignedShift: fullUser?.profile?.assignedShift,
    },
    settings: settingsMap,
  });
}

