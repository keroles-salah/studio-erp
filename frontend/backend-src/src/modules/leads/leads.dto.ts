import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────
export const leadStatusEnum = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'CONVERTED',
  'LOST',
]);

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

// ── Create Lead ────────────────────────────────────────
export const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  phone: z.string().min(1, 'Phone is required').max(50),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  whatsapp: z.string().max(50).optional().or(z.literal('')),
  source: customerSourceEnum,
  interestedService: z.string().max(200).optional().or(z.literal('')),
  eventDate: z.coerce.date().optional(),
  budget: z.number().min(0).optional(),
  status: leadStatusEnum.default('NEW'),
  notes: z.string().max(5000).optional().or(z.literal('')),
  assignedToId: z.string().uuid().optional(),
  utmSource: z.string().max(200).optional().or(z.literal('')),
  utmMedium: z.string().max(200).optional().or(z.literal('')),
  utmCampaign: z.string().max(200).optional().or(z.literal('')),
  utmContent: z.string().max(200).optional().or(z.literal('')),
});

// ── Update Lead ────────────────────────────────────────
export const updateLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().min(1).max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp: z.string().max(50).optional().or(z.literal('')),
  source: customerSourceEnum.optional(),
  interestedService: z.string().max(200).optional().or(z.literal('')),
  eventDate: z.coerce.date().optional(),
  budget: z.number().min(0).optional(),
  status: leadStatusEnum.optional(),
  notes: z.string().max(5000).optional().or(z.literal('')),
  assignedToId: z.string().uuid().optional(),
  utmSource: z.string().max(200).optional().or(z.literal('')),
  utmMedium: z.string().max(200).optional().or(z.literal('')),
  utmCampaign: z.string().max(200).optional().or(z.literal('')),
  utmContent: z.string().max(200).optional().or(z.literal('')),
});

// ── List Query ─────────────────────────────────────────
export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: leadStatusEnum.optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  source: customerSourceEnum.optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  assignedTo: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.string().max(50).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ── Types ──────────────────────────────────────────────
export type CreateLeadDto = z.infer<typeof createLeadSchema>;
export type UpdateLeadDto = z.infer<typeof updateLeadSchema>;
export type ListLeadsQueryDto = z.infer<typeof listLeadsQuerySchema>;
