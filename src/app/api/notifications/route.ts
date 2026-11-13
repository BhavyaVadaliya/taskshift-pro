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

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const { title, message, type, deliveryStatus } = await req.json();

  if (!title || !message) {
    return NextResponse.json({ success: false, error: 'Title and message are required.' }, { status: 400 });
  }

  const notification = await prisma.notificationLog.create({
    data: {
      userId: auth.user.id,
      title,
      message,
      type: (type as any) || 'TASK_REMINDER',
      deliveryStatus: (deliveryStatus as any) || 'DELIVERED',
    },
  });

  return NextResponse.json({ success: true, notification });
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

