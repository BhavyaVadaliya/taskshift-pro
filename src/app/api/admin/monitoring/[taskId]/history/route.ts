import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { taskId: string } }) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const instanceId = params.taskId;

  const instance = await prisma.taskInstance.findUnique({
    where: { id: instanceId },
    include: {
      task: {
        include: {
          department: true,
          checklists: { orderBy: { sortOrder: 'asc' } },
        },
      },
      user: {
        include: {
          profile: {
            include: { department: true, assignedShift: true },
          },
        },
      },
      checklistCompletions: {
        include: { checklist: true },
        orderBy: { completedAt: 'asc' },
      },
      notificationLogs: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!instance) {
    return NextResponse.json({ success: false, error: 'Task instance not found.' }, { status: 404 });
  }

  // Fetch employee activity logs around this date
  const employeeActivities = await prisma.employeeActivityLog.findMany({
    where: {
      userId: instance.userId,
      timestamp: {
        gte: new Date(`${instance.date}T00:00:00.000Z`),
        lte: new Date(`${instance.date}T23:59:59.999Z`),
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Construct consolidated chronology timeline
  const timeline: Array<{ timestamp: string; label: string; type: string; details?: any }> = [];

  // Employee shift start / end
  for (const act of employeeActivities) {
    if (act.action === 'SHIFT_STARTED') {
      timeline.push({
        timestamp: act.timestamp.toISOString(),
        label: 'Employee Started Shift',
        type: 'shift',
      });
    } else if (act.action === 'SHIFT_ENDED') {
      timeline.push({
        timestamp: act.timestamp.toISOString(),
        label: 'Employee Ended Shift',
        type: 'shift',
      });
    }
  }

  // Notifications sent
  if (instance.notificationSentAt) {
    timeline.push({
      timestamp: instance.notificationSentAt.toISOString(),
      label: `Task Reminder Notification Dispatched (${instance.task.name})`,
      type: 'notification',
    });
  }

  // Notification acknowledged
  if (instance.notificationAcknowledgedAt) {
    timeline.push({
      timestamp: instance.notificationAcknowledgedAt.toISOString(),
      label: 'Notification Acknowledged by Employee',
      type: 'ack',
    });
  }

  // Task started
  if (instance.startedAt) {
    timeline.push({
      timestamp: instance.startedAt.toISOString(),
      label: `Task Started by ${instance.user.profile?.fullName || 'Employee'}`,
      type: 'task_start',
    });
  }

  // Checklist items completion
  for (const comp of instance.checklistCompletions) {
    if (comp.isCompleted && comp.completedAt) {
      timeline.push({
        timestamp: comp.completedAt.toISOString(),
        label: `Checklist Item Completed: "${comp.checklist.title}"${comp.isLate ? ' (Completed Late)' : ''}${comp.comments ? ` - Note: "${comp.comments}"` : ''}`,
        type: 'checklist',
      });
    }
  }

  // Task completed
  if (instance.completedAt) {
    timeline.push({
      timestamp: instance.completedAt.toISOString(),
      label: `Task Completed (${instance.status === 'COMPLETED_LATE' ? `Late by ${instance.delayMinutes}m` : 'On-Time'})`,
      type: 'task_complete',
      details: instance.employeeComments ? `Comments: ${instance.employeeComments}` : undefined,
    });
  }

  // Sort timeline by timestamp
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return NextResponse.json({
    success: true,
    instance,
    timeline,
  });
}

