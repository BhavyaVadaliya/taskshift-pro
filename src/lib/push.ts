import webpush from 'web-push';
import prisma from './prisma';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@company.com';

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (err) {
    console.error('Failed to configure VAPID details:', err);
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    taskInstanceId?: string;
    type?: string;
    timestamp?: number;
  };
}

export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ successCount: number; failureCount: number }> {
  if (!publicKey || !privateKey) {
    console.warn('VAPID keys not configured, skipping web push.');
    return { successCount: 0, failureCount: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  let successCount = 0;
  let failureCount = 0;

  const notificationString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/badge-72.png',
    data: {
      url: payload.data?.url || '/employee/tasks',
      taskInstanceId: payload.data?.taskInstanceId,
      type: payload.data?.type || 'REMINDER',
      timestamp: Date.now(),
    },
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        notificationString
      );
      successCount++;
    } catch (error: any) {
      failureCount++;
      // If subscription expired or invalid (HTTP 410 or 404), remove it
      if (error?.statusCode === 410 || error?.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }

  return { successCount, failureCount };
}

