import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logEmployeeActivity } from '@/lib/logger';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const instanceId = params.id;
  const now = new Date();
  const { checklistId, isCompleted, comments } = await req.json();

  if (!checklistId) {
    return NextResponse.json({ success: false, error: 'Checklist ID required.' }, { status: 400 });
  }

  const instance = await prisma.taskInstance.findUnique({
    where: { id: instanceId },
    include: { task: true },
  });

  if (!instance || instance.userId !== auth.user.id) {
    return NextResponse.json({ success: false, error: 'Task instance not found.' }, { status: 404 });
  }

  // Check if completed after due time
  const isLate = now.getTime() > instance.scheduledDueTime.getTime();

  // Upsert completion record
  const completion = await prisma.checklistCompletion.upsert({
    where: {
      taskInstanceId_checklistId: {
        taskInstanceId: instanceId,
        checklistId,
      },
    },
    update: {
      isCompleted: Boolean(isCompleted),
      completedAt: isCompleted ? now : null,
      comments: comments !== undefined ? comments : undefined,
      isLate: Boolean(isCompleted && isLate),
    },
    create: {
      taskInstanceId: instanceId,
      checklistId,
      isCompleted: Boolean(isCompleted),
      completedAt: isCompleted ? now : null,
      comments: comments || null,
      isLate: Boolean(isCompleted && isLate),
    },
  });

  // If user starts marking checklists and task was NOT_STARTED, transition to IN_PROGRESS
  if (isCompleted && instance.status === 'NOT_STARTED') {
    await prisma.taskInstance.update({
      where: { id: instanceId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: instance.startedAt || now,
      },
    });
  }

  // Check if all required checklists for this task are now satisfied
  const allCompletions = await prisma.checklistCompletion.findMany({
    where: { taskInstanceId: instanceId },
    include: { checklist: true },
  });

  const requiredCompletions = allCompletions.filter((c) => c.checklist.isRequired);
  const allRequiredDone =
    requiredCompletions.length > 0 &&
    requiredCompletions.every((c) => (c.checklistId === checklistId ? isCompleted : c.isCompleted));

  if (allRequiredDone && isCompleted) {
    await prisma.taskInstance.update({
      where: { id: instanceId },
      data: {
        status: isLate ? 'COMPLETED_LATE' : 'COMPLETED',
        completedAt: instance.completedAt || now,
      },
    });
  } else if (!allRequiredDone && (instance.status === 'COMPLETED' || instance.status === 'COMPLETED_LATE')) {
    // If user unchecked an item after completing, return to IN_PROGRESS
    await prisma.taskInstance.update({
      where: { id: instanceId },
      data: {
        status: 'IN_PROGRESS',
        completedAt: null,
      },
    });
  }

  await logEmployeeActivity({
    userId: auth.user.id,
    action: isCompleted ? 'CHECKLIST_ITEM_COMPLETED' : 'CHECKLIST_ITEM_UNCHECKED',
    details: {
      instanceId,
      checklistId,
      isLate,
      comments,
    },
    req,
  });

  return NextResponse.json({
    success: true,
    completion,
  });
}

