import { z } from 'zod';

export const customerSourceEnum = z.enum([
  'WEBSITE',
  'TIKTOK',
  'SNAPCHAT',
  'INSTAGRAM',
  'FACEBOOK',
  'WHATSAPP',
  'REFERRAL',
  'WALK_IN',
  'OTHER',
]);

export const customerStatusEnum = z.enum([
  'LEAD',
  'ACTIVE',
  'PREVIOUS_CUSTOMER',
  'VIP',
  'INACTIVE',
]);

export const createCustomerSchema = z.object({
  fullName: z.string().min(1).max(255),
  phone: z.string().max(50).optional().nullable(),
  whatsapp: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  source: customerSourceEnum.default('OTHER'),
  customerStatus: customerStatusEnum.default('LEAD'),
  marketingOptIn: z.boolean().default(true),
});

export const updateCustomerSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional().nullable(),
  whatsapp: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  source: customerSourceEnum.optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  customerStatus: customerStatusEnum.optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  marketingOptIn: z.boolean().optional(),
});

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  source: customerSourceEnum.optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  customerStatus: customerStatusEnum.optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  status: customerStatusEnum.optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  sortBy: z
    .enum(['fullName', 'createdAt', 'updatedAt', 'customerStatus', 'source'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
