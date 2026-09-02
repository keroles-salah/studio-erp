import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────

export const ownershipTypeEnum = z.enum(['OWNED', 'RENTED']);

export const equipmentStatusEnum = z.enum([
  'AVAILABLE',
  'RESERVED',
  'IN_USE',
  'MAINTENANCE',
  'LOST',
  'DAMAGED',
  'UNAVAILABLE',
]);

// ─── Create ────────────────────────────────────────────────────────────

export const createEquipmentSchema = z.object({
  equipmentCode: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  brand: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
  quantity: z.number().int().min(1).max(999).default(1),
  ownershipType: ownershipTypeEnum.default('OWNED'),
  purchasePrice: z.number().nonnegative().optional().nullable(),
  rentalCost: z.number().nonnegative().optional().nullable(),
  rentalPrice: z.number().nonnegative().optional().nullable(),
  status: equipmentStatusEnum.default('AVAILABLE'),
  location: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

// ─── Update ───────────────────────────────────────────────────────────

export const updateEquipmentSchema = z.object({
  equipmentCode: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(255).optional(),
  category: z.string().min(1).max(100).optional(),
  brand: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
  quantity: z.number().int().min(1).max(999).optional(),
  ownershipType: ownershipTypeEnum.optional(),
  purchasePrice: z.number().nonnegative().optional().nullable(),
  rentalCost: z.number().nonnegative().optional().nullable(),
  rentalPrice: z.number().nonnegative().optional().nullable(),
  status: equipmentStatusEnum.optional(),
  location: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

// ─── List Query ───────────────────────────────────────────────────────

export const listEquipmentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  status: equipmentStatusEnum.optional(),
  ownershipType: ownershipTypeEnum.optional(),
  sortBy: z
    .enum(['name', 'equipmentCode', 'category', 'createdAt', 'updatedAt', 'status'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Availability Query ───────────────────────────────────────────────

export const availabilityQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  equipmentId: z.string().uuid().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type ListEquipmentQuery = z.infer<typeof listEquipmentQuerySchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
