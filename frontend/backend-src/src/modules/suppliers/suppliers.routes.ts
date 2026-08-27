import { Router } from 'express';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from './suppliers.controller';

const router = Router();

// All supplier routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/suppliers
 * List suppliers with pagination, search, and filtering.
 */
router.get('/', requirePermission('suppliers.view'), listSuppliers);

/**
 * GET /api/v1/suppliers/:id
 * Get a supplier by ID with their external rentals.
 */
router.get('/:id', requirePermission('suppliers.view'), getSupplierById);

/**
 * POST /api/v1/suppliers
 * Create a new supplier.
 */
router.post('/', requirePermission('suppliers.create'), createSupplier);

/**
 * PATCH /api/v1/suppliers/:id
 * Update an existing supplier.
 */
router.patch('/:id', requirePermission('suppliers.update'), updateSupplier);

/**
 * DELETE /api/v1/suppliers/:id
 * Delete a supplier. Prevents deletion if supplier has active external rentals.
 */
router.delete('/:id', requirePermission('suppliers.delete'), deleteSupplier);

export default router;
