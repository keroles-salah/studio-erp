import { z } from 'zod';

// ─── Enums ───────────────────────────────────────────────────

export const paymentMethodEnum = z.enum([
  'CASH',
  'BANK_TRANSFER',
  'CARD',
  'ONLINE_PAYMENT',
  'OTHER',
]);

// ─── Create Payment ──────────────────────────────────────────

export const createPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  bookingId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  amount: z.number().positive('Payment amount must be positive'),
  paymentMethod: z.string().min(1, 'Payment method is required').max(50),
  paymentDate: z.coerce.date().default(() => new Date()),
  referenceNumber: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
  overrideBalanceCheck: z.boolean().default(false),
});

// ─── List Payments Query ─────────────────────────────────────

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  invoiceId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  paymentMethod: z.string().max(50).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sortBy: z
    .enum(['paymentDate', 'amount', 'createdAt', 'paymentMethod'])
    .default('paymentDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Types ───────────────────────────────────────────────────

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
