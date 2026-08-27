import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import {
  listExpensesQuerySchema,
  createExpenseSchema,
  updateExpenseSchema,
} from './expenses.dto';
import * as expensesService from './expenses.service';

// ── GET / - List expenses with filters ─────────────────
export async function listExpenses(req: AuthenticatedRequest, res: Response) {
  const parsed = listExpensesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const result = await expensesService.listExpenses(parsed.data);
  return res.json({ success: true, data: result });
}

// ── GET /:id ───────────────────────────────────────────
export async function getExpense(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    const expense = await expensesService.getExpenseById(id);
    return res.json({ success: true, data: expense });
  } catch (error: any) {
    if (error?.status === 404) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Expense not found' },
      });
    }
    throw error;
  }
}

// ── POST / ─────────────────────────────────────────────
export async function createExpense(req: AuthenticatedRequest, res: Response) {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const expense = await expensesService.createExpense(parsed.data, req.user!.id);
  return res.status(201).json({ success: true, data: expense });
}

// ── PATCH /:id ─────────────────────────────────────────
export async function updateExpense(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const parsed = updateExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const expense = await expensesService.updateExpense(id, parsed.data);
    return res.json({ success: true, data: expense });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }
    throw error;
  }
}

// ── DELETE /:id ────────────────────────────────────────
export async function deleteExpense(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    await expensesService.deleteExpense(id);
    return res.json({ success: true, data: { message: 'Expense deleted successfully' } });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }
    throw error;
  }
}

// ── GET /stats/by-category ─────────────────────────────
export async function getExpensesByCategory(req: AuthenticatedRequest, res: Response) {
  const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
  const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

  const result = await expensesService.getExpensesByCategory(dateFrom, dateTo);
  return res.json({ success: true, data: result });
}

// ── GET /stats/by-date-range ───────────────────────────
export async function getExpensesByDateRange(req: AuthenticatedRequest, res: Response) {
  const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
  const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

  if (!dateFrom || !dateTo) {
    return res.status(400).json({
      success: false,
      error: 'Both dateFrom and dateTo query parameters are required',
    });
  }

  const result = await expensesService.getExpensesByDateRange(dateFrom, dateTo);
  return res.json({ success: true, data: result });
}

// ── GET /booking/:bookingId ────────────────────────────
export async function getBookingExpenses(req: AuthenticatedRequest, res: Response) {
  const { bookingId } = req.params;
  const result = await expensesService.getBookingExpenses(bookingId);
  return res.json({ success: true, data: result });
}
