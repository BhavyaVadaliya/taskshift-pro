import prisma from './prisma';

export async function logEmployeeActivity(params: {
  userId: string;
  action: string;
  details?: Record<string, unknown> | string;
  req?: Request;
}) {
  try {
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (params.req) {
      ipAddress = params.req.headers.get('x-forwarded-for') || undefined;
      userAgent = params.req.headers.get('user-agent') || undefined;
    }

    const detailsStr =
      typeof params.details === 'object' ? JSON.stringify(params.details) : params.details || null;

    await prisma.employeeActivityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        details: (detailsStr || undefined) as any,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to log employee activity:', error);
  }
}

export async function logAudit(params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  req?: Request;
}) {
  try {
    let ipAddress: string | undefined;
    if (params.req) {
      ipAddress = params.req.headers.get('x-forwarded-for') || undefined;
    }

    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        oldValues: (params.oldValues || undefined) as any,
        newValues: (params.newValues || undefined) as any,
        ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

