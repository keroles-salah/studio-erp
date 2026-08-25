import { Router } from 'express';
import { invoicesController } from './invoices.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';

const router = Router();

/**
 * GET /api/v1/invoices
 * List invoices with filters (status, customerId, bookingId, overdue, search)
 */
router.get(
  '/',
  authenticate,
  requirePermission('invoices.view'),
  invoicesController.list.bind(invoicesController),
);

/**
 * GET /api/v1/invoices/:id
 * Get a single invoice with items, payments, customer, and booking details
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('invoices.view'),
  invoicesController.getById.bind(invoicesController),
);

/**
 * POST /api/v1/invoices
 * Create a new invoice with items
 */
router.post(
  '/',
  authenticate,
  requirePermission('invoices.create'),
  invoicesController.create.bind(invoicesController),
);

/**
 * PATCH /api/v1/invoices/:id
 * Update an existing invoice
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('invoices.update'),
  invoicesController.update.bind(invoicesController),
);

/**
 * GET /api/v1/invoices/:id/pdf
 * Get or generate invoice PDF (placeholder)
 */
router.get(
  '/:id/pdf',
  authenticate,
  requirePermission('invoices.view'),
  invoicesController.getPdf.bind(invoicesController),
);

/**
 * DELETE /api/v1/invoices/:id
 * Soft-delete a draft or cancelled invoice
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('invoices.delete'),
  invoicesController.delete.bind(invoicesController),
);

export default router;
