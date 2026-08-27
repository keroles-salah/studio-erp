import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  basePrice: z.number().nonnegative(),
  cost: z.number().nonnegative().optional().default(0),
  taxRate: z.number().min(0).max(100).optional().default(0),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional().default('ACTIVE'),
});

export const updateServiceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  basePrice: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
