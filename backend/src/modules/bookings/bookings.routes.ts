import { Router } from 'express';
import { bookingsController } from './bookings.controller';
import { authenticate, requirePermission } from '../auth/auth.middleware';

const router = Router();

/**
 * GET /api/v1/bookings
 * List bookings with pagination and filters.
 * Query: page, limit, search, status, customerId, eventDateFrom, eventDateTo, sortBy, sortOrder
 */
router.get('/', authenticate, requirePermission('bookings.view'), bookingsController.list.bind(bookingsController));
router.get('/:id', authenticate, requirePermission('bookings.view'), bookingsController.getById.bind(bookingsController));
router.post('/', authenticate, requirePermission('bookings.create'), bookingsController.create.bind(bookingsController));
router.patch('/:id', authenticate, requirePermission('bookings.update'), bookingsController.update.bind(bookingsController));
router.delete('/:id', authenticate, requirePermission('bookings.delete'), bookingsController.delete.bind(bookingsController));
router.post('/:id/cancel', authenticate, requirePermission('bookings.update'), bookingsController.cancel.bind(bookingsController));

export default router;
