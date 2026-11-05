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

  // Business Rule: Early availability check
  if (!instance.task.allowEarlyCompletion && now.getTime() < instance.scheduledStartTime.getTime()) {
    const startStr = instance.task.startTime || instance.scheduledStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return NextResponse.json(
      {
        success: false,
        error: `This task is scheduled for ${startStr}. Early start is restricted by administrator policy.`,
      },
      { status: 403 }
    );
  }

  const updated = await prisma.taskInstance.update({
    where: { id: instanceId },
    data: {
      status: 'IN_PROGRESS',
      startedAt: instance.startedAt || now,
    },
  });

  await logEmployeeActivity({
    userId: auth.user.id,
    action: 'TASK_STARTED',
    details: {
      taskId: instance.taskId,
      taskName: instance.task.name,
      startedAt: now.toISOString(),
    },
    req,
  });

  return NextResponse.json({
    success: true,
    message: `Started task "${instance.task.name}".`,
    task: updated,
  });
}

