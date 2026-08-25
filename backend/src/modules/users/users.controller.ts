import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { usersService } from './users.service';
import { createUserSchema, updateUserSchema } from './users.dto';
import { logAction } from '../audit/audit.service';
import { z } from 'zod';

export const usersController = {
  async list(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = req.query.search as string | undefined;

    const data = await usersService.listUsers({ page, limit, search });
    res.json({ success: true, data });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const user = await usersService.getUserWithRole(req.params.id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
      return;
    }
    res.json({ success: true, data: user });
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = createUserSchema.parse(req.body);
      const user = await usersService.createUser(data);

      await logAction({
        userId: req.user!.id,
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        newValue: user as unknown as Record<string, unknown>,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: user });
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
      const data = updateUserSchema.parse(req.body);
      const existing = await usersService.getUserById(req.params.id);

      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      const user = await usersService.updateUser(req.params.id, data);

      await logAction({
        userId: req.user!.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: user.id,
        oldValue: existing as unknown as Record<string, unknown>,
        newValue: user as unknown as Record<string, unknown>,
        ipAddress: req.ip,
      });

      res.json({ success: true, data: user });
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
    const existing = await usersService.getUserById(req.params.id);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
      return;
    }

    await usersService.softDeleteUser(req.params.id);

    await logAction({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'User',
      entityId: req.params.id,
      oldValue: existing as unknown as Record<string, unknown>,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: null });
  },
};
