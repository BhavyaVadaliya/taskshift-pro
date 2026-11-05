import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const departments = await prisma.department.findMany({
    include: {
      _count: {
        select: {
          profiles: true,
          tasks: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const formatted = departments.map((d) => ({
    ...d,
    employeeCount: d._count.profiles,
    taskCount: d._count.tasks,
  }));

  return NextResponse.json({ success: true, departments: formatted });
}

export async function POST(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  try {
    const { name, code, description, managerId } = await req.json();

    if (!name || !code) {
      return NextResponse.json({ success: false, error: 'Department name and code are required.' }, { status: 400 });
    }

    const dept = await prisma.department.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        managerId: managerId || null,
      },
    });

    await logAudit({
      userId: adminAuth.user.id,
      action: 'CREATE_DEPARTMENT',
      entity: 'Department',
      entityId: dept.id,
      newValues: { name: dept.name, code: dept.code },
      req,
    });

    return NextResponse.json({ success: true, department: dept });
  } catch (error: any) {
    console.error('Create department error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if ('error' in adminAuth) return adminAuth.error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Department ID required.' }, { status: 400 });
  }

  try {
    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Department deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
