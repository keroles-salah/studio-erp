import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { loginSchema, refreshSchema } from './auth.dto';
import { AuthenticatedRequest } from './auth.middleware';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error?.status) {
        res.status(error.status).json({
          success: false,
          error: { code: error.code || 'BAD_REQUEST', message: error.message },
        });
        return;
      }
      if (error?.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: error.errors?.[0]?.message || 'Validation error' },
        });
        return;
      }
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.refresh(req.body);
      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error?.status) {
        res.status(error.status).json({
          success: false,
          error: { code: error.code || 'BAD_REQUEST', message: error.message },
        });
        return;
      }
      if (error?.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: error.errors?.[0]?.message || 'Validation error' },
        });
        return;
      }
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.logout(req.body);
      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: error.errors?.[0]?.message || 'Validation error' },
        });
        return;
      }
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const result = await authService.getMe(userId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error?.status) {
        res.status(error.status).json({
          success: false,
          error: { code: error.code || 'BAD_REQUEST', message: error.message },
        });
        return;
      }
      next(error);
    }
  }
}

export const authController = new AuthController();
