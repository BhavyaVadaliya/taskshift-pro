import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const settings = await prisma.companySetting.findMany();
  const holidays = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });

  const settingsMap: Record<string, any> = {
    companyName: 'Apex Enterprises',
    companyLogoUrl: '',
    timezone: 'UTC',
    workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    defaultGracePeriodMinutes: 15,
    defaultAutoLogoutMinutes: 60,
    notificationSoundsEnabled: true,
    reminderIntervalMinutes: 15,
    maxReminders: 3,
    escalationMinutes: 30,
    allowEarlyTaskCompletion: false,
    requireAllChecklists: true,
    taskCategories: ['General', 'Operations', 'Client Care', 'Reporting', 'Quality Audit', 'Maintenance'],
    notificationTemplateStart: 'Your shift has started. Here are your scheduled tasks for today.',
    notificationTemplateTask: 'Scheduled task reminder: {task_name}. Due at {due_time}.',
    notificationTemplateOverdue: 'ALERT: Task {task_name} is overdue. Please complete it now.',
  };

  for (const s of settings) {
    try {
      settingsMap[s.key] = JSON.parse(s.value);
    } catch {
      settingsMap[s.key] = s.value;
    }
  }

  return NextResponse.json({
    success: true,
    settings: settingsMap,
    holidays,
  });
}

export async function PUT(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const payload = await req.json();

    const updatedKeys: string[] = [];

    for (const [key, value] of Object.entries(payload)) {
      const valStr = typeof value === 'object' ? JSON.stringify(value) : JSON.stringify(value);

      await prisma.companySetting.upsert({
        where: { key },
        update: { value: valStr },
        create: { key, value: valStr },
      });
      updatedKeys.push(key);
    }

    await logAudit({
      userId: adminAuth.user.id,
      action: 'UPDATE_COMPANY_SETTINGS',
      entity: 'CompanySetting',
      newValues: payload,
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'System settings updated successfully.',
      updatedKeys,
    });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
