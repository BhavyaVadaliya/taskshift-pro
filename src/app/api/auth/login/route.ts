import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, verifyPassword, signToken, setAuthCookie } from '@/lib/auth';
import { logEmployeeActivity } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { loginId, password, rememberMe } = await req.json();

    if (!loginId || !password) {
      return NextResponse.json({ success: false, error: 'Email / Employee ID and Password are required.' }, { status: 400 });
    }

    const cleanLogin = loginId.trim();

    // Find user by email or employeeId
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanLogin.toLowerCase() }, { employeeId: cleanLogin }],
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

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials. User not found.' }, { status: 401 });
    }

    if (!user.isActive || user.profile?.accountStatus === 'INACTIVE' || user.profile?.accountStatus === 'SUSPENDED') {
      return NextResponse.json({ success: false, error: 'Account is deactivated or suspended. Please contact administrator.' }, { status: 403 });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Invalid credentials. Incorrect password.' }, { status: 401 });
    }

    const token = signToken(
      {
        userId: user.id,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role as any,
      },
      Boolean(rememberMe)
    );

    await logEmployeeActivity({
      userId: user.id,
      action: 'LOGIN',
      details: { role: user.role, rememberMe: Boolean(rememberMe) },
      req,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role,
        fullName: user.profile?.fullName || 'User',
        department: user.profile?.department?.name || null,
        designation: user.profile?.designation || null,
        assignedShift: user.profile?.assignedShift || null,
      },
      redirectUrl: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? '/admin/dashboard' : '/employee/dashboard',
    });

    setAuthCookie(response, token, Boolean(rememberMe));
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
