import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { reportsService, DateRangeFilter } from './reports.service';

/**
 * GET /api/v1/reports/revenue
 * Revenue report grouped by day/week/month.
 * Query: fromDate, toDate, groupBy
 */
export const getRevenueReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await reportsService.getRevenueReport(
      req.query as unknown as DateRangeFilter,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/expenses
 * Expense report grouped by category.
 * Query: fromDate, toDate, groupBy
 */
export const getExpenseReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await reportsService.getExpenseReport(
      req.query as unknown as DateRangeFilter,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/profit
 * Profit report (revenue - expenses).
 * Query: fromDate, toDate, groupBy
 */
export const getProfitReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await reportsService.getProfitReport(
      req.query as unknown as DateRangeFilter,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/bookings
 * Booking report (count, value, by status, by service).
 * Query: fromDate, toDate, groupBy
 */
export const getBookingReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await reportsService.getBookingReport(
      req.query as unknown as DateRangeFilter,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/customers
 * Customer report (new customers, top customers, by source).
 * Query: fromDate, toDate, groupBy
 */
export const getCustomerReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await reportsService.getCustomerReport(
      req.query as unknown as DateRangeFilter,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/equipment
 * Equipment report (utilization, revenue, profit per item).
 * Query: fromDate, toDate, groupBy
 */
export const getEquipmentReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await reportsService.getEquipmentReport(
      req.query as unknown as DateRangeFilter,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/equipment-rental
 * External rental costs report.
 * Query: fromDate, toDate, groupBy
 */
export const getEquipmentRentalReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await reportsService.getEquipmentRentalReport(
      req.query as unknown as DateRangeFilter,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/outstanding-payments
 * Outstanding balances report.
 * Query: fromDate, toDate, groupBy
 */
export const getOutstandingPaymentsReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await reportsService.getOutstandingPaymentsReport(
      req.query as unknown as DateRangeFilter,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/payment-history
 * Payment history report.
 * Query: fromDate, toDate, groupBy
 */
export const getPaymentHistoryReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await reportsService.getPaymentHistoryReport(
      req.query as unknown as DateRangeFilter,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/service-performance
 * Revenue/profit per service report.
 * Query: fromDate, toDate, groupBy
 */
export const getServicePerformanceReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await reportsService.getServicePerformanceReport(
      req.query as unknown as DateRangeFilter,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/lead-conversion
 * Lead conversion stats report.
 * Query: fromDate, toDate, groupBy
 */
export const getLeadConversionReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await reportsService.getLeadConversionReport(
      req.query as unknown as DateRangeFilter,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/marketing
 * Marketing campaign performance report.
 * Query: fromDate, toDate, groupBy
 */
export const getMarketingReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await reportsService.getMarketingReport(
      req.query as unknown as DateRangeFilter,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
