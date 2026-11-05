import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const notifications = await prisma.notificationLog.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const unreadCount = await prisma.notificationLog.count({
    where: { userId: auth.user.id, isRead: false },
  });

  return NextResponse.json({
    success: true,
    notifications,
    unreadCount,
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const { id, markAllAsRead } = await req.json();

  if (markAllAsRead) {
    await prisma.notificationLog.updateMany({
      where: { userId: auth.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  } else if (id) {
    await prisma.notificationLog.updateMany({
      where: { id, userId: auth.user.id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  return NextResponse.json({ success: true });
}

