import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { equipmentService } from './equipment.service';
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  listEquipmentQuerySchema,
  availabilityQuerySchema,
} from './equipment.dto';

/**
 * GET /equipment
 * List equipment with filters: category, status, ownershipType, search.
 */
export const listEquipment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = listEquipmentQuerySchema.safeParse(req.query);
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

    const result = await equipmentService.list(parsed.data);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /equipment/availability
 * Check equipment availability for a date range.
 */
export const checkAvailability = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = availabilityQuerySchema.safeParse(req.query);
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

    const result = await equipmentService.checkAvailability(parsed.data);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /equipment/stats
 * Get equipment statistics (count by status, category, ownership type).
 */
export const getEquipmentStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await equipmentService.getEquipmentStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /equipment/most-profitable
 * Get the most profitable equipment by total revenue.
 */
export const getMostProfitableEquipment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = req.query.limit
      ? Math.min(Number(req.query.limit), 50)
      : 10;
    const result = await equipmentService.getMostProfitableEquipment(limit);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /equipment/:id
 * Get a single equipment by ID with its booking history.
 */
export const getEquipmentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const equipment = await equipmentService.getById(id);

    if (!equipment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Equipment not found' },
      });
      return;
    }

    res.json({ success: true, data: equipment });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /equipment
 * Create new equipment.
 */
export const createEquipment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = createEquipmentSchema.safeParse(req.body);
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

    const equipment = await equipmentService.create(parsed.data);
    res.status(201).json({ success: true, data: equipment });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /equipment/:id
 * Update existing equipment.
 */
export const updateEquipment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = updateEquipmentSchema.safeParse(req.body);
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

    const equipment = await equipmentService.update(id, parsed.data);
    if (!equipment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Equipment not found' },
      });
      return;
    }

    res.json({ success: true, data: equipment });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /equipment/:id
 * Soft-delete equipment.
 */
export const deleteEquipment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const equipment = await equipmentService.softDelete(id);

    if (!equipment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Equipment not found' },
      });
      return;
    }

    res.json({ success: true, data: { id: equipment.id, deletedAt: equipment.deletedAt } });
  } catch (error) {
    next(error);
  }
};
