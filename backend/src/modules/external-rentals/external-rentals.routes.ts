import { Router } from 'express';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import {
  listExternalRentals,
  getExternalRentalById,
  createExternalRental,
  updateExternalRental,
  deleteExternalRental,
  getBookingRentalCosts,
} from './external-rentals.controller';

const router = Router();

// All external-rental routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/external-rentals
 * List external rentals with pagination, search, and filtering.
 */
router.get('/', requirePermission('suppliers.view'), listExternalRentals);

/**
 * GET /api/v1/external-rentals/booking/:bookingId/costs
 * Calculate external rental costs for a booking.
 */
router.get('/booking/:bookingId/costs', requirePermission('bookings.view'), getBookingRentalCosts);

/**
 * GET /api/v1/external-rentals/:id
 * Get an external rental by ID with supplier and booking details.
 */
router.get('/:id', requirePermission('suppliers.view'), getExternalRentalById);

/**
 * POST /api/v1/external-rentals
 * Create a new external rental.
 */
router.post('/', requirePermission('suppliers.create'), createExternalRental);

/**
 * PATCH /api/v1/external-rentals/:id
 * Update an existing external rental.
 */
router.patch('/:id', requirePermission('suppliers.update'), updateExternalRental);

/**
 * DELETE /api/v1/external-rentals/:id
 * Delete an external rental. Prevents deletion if rental is already returned.
 */
router.delete('/:id', requirePermission('suppliers.delete'), deleteExternalRental);

export default router;
