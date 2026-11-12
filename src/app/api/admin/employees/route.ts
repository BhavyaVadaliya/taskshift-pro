import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/logger';
import { getTodayDateString } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const now = new Date();
  const currentMs = now.getTime();
  const todayStr = getTodayDateString();

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');
  const shiftId = searchParams.get('shiftId');
  const status = searchParams.get('status');

  const employees = await prisma.user.findMany({
    where: {
      role: 'EMPLOYEE',
      ...(status ? { isActive: status === 'ACTIVE' } : {}),
      profile: {
        ...(departmentId ? { departmentId } : {}),
        ...(shiftId ? { assignedShiftId: shiftId } : {}),
      },
    },
    include: {
      profile: {
        include: {
          department: true,
          assignedShift: true,
        },
      },
      attendances: {
        where: { date: todayStr },
        take: 1,
      },
      _count: {
        select: {
          taskInstances: true,
          attendances: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = employees.map((emp) => {
    const attendance = emp.attendances?.[0];
    const isShiftActive = Boolean(attendance?.actualStart && !attendance?.actualEnd);
    const lastActive = emp.profile?.lastActiveAt ? new Date(emp.profile.lastActiveAt) : null;
    let idleMinutes = 0;
    if (lastActive) {
      idleMinutes = Math.max(0, Math.floor((currentMs - lastActive.getTime()) / 60000));
    } else if (attendance?.actualStart) {
      idleMinutes = Math.max(0, Math.floor((currentMs - new Date(attendance.actualStart).getTime()) / 60000));
    }
    const isIdle = isShiftActive && (idleMinutes >= 15 || Boolean(emp.profile?.isIdle));
    const mouseStatusType = !isShiftActive ? 'OFFLINE' : isIdle ? 'IDLE_15M' : 'ACTIVE';
    const mouseStatusLabel = !isShiftActive
      ? 'Shift Inactive ⚪'
      : isIdle
      ? `⚠️ Inactive ${idleMinutes}m (No Mouse)`
      : `🟢 Active (${idleMinutes === 0 ? 'Just now' : `${idleMinutes}m ago`})`;

    return {
      id: emp.id,
      email: emp.email,
      employeeId: emp.employeeId,
      role: emp.role,
      isActive: emp.isActive,
      fullName: emp.profile?.fullName || 'Employee',
      phone: emp.profile?.phone || null,
      departmentId: emp.profile?.departmentId || null,
      departmentName: emp.profile?.department?.name || 'Unassigned',
      designation: emp.profile?.designation || 'Staff',
      assignedShiftId: emp.profile?.assignedShiftId || null,
      assignedShiftName: emp.profile?.assignedShift?.name || 'Standard',
      weeklyWorkingDays: emp.profile?.weeklyWorkingDays
        ? typeof emp.profile.weeklyWorkingDays === 'string'
          ? JSON.parse(emp.profile.weeklyWorkingDays)
          : emp.profile.weeklyWorkingDays
        : ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      workingHours: emp.profile?.workingHours
        ? typeof emp.profile.workingHours === 'string'
          ? JSON.parse(emp.profile.workingHours)
          : emp.profile.workingHours
        : null,
      accountStatus: emp.profile?.accountStatus || 'ACTIVE',
      joiningDate: emp.profile?.joiningDate?.toISOString() || emp.createdAt.toISOString(),
      createdAt: emp.createdAt.toISOString(),
      totalTasks: emp._count.taskInstances,
      totalShifts: emp._count.attendances,
      // Mouse & activity tracking fields
      isShiftActive,
      lastActiveAt: emp.profile?.lastActiveAt || null,
      isIdle,
      idleMinutes,
      mouseStatusType,
      mouseStatusLabel,
    };
  });

  return NextResponse.json({ success: true, employees: formatted });
}

export async function POST(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const data = await req.json();
    const {
      fullName,
      employeeId,
      email,
      phone,
      password,
      departmentId,
      designation,
      assignedShiftId,
      weeklyWorkingDays,
      workingHours,
      joiningDate,
    } = data;

    if (!fullName || !employeeId || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Full name, Employee ID, Email, and Password are required.' },
        { status: 400 }
      );
    }

    // Check uniqueness
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.trim().toLowerCase() }, { employeeId: employeeId.trim() }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'User with this Email or Employee ID already exists.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          employeeId: employeeId.trim(),
          passwordHash,
          role: 'EMPLOYEE',
          isActive: true,
          profile: {
            create: {
              fullName: fullName.trim(),
              phone: phone?.trim() || null,
              departmentId: departmentId || null,
              designation: designation?.trim() || 'Staff',
              assignedShiftId: assignedShiftId || null,
              weeklyWorkingDays: (weeklyWorkingDays || ['MON', 'TUE', 'WED', 'THU', 'FRI']) as any,
              workingHours: (workingHours ? JSON.stringify(workingHours) : undefined) as any,
              joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
              accountStatus: 'ACTIVE',
            },
          },
        },
        include: {
          profile: {
            include: {
              department: true,
              assignedShift: true,
            },
          },
        },
      });

      return user;
    });

    await logAudit({
      userId: adminAuth.user.id,
      action: 'CREATE_EMPLOYEE',
      entity: 'User',
      entityId: newUser.id,
      newValues: { email: newUser.email, employeeId: newUser.employeeId, fullName },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Employee "${fullName}" created successfully with ID ${employeeId}.`,
      employee: newUser,
    });
  } catch (error: any) {
    console.error('Create employee error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

