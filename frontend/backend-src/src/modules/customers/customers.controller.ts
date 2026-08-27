import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { customersService } from './customers.service';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
} from './customers.dto';

/**
 * GET /customers
 * List customers with pagination, search, filtering, and sorting.
 */
export const listCustomers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = listCustomersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const result = await customersService.list(parsed.data);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /customers/:id
 * Get a customer's full profile with financials, bookings, communications,
 * and marketing history.
 */
export const getCustomerProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const customer = await customersService.getProfile(id);

    if (!customer) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Customer not found' },
      });
      return;
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /customers
 * Create a new customer.
 */
export const createCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = createCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const customer = await customersService.create(parsed.data, userId);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /customers/:id
 * Update an existing customer.
 */
export const updateCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = updateCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const customer = await customersService.update(id, parsed.data);
    if (!customer) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Customer not found' },
      });
      return;
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /customers/:id
 * Soft-delete a customer.
 */
export const deleteCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const customer = await customersService.softDelete(id);

    if (!customer) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Customer not found' },
      });
      return;
    }

    res.json({ success: true, data: { id: customer.id, deletedAt: customer.deletedAt } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /customers/:id/communications
 * Get customer communication history.
 */
export const getCustomerCommunications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const communications = await customersService.getCommunications(id);

    if (communications === null) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Customer not found' },
      });
      return;
    }

    res.json({ success: true, data: communications });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /customers/:id/marketing
 * Get customer marketing campaign history.
 */
export const getCustomerMarketing = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const marketing = await customersService.getMarketingHistory(id);

    if (marketing === null) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Customer not found' },
      });
      return;
    }

    res.json({ success: true, data: marketing });
  } catch (error) {
    next(error);
  }
};
