import { Router } from 'express';
import {
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  getExpensesByDateRange,
  getBookingExpenses,
} from './expenses.controller';
import { authenticate as authMiddleware, requirePermission } from '../auth/auth.middleware';

const router = Router();

// All expense routes require authentication
router.use(authMiddleware);

// Stats routes (must be before /:id to avoid conflict)
router.get('/stats/by-category', requirePermission('expenses.view'), getExpensesByCategory);
router.get('/stats/by-date-range', requirePermission('expenses.view'), getExpensesByDateRange);
router.get('/booking/:bookingId', requirePermission('expenses.view'), getBookingExpenses);

// CRUD
router.get('/', requirePermission('expenses.view'), listExpenses);
router.get('/:id', requirePermission('expenses.view'), getExpense);
router.post('/', requirePermission('expenses.create'), createExpense);
router.patch('/:id', requirePermission('expenses.update'), updateExpense);
router.delete('/:id', requirePermission('expenses.delete'), deleteExpense);

export default router;
