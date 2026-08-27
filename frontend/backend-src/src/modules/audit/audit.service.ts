import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';

interface LogActionParams {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
}

export const auditService = {
  async logAction(params: LogActionParams): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        ipAddress: params.ipAddress ?? null,
      },
    });
  },

  async listLogs(opts: {
    page: number;
    limit: number;
    userId?: string;
    entity?: string;
    action?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const { page, limit, userId, entity, action, dateFrom, dateTo } = opts;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(userId ? { userId } : {}),
      ...(entity ? { entity } : {}),
      ...(action ? { action } : {}),
      ...((dateFrom || dateTo)
        ? {
            createdAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          action: true,
          entity: true,
          entityId: true,
          oldValue: true,
          newValue: true,
          ipAddress: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  },
};

// Export standalone logAction for cross-module usage
export const logAction = auditService.logAction;
