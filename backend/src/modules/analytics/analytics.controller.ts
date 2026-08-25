import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { analyticsService, AnalyticsDateRange } from './analytics.service';

/**
 * Parse date range from query params.
 */
function parseRange(query: Record<string, string>): AnalyticsDateRange {
  const range: AnalyticsDateRange = {};
  if (query.fromDate) range.fromDate = new Date(query.fromDate);
  if (query.toDate) {
    const d = new Date(query.toDate);
    d.setHours(23, 59, 59, 999);
    range.toDate = d;
  }
  return range;
}

/**
 * GET /api/v1/analytics/revenue
 * Structured revenue analytics for AI agent consumption.
 * Query: fromDate, toDate
 */
export const getRevenueAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const range = parseRange(req.query as Record<string, string>);
    const data = await analyticsService.getRevenueAnalytics(range);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics/profit
 * Structured profit analytics for AI agent consumption.
 * Query: fromDate, toDate
 */
export const getProfitAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const range = parseRange(req.query as Record<string, string>);
    const data = await analyticsService.getProfitAnalytics(range);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics/customers
 * Structured customer analytics for AI agent consumption.
 * Query: fromDate, toDate
 */
export const getCustomerAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const range = parseRange(req.query as Record<string, string>);
    const data = await analyticsService.getCustomerAnalytics(range);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics/equipment
 * Structured equipment analytics for AI agent consumption.
 * Query: fromDate, toDate
 */
export const getEquipmentAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const range = parseRange(req.query as Record<string, string>);
    const data = await analyticsService.getEquipmentAnalytics(range);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics/bookings
 * Structured booking analytics for AI agent consumption.
 * Query: fromDate, toDate
 */
export const getBookingAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const range = parseRange(req.query as Record<string, string>);
    const data = await analyticsService.getBookingAnalytics(range);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
