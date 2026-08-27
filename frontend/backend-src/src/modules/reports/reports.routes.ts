import { Router } from 'express';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import {
  getRevenueReport,
  getExpenseReport,
  getProfitReport,
  getBookingReport,
  getCustomerReport,
  getEquipmentReport,
  getEquipmentRentalReport,
  getOutstandingPaymentsReport,
  getPaymentHistoryReport,
  getServicePerformanceReport,
  getLeadConversionReport,
  getMarketingReport,
} from './reports.controller';

const router: Router = Router();

// All report routes require authentication
router.use(authenticate);

/**
 * Revenue & Financial Reports
 */
router.get('/revenue', requirePermission('reports.view'), getRevenueReport);
router.get('/expenses', requirePermission('reports.view'), getExpenseReport);
router.get('/profit', requirePermission('reports.view'), getProfitReport);

/**
 * Booking & Customer Reports
 */
router.get('/bookings', requirePermission('reports.view'), getBookingReport);
router.get('/customers', requirePermission('reports.view'), getCustomerReport);

/**
 * Equipment Reports
 */
router.get('/equipment', requirePermission('reports.view'), getEquipmentReport);
router.get('/equipment-rental', requirePermission('reports.view'), getEquipmentRentalReport);

/**
 * Payment Reports
 */
router.get('/outstanding-payments', requirePermission('reports.view'), getOutstandingPaymentsReport);
router.get('/payment-history', requirePermission('reports.view'), getPaymentHistoryReport);

/**
 * Performance Reports
 */
router.get('/service-performance', requirePermission('reports.view'), getServicePerformanceReport);
router.get('/lead-conversion', requirePermission('reports.view'), getLeadConversionReport);
router.get('/marketing', requirePermission('reports.view'), getMarketingReport);

export default router;
