import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { settingsService } from './settings.service';
import { updateSettingsSchema } from './settings.dto';
import { logAction } from '../audit/audit.service';
import { z } from 'zod';

export const settingsController = {
  async list(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const category = req.query.category as string | undefined;

    const data = await settingsService.listSettings({ page, limit, category });
    res.json({ success: true, data });
  },

  async getStudioSettings(_req: Request, res: Response): Promise<void> {
    const data = await settingsService.getStudioSettings();
    res.json({ success: true, data });
  },

  async getByKey(req: Request, res: Response): Promise<void> {
    const setting = await settingsService.getSetting(req.params.key);
    if (!setting) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Setting not found' },
      });
      return;
    }
    res.json({ success: true, data: setting });
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = updateSettingsSchema.parse(req.body);
      const updated = await settingsService.updateSettings(data.settings);

      await logAction({
        userId: req.user!.id,
        action: 'UPDATE',
        entity: 'Settings',
        entityId: 'batch',
        newValue: { updated: updated } as unknown as Record<string, unknown>,
        ipAddress: req.ip,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors[0].message },
        });
        return;
      }
      throw err;
    }
  },
};
