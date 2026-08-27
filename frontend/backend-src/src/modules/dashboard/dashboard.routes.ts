import { Router } from 'express';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { getDashboardData } from './dashboard.controller';

const router: Router = Router();

// All dashboard routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/dashboard - Returns all dashboard data
 */
router.get('/', requirePermission('bookings.view'), getDashboardData);

export default router;
