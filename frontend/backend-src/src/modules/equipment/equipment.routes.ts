import { Router } from 'express';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import {
  listEquipment,
  checkAvailability,
  getEquipmentStats,
  getMostProfitableEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
} from './equipment.controller';

const router = Router();

// All equipment routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/equipment
 * List equipment with filters: category, status, ownershipType, search.
 */
router.get('/', requirePermission('equipment.view'), listEquipment);

/**
 * GET /api/v1/equipment/availability
 * Check equipment availability for a date range.
 * Query: startDate, endDate, equipmentId (optional)
 */
router.get('/availability', requirePermission('equipment.view'), checkAvailability);

/**
 * GET /api/v1/equipment/stats
 * Get equipment statistics (count by status, category, ownership type).
 */
router.get('/stats', requirePermission('equipment.view'), getEquipmentStats);

/**
 * GET /api/v1/equipment/most-profitable
 * Get the most profitable equipment by total revenue.
 * Query: limit (optional, default 10, max 50)
 */
router.get('/most-profitable', requirePermission('equipment.view'), getMostProfitableEquipment);

/**
 * GET /api/v1/equipment/:id
 * Get a single equipment by ID with its booking history.
 */
router.get('/:id', requirePermission('equipment.view'), getEquipmentById);

/**
 * POST /api/v1/equipment
 * Create new equipment.
 */
router.post('/', requirePermission('equipment.create'), createEquipment);

/**
 * PATCH /api/v1/equipment/:id
 * Update existing equipment.
 */
router.patch('/:id', requirePermission('equipment.update'), updateEquipment);

/**
 * DELETE /api/v1/equipment/:id
 * Soft-delete equipment.
 */
router.delete('/:id', requirePermission('equipment.delete'), deleteEquipment);

export default router;
