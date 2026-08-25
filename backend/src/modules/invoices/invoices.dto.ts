import { z } from 'zod';

// ─── Enums ───────────────────────────────────────────────────

export const invoiceStatusEnum = z.enum([
  'DRAFT',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
]);

export const invoiceItemTypeEnum = z.enum([
  'SERVICE',
  'EQUIPMENT',
  'RENTAL',
  'ADDITIONAL_CHARGE',
  'DISCOUNT',
]);

export const paymentMethodEnum = z.enum([
  'CASH',
  'BANK_TRANSFER',
  'CARD',
  'ONLINE_PAYMENT',
  'OTHER',
]);

// ─── Invoice Item Schema ─────────────────────────────────────

export const createInvoiceItemSchema = z.object({
  description: z.string().min(1).max(500),
  itemType: invoiceItemTypeEnum,
  referenceId: z.string().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  total: z.number().min(0),
});

// ─── Create Invoice ──────────────────────────────────────────

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  bookingId: z.string().uuid().optional().nullable(),
  invoiceDate: z.coerce.date().default(() => new Date()),
  dueDate: z.coerce.date().optional().nullable(),
  // subtotal / tax / total are computed server-side from items + studio settings
  discount: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  items: z.array(createInvoiceItemSchema).min(1),
});

// ─── Update Invoice ──────────────────────────────────────────

export const updateInvoiceSchema = z.object({
  customerId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional().nullable(),
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional().nullable(),
  // subtotal / tax / total are computed server-side; discount triggers recompute
  discount: z.number().min(0).optional(),
  status: invoiceStatusEnum.optional(),
  notes: z.string().optional().nullable(),
  pdfPath: z.string().optional().nullable(),
});

// ─── List Invoices Query ─────────────────────────────────────

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: invoiceStatusEnum.optional().or(z.literal('')).transform((v) => (v === '' ? undefined : v)),
  customerId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  overdue: z.coerce.boolean().optional(),
  sortBy: z
    .enum(['invoiceNumber', 'invoiceDate', 'dueDate', 'total', 'status', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Types ───────────────────────────────────────────────────

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type CreateInvoiceItemInput = z.infer<typeof createInvoiceItemSchema>;
