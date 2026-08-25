import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';

const router = Router();

/**
 * GET /api/v1/payments
 * List payments with filters (invoiceId, bookingId, customerId, paymentMethod, date range)
 */
router.get(
  '/',
  authenticate,
  requirePermission('payments.view'),
  paymentsController.list.bind(paymentsController),
);

/**
 * GET /api/v1/payments/:id
 * Get a single payment with invoice, booking, customer, and receiver details
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('payments.view'),
  paymentsController.getById.bind(paymentsController),
);

/**
 * POST /api/v1/payments
 * Record a new payment (transactional: updates invoice + booking amounts)
 */
router.post(
  '/',
  authenticate,
  requirePermission('payments.create'),
  paymentsController.create.bind(paymentsController),
);

/**
 * DELETE /api/v1/payments/:id
 * Void a payment (transactional: reverses invoice + booking amounts, deletes payment)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('payments.delete'),
  paymentsController.void.bind(paymentsController),
);

export default router;
