import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../modules/auth/auth.middleware';

/**
 * Wraps an async route handler and catches promise rejections.
 * Forwards errors to the Express error handler.
 */
export function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
  };
}
