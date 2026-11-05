import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

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
      _count: {
        select: {
          taskInstances: true,
          attendances: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = employees.map((emp) => ({
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
    weeklyWorkingDays: emp.profile?.weeklyWorkingDays ? JSON.parse(emp.profile.weeklyWorkingDays) : ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    workingHours: emp.profile?.workingHours ? JSON.parse(emp.profile.workingHours) : null,
    accountStatus: emp.profile?.accountStatus || 'ACTIVE',
    joiningDate: emp.profile?.joiningDate?.toISOString() || emp.createdAt.toISOString(),
    createdAt: emp.createdAt.toISOString(),
    totalTasks: emp._count.taskInstances,
    totalShifts: emp._count.attendances,
  }));

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
              weeklyWorkingDays: JSON.stringify(weeklyWorkingDays || ['MON', 'TUE', 'WED', 'THU', 'FRI']),
              workingHours: workingHours ? JSON.stringify(workingHours) : null,
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

