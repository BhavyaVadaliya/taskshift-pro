import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie, getSessionUser } from '@/lib/auth';
import { logEmployeeActivity } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (user) {
    await logEmployeeActivity({
      userId: user.id,
      action: 'LOGOUT',
      req,
    });
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  clearAuthCookie(response);
  return response;
}
