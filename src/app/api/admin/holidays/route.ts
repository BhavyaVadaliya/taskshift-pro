import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const holidays = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
  return NextResponse.json({ success: true, holidays });
}

export async function POST(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const { name, date, description } = await req.json();

    if (!name || !date) {
      return NextResponse.json({ success: false, error: 'Holiday name and date are required.' }, { status: 400 });
    }

    const holiday = await prisma.holiday.upsert({
      where: { date },
      update: { name, description },
      create: { name, date, description },
    });

    await logAudit({
      userId: adminAuth.user.id,
      action: 'ADD_HOLIDAY',
      entity: 'Holiday',
      entityId: holiday.id,
      newValues: { name, date },
      req,
    });

    return NextResponse.json({ success: true, holiday });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Holiday ID required.' }, { status: 400 });
  }

  try {
    await prisma.holiday.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Holiday removed.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

