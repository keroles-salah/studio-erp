import { Request, Response, NextFunction } from 'express';
import { paymentsService } from './payments.service';
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
} from './payments.dto';
import { AuthenticatedRequest } from '../auth/auth.middleware';

export class PaymentsController {
  // ─── GET / - List payments ─────────────────────────────────

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = listPaymentsQuerySchema.parse(req.query);
      const result = await paymentsService.list(parsed);

      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: error.errors?.[0]?.message || 'Validation error',
          },
        });
        return;
      }
      next(error);
    }
  }

  // ─── GET /:id - Get payment by ID ──────────────────────────

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const payment = await paymentsService.getById(id);

      if (!payment) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Payment not found' },
        });
        return;
      }

      res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  // ─── POST / - Record a new payment ─────────────────────────

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const parsed = createPaymentSchema.parse(req.body);

      const payment = await paymentsService.recordPayment(parsed, authReq.user!.id);

      res.status(201).json({ success: true, data: payment });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: error.errors?.[0]?.message || 'Validation error',
          },
        });
        return;
      }
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

  // ─── DELETE /:id - Void a payment ──────────────────────────

  async void(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Verify payment exists before voiding
      const payment = await paymentsService.getById(id);
      if (!payment) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Payment not found' },
        });
        return;
      }

      await paymentsService.voidPayment(id);

      res.json({ success: true, data: { id, voided: true } });
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

export const paymentsController = new PaymentsController();
