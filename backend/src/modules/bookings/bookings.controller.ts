import { Request, Response, NextFunction } from 'express';
import { bookingsService } from './bookings.service';
import { createBookingSchema, updateBookingSchema, listBookingsQuerySchema } from './bookings.dto';
import { AuthenticatedRequest } from '../auth/auth.middleware';

export class BookingsController {
  // ----------------------------------------------------------
  // GET /bookings — List with pagination & filters
  // ----------------------------------------------------------
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = listBookingsQuerySchema.parse(req.query);
      const result = await bookingsService.list(parsed);
      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: error.errors?.[0]?.message || 'Validation error',
            details: error.errors,
          },
        });
        return;
      }
      next(error);
    }
  }

  // ----------------------------------------------------------
  // GET /bookings/:id — Full detail
  // ----------------------------------------------------------
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await bookingsService.getById(id);
      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error?.status) {
        res.status(error.status).json({
          success: false,
          error: { code: error.code || 'BAD_REQUEST', message: error.message, ...(error.details ? { details: error.details } : {}) },
        });
        return;
      }
      next(error);
    }
  }

  // ----------------------------------------------------------
  // POST /bookings — Create
  // ----------------------------------------------------------
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;

      const parsed = createBookingSchema.parse(req.body);
      const result = await bookingsService.createBookingTransaction(parsed, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: error.errors?.[0]?.message || 'Validation error',
            details: error.errors,
          },
        });
        return;
      }
      if (error?.status) {
        res.status(error.status).json({
          success: false,
          error: { code: error.code || 'BAD_REQUEST', message: error.message, ...(error.details ? { details: error.details } : {}) },
        });
        return;
      }
      next(error);
    }
  }

  // ----------------------------------------------------------
  // PATCH /bookings/:id — Update
  // ----------------------------------------------------------
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const { id } = req.params;

      const parsed = updateBookingSchema.parse(req.body);
      const result = await bookingsService.update(id, parsed, userId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: error.errors?.[0]?.message || 'Validation error',
            details: error.errors,
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

  // ----------------------------------------------------------
  // DELETE /bookings/:id — Soft delete
  // ----------------------------------------------------------
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await bookingsService.softDelete(id);
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

  // ----------------------------------------------------------
  // POST /bookings/:id/cancel — Cancel booking
  // ----------------------------------------------------------
  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await bookingsService.cancelBooking(id);
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

export const bookingsController = new BookingsController();
