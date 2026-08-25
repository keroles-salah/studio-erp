import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { search } from './search.controller';

const router = Router();

/**
 * GET /api/v1/search?q=...
 * Global search across customers, bookings, invoices, leads, and equipment.
 */
router.get('/', authenticate, search);

export default router;
