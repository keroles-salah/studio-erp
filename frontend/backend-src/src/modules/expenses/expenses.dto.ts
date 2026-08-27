import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────
export const expenseCategoryEnum = z.enum([
  'EQUIPMENT_RENTAL',
  'MAINTENANCE',
  'TRANSPORTATION',
  'STAFF',
  'MARKETING',
  'STUDIO_RENT',
  'UTILITIES',
  'OTHER',
]);

export const paymentMethodEnum = z.enum([
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'CHEQUE',
  'OTHER',
]);

// ── Create Expense ─────────────────────────────────────
export const createExpenseSchema = z.object({
  category: expenseCategoryEnum,
  description: z.string().min(1, 'Description is required').max(1000),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  expenseDate: z.coerce.date(),
  supplier: z.string().max(200).optional().or(z.literal('')),
  bookingId: z.string().uuid().optional(),
  paymentMethod: paymentMethodEnum.default('CASH'),
  notes: z.string().max(5000).optional().or(z.literal('')),
});

// ── Update Expense ─────────────────────────────────────
export const updateExpenseSchema = z.object({
  category: expenseCategoryEnum.optional(),
  description: z.string().min(1).max(1000).optional(),
  amount: z.number().min(0.01).optional(),
  expenseDate: z.coerce.date().optional(),
  supplier: z.string().max(200).optional().or(z.literal('')),
  bookingId: z.string().uuid().optional(),
  paymentMethod: paymentMethodEnum.optional(),
  notes: z.string().max(5000).optional().or(z.literal('')),
});

// ── List Query ─────────────────────────────────────────
export const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: expenseCategoryEnum.optional().or(z.literal('')).transform((v) => (v === '' ? undefined : v)),
  bookingId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
  sortBy: z.string().max(50).default('expenseDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ── Types ──────────────────────────────────────────────
export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;
export type ListExpensesQueryDto = z.infer<typeof listExpensesQuerySchema>;
