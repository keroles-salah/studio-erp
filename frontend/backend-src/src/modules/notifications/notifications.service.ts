import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export const notificationsService = {
  async createNotification(params: CreateNotificationParams) {
    return prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data ? JSON.stringify(params.data) : null,
      },
    });
  },

  async notifyAdmins(params: {
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) {
    // Find all users with admin role
    const admins = await prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        role: {
          name: { contains: 'admin' },
        },
      },
      select: { id: true },
    });

    if (admins.length === 0) return [];

    const notifications = admins.map((admin) =>
      prisma.notification.create({
        data: {
          userId: admin.id,
          type: params.type,
          title: params.title,
          message: params.message,
          data: params.data ? JSON.stringify(params.data) : null,
        },
      }),
    );

    return prisma.$transaction(notifications);
  },

  async listForUser(userId: string, opts: { page: number; limit: number; unreadOnly?: boolean }) {
    const { page, limit, unreadOnly } = opts;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  },

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },

  async delete(id: string, userId: string) {
    return prisma.notification.deleteMany({
      where: { id, userId },
    });
  },

  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  },
};
