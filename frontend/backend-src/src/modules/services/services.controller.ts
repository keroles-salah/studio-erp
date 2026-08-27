import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { servicesService } from './services.service';
import { createServiceSchema, updateServiceSchema } from './services.dto';
import { logAction } from '../audit/audit.service';
import { z } from 'zod';

export const servicesController = {
  async list(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const status = req.query.status as string | undefined;

    const data = await servicesService.listServices({
      page,
      limit,
      search,
      category,
      status,
    });

    res.json({ success: true, data });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const service = await servicesService.getServiceById(req.params.id);
    if (!service) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service not found' },
      });
      return;
    }
    res.json({ success: true, data: service });
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = createServiceSchema.parse(req.body);
      const service = await servicesService.createService(data);

      await logAction({
        userId: req.user!.id,
        action: 'CREATE',
        entity: 'Service',
        entityId: service.id,
        newValue: service as unknown as Record<string, unknown>,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: service });
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

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = updateServiceSchema.parse(req.body);
      const existing = await servicesService.getServiceById(req.params.id);

      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Service not found' },
        });
        return;
      }

      const service = await servicesService.updateService(req.params.id, data);

      await logAction({
        userId: req.user!.id,
        action: 'UPDATE',
        entity: 'Service',
        entityId: service.id,
        oldValue: existing as unknown as Record<string, unknown>,
        newValue: service as unknown as Record<string, unknown>,
        ipAddress: req.ip,
      });

      res.json({ success: true, data: service });
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

  async remove(req: AuthenticatedRequest, res: Response): Promise<void> {
    const existing = await servicesService.getServiceById(req.params.id);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service not found' },
      });
      return;
    }

    await servicesService.softDeleteService(req.params.id);

    await logAction({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'Service',
      entityId: req.params.id,
      oldValue: existing as unknown as Record<string, unknown>,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: null });
  },
};
