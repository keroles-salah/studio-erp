import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────

export const supplierStatusEnum = z.enum(['ACTIVE', 'INACTIVE']);

// ─── Create ────────────────────────────────────────────────────────────

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().max(50).optional().nullable(),
  whatsapp: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().optional().nullable(),
  status: supplierStatusEnum.default('ACTIVE'),
});

// ─── Update ───────────────────────────────────────────────────────────

export const updateSupplierSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional().nullable(),
  whatsapp: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().optional().nullable(),
  status: supplierStatusEnum.optional(),
});

// ─── List Query ───────────────────────────────────────────────────────

export const listSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: supplierStatusEnum.optional(),
  sortBy: z
    .enum(['name', 'createdAt', 'updatedAt', 'status'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Types ────────────────────────────────────────────────────────────

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
