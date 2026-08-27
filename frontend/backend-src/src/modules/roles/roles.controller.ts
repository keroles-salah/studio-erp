import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { rolesService, RoleInUseError } from './roles.service';
import { createRoleSchema, updateRoleSchema } from './roles.dto';
import { logAction } from '../audit/audit.service';
import { z } from 'zod';

export const rolesController = {
  async list(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = req.query.search as string | undefined;

    const data = await rolesService.listRoles({ page, limit, search });
    res.json({ success: true, data });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const role = await rolesService.getRoleById(req.params.id);
    if (!role) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Role not found' },
      });
      return;
    }
    res.json({ success: true, data: role });
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = createRoleSchema.parse(req.body);
      const role = await rolesService.createRole(data);

      await logAction({
        userId: req.user!.id,
        action: 'CREATE',
        entity: 'Role',
        entityId: role.id,
        newValue: role as unknown as Record<string, unknown>,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: role });
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
      const data = updateRoleSchema.parse(req.body);
      const existing = await rolesService.getRoleById(req.params.id);

      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Role not found' },
        });
        return;
      }

      const role = await rolesService.updateRole(req.params.id, data);

      await logAction({
        userId: req.user!.id,
        action: 'UPDATE',
        entity: 'Role',
        entityId: role.id,
        oldValue: existing as unknown as Record<string, unknown>,
        newValue: role as unknown as Record<string, unknown>,
        ipAddress: req.ip,
      });

      res.json({ success: true, data: role });
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
    const existing = await rolesService.getRoleById(req.params.id);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Role not found' },
      });
      return;
    }

    try {
      await rolesService.deleteRole(req.params.id);

      await logAction({
        userId: req.user!.id,
        action: 'DELETE',
        entity: 'Role',
        entityId: req.params.id,
        oldValue: existing as unknown as Record<string, unknown>,
        ipAddress: req.ip,
      });

      res.json({ success: true, data: null });
    } catch (err) {
      if (err instanceof RoleInUseError) {
        res.status(409).json({
          success: false,
          error: {
            code: 'ROLE_IN_USE',
            message: err.message,
          },
        });
        return;
      }
      throw err;
    }
  },

  async listPermissions(_req: Request, res: Response): Promise<void> {
    const data = await rolesService.listPermissions();
    res.json({ success: true, data });
  },
};
