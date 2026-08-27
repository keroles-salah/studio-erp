import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { notificationsService } from './notifications.service';

export const notificationsController = {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const unreadOnly = req.query.unread === 'true';

    const data = await notificationsService.listForUser(req.user!.id, {
      page,
      limit,
      unreadOnly,
    });

    res.json({ success: true, data });
  },

  async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const result = await notificationsService.markAsRead(req.params.id, req.user!.id);

    if (result.count === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' },
      });
      return;
    }

    res.json({ success: true, data: null });
  },

  async markAllRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const result = await notificationsService.markAllRead(req.user!.id);
    res.json({ success: true, data: { updated: result.count } });
  },

  async remove(req: AuthenticatedRequest, res: Response): Promise<void> {
    const result = await notificationsService.delete(req.params.id, req.user!.id);

    if (result.count === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' },
      });
      return;
    }

    res.json({ success: true, data: null });
  },

  async getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    const count = await notificationsService.getUnreadCount(req.user!.id);
    res.json({ success: true, data: { count } });
  },
};
