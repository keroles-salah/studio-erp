import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { externalRentalsService } from './external-rentals.service';
import {
  createExternalRentalSchema,
  updateExternalRentalSchema,
  listExternalRentalsQuerySchema,
} from './external-rentals.dto';

/**
 * GET /external-rentals
 * List external rentals with pagination, search, and filtering.
 */
export const listExternalRentals = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = listExternalRentalsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const result = await externalRentalsService.list(parsed.data);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /external-rentals/:id
 * Get an external rental by ID with supplier and booking details.
 */
export const getExternalRentalById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const rental = await externalRentalsService.getById(id);

    if (!rental) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'External rental not found' },
      });
      return;
    }

    res.json({ success: true, data: rental });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /external-rentals
 * Create a new external rental.
 */
export const createExternalRental = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = createExternalRentalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const rental = await externalRentalsService.create(parsed.data);
    res.status(201).json({ success: true, data: rental });
  } catch (error: any) {
    if (error?.status) {
      res.status(error.status).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    next(error);
  }
};

/**
 * PATCH /external-rentals/:id
 * Update an existing external rental.
 */
export const updateExternalRental = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = updateExternalRentalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const rental = await externalRentalsService.update(id, parsed.data);
    if (!rental) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'External rental not found' },
      });
      return;
    }

    res.json({ success: true, data: rental });
  } catch (error: any) {
    if (error?.status) {
      res.status(error.status).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    next(error);
  }
};

/**
 * DELETE /external-rentals/:id
 * Delete an external rental. Prevents deletion if rental is already returned.
 */
export const deleteExternalRental = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const rental = await externalRentalsService.delete(id);

    if (!rental) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'External rental not found' },
      });
      return;
    }

    res.json({ success: true, data: { id: rental.id, deleted: true } });
  } catch (error: any) {
    if (error?.status) {
      res.status(error.status).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    next(error);
  }
};

/**
 * GET /external-rentals/booking/:bookingId/costs
 * Calculate external rental costs for a booking.
 */
export const getBookingRentalCosts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const result = await externalRentalsService.calculateBookingRentalCosts(bookingId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
