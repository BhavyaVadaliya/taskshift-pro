import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/logger';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const employee = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      profile: {
        include: {
          department: true,
          assignedShift: true,
        },
      },
      attendances: {
        include: { shift: true, breaks: true },
        orderBy: { date: 'desc' },
        take: 30,
      },
      taskInstances: {
        include: {
          task: { include: { checklists: true } },
          checklistCompletions: true,
        },
        orderBy: { date: 'desc' },
        take: 30,
      },
      activityLogs: {
        orderBy: { timestamp: 'desc' },
        take: 40,
      },
    },
  });

  if (!employee) {
    return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, employee });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const data = await req.json();
    const {
      fullName,
      email,
      phone,
      departmentId,
      designation,
      assignedShiftId,
      weeklyWorkingDays,
      workingHours,
      accountStatus,
      isActive,
      newPassword,
    } = data;

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      include: { profile: true },
    });

    if (!existingUser) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    let passwordHashUpdate: string | undefined;
    if (newPassword && newPassword.trim().length >= 6) {
      passwordHashUpdate = await hashPassword(newPassword.trim());
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(email ? { email: email.trim().toLowerCase() } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(passwordHashUpdate ? { passwordHash: passwordHashUpdate } : {}),
        profile: {
          upsert: {
            create: {
              fullName: fullName || existingUser.profile?.fullName || 'Employee',
              phone: phone || null,
              departmentId: departmentId || null,
              designation: designation || 'Staff',
              assignedShiftId: assignedShiftId || null,
              weeklyWorkingDays: weeklyWorkingDays ? JSON.stringify(weeklyWorkingDays) : undefined,
              workingHours: workingHours ? JSON.stringify(workingHours) : undefined,
              accountStatus: accountStatus || 'ACTIVE',
            },
            update: {
              ...(fullName !== undefined ? { fullName: fullName.trim() } : {}),
              ...(phone !== undefined ? { phone: phone ? phone.trim() : null } : {}),
              ...(departmentId !== undefined ? { departmentId: departmentId || null } : {}),
              ...(designation !== undefined ? { designation: designation.trim() } : {}),
              ...(assignedShiftId !== undefined ? { assignedShiftId: assignedShiftId || null } : {}),
              ...(weeklyWorkingDays !== undefined ? { weeklyWorkingDays: JSON.stringify(weeklyWorkingDays) } : {}),
              ...(workingHours !== undefined ? { workingHours: JSON.stringify(workingHours) } : {}),
              ...(accountStatus !== undefined ? { accountStatus } : {}),
            },
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

    await logAudit({
      userId: adminAuth.user.id,
      action: 'UPDATE_EMPLOYEE',
      entity: 'User',
      entityId: params.id,
      oldValues: {
        email: existingUser.email,
        fullName: existingUser.profile?.fullName,
        accountStatus: existingUser.profile?.accountStatus,
      },
      newValues: {
        email: updatedUser.email,
        fullName: updatedUser.profile?.fullName,
        accountStatus: updatedUser.profile?.accountStatus,
        passwordReset: Boolean(passwordHashUpdate),
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Employee updated successfully.',
      employee: updatedUser,
    });
  } catch (error: any) {
    console.error('Update employee error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      include: { profile: true },
    });

    if (!existingUser) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    // Soft delete (deactivate) or hard delete if no active dependencies
    await prisma.user.update({
      where: { id: params.id },
      data: {
        isActive: false,
        profile: {
          update: {
            accountStatus: 'INACTIVE',
          },
        },
      },
    });

    await logAudit({
      userId: adminAuth.user.id,
      action: 'DEACTIVATE_EMPLOYEE',
      entity: 'User',
      entityId: params.id,
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Employee "${existingUser.profile?.fullName || existingUser.employeeId}" has been deactivated.`,
    });
  } catch (error: any) {
    console.error('Delete employee error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

