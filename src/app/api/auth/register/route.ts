import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth';
import { logEmployeeActivity } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, password, employeeId, departmentId, designation } = body;

    // Validation
    if (!fullName || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Full Name, Email, and Password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // Check if user with email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists. Please log in.' },
        { status: 409 }
      );
    }

    // Generate or validate employeeId
    let finalEmpId = employeeId ? employeeId.trim().toUpperCase() : '';
    if (finalEmpId) {
      const existingEmpId = await prisma.user.findUnique({
        where: { employeeId: finalEmpId },
      });
      if (existingEmpId) {
        return NextResponse.json(
          { success: false, error: 'An account with this Employee ID already exists.' },
          { status: 409 }
        );
      }
    } else {
      // Auto-generate employee ID (e.g., EMP-101)
      const count = await prisma.user.count();
      finalEmpId = `EMP${String(100 + count + 1).padStart(3, '0')}`;
    }

    // Determine role: if this is the very first user in the database, make them SUPER_ADMIN
    const totalUsers = await prisma.user.count();
    const role = totalUsers === 0 ? 'SUPER_ADMIN' : 'EMPLOYEE';

    // Find default shift (Morning Shift or first active shift)
    const defaultShift = await prisma.shift.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    // Find default department
    let defaultDeptId = departmentId;
    if (!defaultDeptId) {
      const firstDept = await prisma.department.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      defaultDeptId = firstDept?.id || null;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user and profile in transaction
    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        employeeId: finalEmpId,
        passwordHash,
        role,
        isActive: true,
        profile: {
          create: {
            fullName: fullName.trim(),
            designation: designation?.trim() || (role === 'SUPER_ADMIN' ? 'System Administrator' : 'Support Specialist'),
            departmentId: defaultDeptId,
            assignedShiftId: defaultShift?.id || null,
            accountStatus: 'ACTIVE',
            weeklyWorkingDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
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

    // Sign session token
    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      employeeId: newUser.employeeId,
      role: newUser.role as any,
    });

    // Log registration
    await logEmployeeActivity({
      userId: newUser.id,
      action: 'USER_REGISTERED',
      details: {
        email: newUser.email,
        employeeId: newUser.employeeId,
        role: newUser.role,
        registeredAt: new Date().toISOString(),
      },
      req,
    });

    // Determine redirect URL
    const redirectUrl = newUser.role === 'SUPER_ADMIN' || newUser.role === 'ADMIN'
      ? '/admin/dashboard'
      : '/employee/tasks';

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id: newUser.id,
        email: newUser.email,
        employeeId: newUser.employeeId,
        role: newUser.role,
        fullName: newUser.profile?.fullName,
        departmentName: newUser.profile?.department?.name,
        designation: newUser.profile?.designation,
        assignedShiftName: newUser.profile?.assignedShift?.name,
      },
      redirectUrl,
    });

    // Set HTTP-only auth cookie
    setAuthCookie(response, token, false);

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed. ' + (error.message || 'Please try again.') },
      { status: 500 }
    );
  }
}

