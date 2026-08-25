import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { suppliersService } from './suppliers.service';
import {
  createSupplierSchema,
  updateSupplierSchema,
  listSuppliersQuerySchema,
} from './suppliers.dto';

/**
 * GET /suppliers
 * List suppliers with pagination, search, and filtering.
 */
export const listSuppliers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = listSuppliersQuerySchema.safeParse(req.query);
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

    const result = await suppliersService.list(parsed.data);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /suppliers/:id
 * Get a supplier by ID with their external rentals.
 */
export const getSupplierById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const supplier = await suppliersService.getById(id);

    if (!supplier) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Supplier not found' },
      });
      return;
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /suppliers
 * Create a new supplier.
 */
export const createSupplier = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = createSupplierSchema.safeParse(req.body);
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

    const supplier = await suppliersService.create(parsed.data);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /suppliers/:id
 * Update an existing supplier.
 */
export const updateSupplier = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = updateSupplierSchema.safeParse(req.body);
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

    const supplier = await suppliersService.update(id, parsed.data);
    if (!supplier) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Supplier not found' },
      });
      return;
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /suppliers/:id
 * Delete a supplier. Prevents deletion if supplier has active external rentals.
 */
export const deleteSupplier = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const supplier = await suppliersService.delete(id);

    if (!supplier) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Supplier not found' },
      });
      return;
    }

    res.json({ success: true, data: { id: supplier.id, deleted: true } });
  } catch (error: any) {
    if (error?.status === 409) {
      res.status(409).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    next(error);
  }
};
