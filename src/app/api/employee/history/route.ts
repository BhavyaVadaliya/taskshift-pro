import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'all'; // 'shifts', 'tasks', or 'all'

  let attendances: any[] = [];
  let tasks: any[] = [];

  if (type === 'all' || type === 'shifts') {
    attendances = await prisma.shiftAttendance.findMany({
      where: { userId: auth.user.id },
      include: {
        shift: true,
        breaks: true,
      },
      orderBy: { date: 'desc' },
      take: 50,
    });
  }

  if (type === 'all' || type === 'tasks') {
    tasks = await prisma.taskInstance.findMany({
      where: { userId: auth.user.id },
      include: {
        task: {
          include: { department: true, checklists: true },
        },
        checklistCompletions: true,
      },
      orderBy: { date: 'desc' },
      take: 50,
    });
  }

  return NextResponse.json({
    success: true,
    attendances,
    tasks,
  });
}
