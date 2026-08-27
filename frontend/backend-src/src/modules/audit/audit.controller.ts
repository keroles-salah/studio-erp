import { Request, Response } from 'express';
import { auditService } from './audit.service';

export const auditController = {
  async list(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const userId = req.query.userId as string | undefined;
    const entity = req.query.entity as string | undefined;
    const action = req.query.action as string | undefined;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const data = await auditService.listLogs({
      page,
      limit,
      userId,
      entity,
      action,
      dateFrom,
      dateTo,
    });

    res.json({ success: true, data });
  },
};
