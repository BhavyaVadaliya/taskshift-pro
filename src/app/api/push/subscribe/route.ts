import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  try {
    const { endpoint, keys } = await req.json();

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json({ success: false, error: 'Invalid subscription object' }, { status: 400 });
    }

    const userAgent = req.headers.get('user-agent') || undefined;

    // Upsert subscription
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: auth.user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
      },
      create: {
        userId: auth.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
      },
    });

    return NextResponse.json({ success: true, message: 'Push notifications registered successfully.' });
  } catch (error: any) {
    console.error('Subscription error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
