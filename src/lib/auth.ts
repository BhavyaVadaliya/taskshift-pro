import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import prisma from './prisma';
import { AuthUser, Role } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev_only_change_in_prod';
const TOKEN_NAME = 'auth_token';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JWTPayload {
  userId: string;
  email: string;
  employeeId: string;
  role: Role;
}

export function signToken(payload: JWTPayload, rememberMe = false): string {
  const expiresIn = rememberMe ? '30d' : '7d';
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser(req?: NextRequest): Promise<AuthUser | null> {
  let token: string | undefined;

  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = req.cookies.get(TOKEN_NAME)?.value;
    }
  } else {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(TOKEN_NAME)?.value;
    } catch {
      return null;
    }
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId, isActive: true },
      include: {
        profile: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      employeeId: user.employeeId,
      role: user.role as Role,
      fullName: user.profile?.fullName || 'User',
      departmentId: user.profile?.departmentId,
      departmentName: user.profile?.department?.name,
      designation: user.profile?.designation,
      assignedShiftId: user.profile?.assignedShiftId,
      avatarUrl: user.profile?.avatarUrl,
    };
  } catch (error) {
    console.error('Error fetching session user:', error);
    return null;
  }
}

export async function requireAuth(req?: NextRequest): Promise<{ user: AuthUser } | { error: NextResponse }> {
  const user = await getSessionUser(req);
  if (!user) {
    return {
      error: NextResponse.json({ success: false, error: 'Unauthorized. Please log in.' }, { status: 401 }),
    };
  }
  return { user };
}

export async function requireAdmin(req?: NextRequest): Promise<{ user: AuthUser } | { error: NextResponse }> {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth;

  if (auth.user.role !== 'ADMIN' && auth.user.role !== 'SUPER_ADMIN') {
    return {
      error: NextResponse.json({ success: false, error: 'Forbidden. Admin privileges required.' }, { status: 403 }),
    };
  }

  return auth;
}

export function setAuthCookie(response: NextResponse, token: string, rememberMe = false): void {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
  response.cookies.set({
    name: TOKEN_NAME,
    value: token,
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set({
    name: TOKEN_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  });
}
