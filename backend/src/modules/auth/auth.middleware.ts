import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { config } from '../../config';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    status: string;
    deletedAt: Date | null;
    role: {
      id: string;
      name: string;
      permissions: { id: string; name: string }[];
    };
  };
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' },
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    let payload: { sub: string };
    try {
      payload = jwt.verify(token, config.jwt.secret) as { sub: string };
    } catch {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        deletedAt: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found or inactive' },
      });
      return;
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requirePermission = (permissionName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const hasPermission = authReq.user.role.permissions.some(
      (p) => p.name === permissionName,
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Missing permission: ${permissionName}` },
      });
      return;
    }

    next();
  };
};
