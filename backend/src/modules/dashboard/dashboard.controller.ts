import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { dashboardService } from './dashboard.service';

/**
 * GET /api/v1/dashboard
 * Returns all dashboard data: top cards, charts, recent activity, and summaries.
 */
export const getDashboardData = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await dashboardService.getDashboardData();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
