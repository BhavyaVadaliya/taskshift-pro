import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sendPushToUser } from '@/lib/push';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  try {
    const result = await sendPushToUser(auth.user.id, {
      title: '🔔 Test Notification System',
      body: 'Browser push notifications are working perfectly on this device!',
      data: { url: '/employee/tasks', type: 'TEST' },
    });

    // Also log an in-app notification
    await prisma.notificationLog.create({
      data: {
        userId: auth.user.id,
        title: '🔔 Test Notification System',
        message: 'Browser push & in-app notifications are active and verified.',
        type: 'SYSTEM',
        deliveryStatus: result.successCount > 0 ? 'DELIVERED' : 'SENT',
      },
    });

    return NextResponse.json({
      success: true,
      result,
      message:
        result.successCount > 0
          ? 'Push notification dispatched successfully!'
          : 'In-app notification created. (Browser push subscription not yet activated or allowed for this session).',
    });
  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

