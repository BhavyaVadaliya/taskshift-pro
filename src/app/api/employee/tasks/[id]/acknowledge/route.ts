import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logEmployeeActivity } from '@/lib/logger';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const instanceId = params.id;
  const now = new Date();

  const instance = await prisma.taskInstance.findUnique({
    where: { id: instanceId },
    include: { task: true },
  });

  if (!instance || instance.userId !== auth.user.id) {
    return NextResponse.json({ success: false, error: 'Task instance not found.' }, { status: 404 });
  }

  const updated = await prisma.taskInstance.update({
    where: { id: instanceId },
    data: {
      notificationAcknowledgedAt: now,
    },
  });

  await logEmployeeActivity({
    userId: auth.user.id,
    action: 'NOTIFICATION_ACKNOWLEDGED',
    details: {
      taskInstanceId: instanceId,
      taskName: instance.task.name,
      acknowledgedAt: now.toISOString(),
    },
    req,
  });

  return NextResponse.json({ success: true, task: updated });
}

