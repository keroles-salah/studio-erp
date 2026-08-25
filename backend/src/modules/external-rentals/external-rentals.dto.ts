import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────

export const externalRentalStatusEnum = z.enum([
  'PENDING',
  'CONFIRMED',
  'RETURNED',
  'CANCELLED',
]);

// ─── Create ────────────────────────────────────────────────────────────

export const createExternalRentalSchema = z.object({
  supplierId: z.string().uuid(),
  bookingId: z.string().uuid(),
  equipmentName: z.string().min(1).max(255),
  quantity: z.number().int().min(1).default(1),
  rentalCost: z.number().nonnegative(),
  rentalStart: z.coerce.date(),
  rentalEnd: z.coerce.date().optional().nullable(),
  status: externalRentalStatusEnum.default('PENDING'),
  notes: z.string().optional().nullable(),
});

// ─── Update ───────────────────────────────────────────────────────────

export const updateExternalRentalSchema = z.object({
  supplierId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  equipmentName: z.string().min(1).max(255).optional(),
  quantity: z.number().int().min(1).optional(),
  rentalCost: z.number().nonnegative().optional(),
  rentalStart: z.coerce.date().optional(),
  rentalEnd: z.coerce.date().optional().nullable(),
  status: externalRentalStatusEnum.optional(),
  notes: z.string().optional().nullable(),
});

// ─── List Query ───────────────────────────────────────────────────────

export const listExternalRentalsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  status: externalRentalStatusEnum.optional(),
  sortBy: z
    .enum(['equipmentName', 'rentalStart', 'rentalCost', 'createdAt', 'status'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Types ────────────────────────────────────────────────────────────

export type CreateExternalRentalInput = z.infer<typeof createExternalRentalSchema>;
export type UpdateExternalRentalInput = z.infer<typeof updateExternalRentalSchema>;
export type ListExternalRentalsQuery = z.infer<typeof listExternalRentalsQuerySchema>;
