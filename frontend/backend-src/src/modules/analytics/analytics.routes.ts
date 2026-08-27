import { Router } from 'express';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import {
  getRevenueAnalytics,
  getProfitAnalytics,
  getCustomerAnalytics,
  getEquipmentAnalytics,
  getBookingAnalytics,
} from './analytics.controller';

const router: Router = Router();

// All analytics routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/analytics/revenue   - Revenue analytics for AI consumption
 * GET /api/v1/analytics/profit    - Profit analytics for AI consumption
 * GET /api/v1/analytics/customers - Customer analytics for AI consumption
 * GET /api/v1/analytics/equipment - Equipment analytics for AI consumption
 * GET /api/v1/analytics/bookings  - Booking analytics for AI consumption
 */
router.get('/revenue', requirePermission('reports.view'), getRevenueAnalytics);
router.get('/profit', requirePermission('reports.view'), getProfitAnalytics);
router.get('/customers', requirePermission('reports.view'), getCustomerAnalytics);
router.get('/equipment', requirePermission('reports.view'), getEquipmentAnalytics);
router.get('/bookings', requirePermission('reports.view'), getBookingAnalytics);

// GET /api/v1/analytics - Returns all analytics data (aggregated)
router.get('/', requirePermission('reports.view'), getRevenueAnalytics);

export default router;
