import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logEmployeeActivity } from '@/lib/logger';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const instanceId = params.id;
  const now = new Date();
  const { employeeComments } = await req.json().catch(() => ({}));

  const instance = await prisma.taskInstance.findUnique({
    where: { id: instanceId },
    include: {
      task: {
        include: {
          checklists: true,
        },
      },
      checklistCompletions: true,
    },
  });

  if (!instance || instance.userId !== auth.user.id) {
    return NextResponse.json({ success: false, error: 'Task instance not found.' }, { status: 404 });
  }

  // Check required checklist items
  const requiredChecklists = instance.task.checklists.filter((c) => c.isRequired);
  const completedMap = new Map(instance.checklistCompletions.filter((c) => c.isCompleted).map((c) => [c.checklistId, true]));

  const missingRequired = requiredChecklists.filter((c) => !completedMap.has(c.id));
  if (missingRequired.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Please complete all required checklist items before finishing this task (${missingRequired.length} required items remaining).`,
      },
      { status: 400 }
    );
  }

  // Check if late
  const isLate = now.getTime() > instance.scheduledDueTime.getTime();
  const delayMinutes = isLate ? Math.round((now.getTime() - instance.scheduledDueTime.getTime()) / (60 * 1000)) : 0;
  const finalStatus = isLate ? 'COMPLETED_LATE' : 'COMPLETED';

  const updated = await prisma.taskInstance.update({
    where: { id: instanceId },
    data: {
      status: finalStatus,
      completedAt: now,
      startedAt: instance.startedAt || now,
      delayMinutes,
      employeeComments: employeeComments || instance.employeeComments || null,
    },
  });

  await logEmployeeActivity({
    userId: auth.user.id,
    action: 'TASK_COMPLETED',
    details: {
      taskId: instance.taskId,
      taskName: instance.task.name,
      status: finalStatus,
      delayMinutes,
      completedAt: now.toISOString(),
    },
    req,
  });

  return NextResponse.json({
    success: true,
    message: isLate
      ? `Task completed (${delayMinutes}m late).`
      : 'Task completed successfully on time!',
    task: updated,
  });
}

