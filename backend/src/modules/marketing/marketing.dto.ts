import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────
export const campaignStatusEnum = z.enum([
  'DRAFT',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const recipientStatusEnum = z.enum([
  'PENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'OPTED_OUT',
]);

// ── Segment Rule Operator ──────────────────────────────
export const segmentRuleTypeEnum = z.enum([
  'spent_more_than',
  'spent_less_than',
  'booked_service',
  'not_booked_in_months',
  'upcoming_anniversary',
  'vip',
  'from_city',
  'from_source',
]);

export const segmentRuleSchema = z.object({
  type: segmentRuleTypeEnum,
  value: z.union([z.string(), z.number()]).optional(),
});

export const segmentRulesSchema = z.object({
  match: z.enum(['ALL', 'ANY']).default('ALL'),
  rules: z.array(segmentRuleSchema).min(1, 'At least one rule is required'),
});

// ── Create Campaign ────────────────────────────────────
export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200),
  message: z.string().min(1, 'Message is required').max(5000),
  targetSegment: z.string().max(200).optional().or(z.literal('')),
  segmentRules: segmentRulesSchema,
  scheduledAt: z.coerce.date().optional(),
  status: campaignStatusEnum.default('DRAFT'),
});

// ── Update Campaign ────────────────────────────────────
export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(5000).optional(),
  targetSegment: z.string().max(200).optional().or(z.literal('')),
  segmentRules: segmentRulesSchema.optional(),
  scheduledAt: z.coerce.date().optional(),
  status: campaignStatusEnum.optional(),
});

// ── List Query ─────────────────────────────────────────
export const listCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: campaignStatusEnum.optional(),
  sortBy: z.string().max(50).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ── Send Campaign ──────────────────────────────────────
export const sendCampaignSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
});

// ── Types ──────────────────────────────────────────────
export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignDto = z.infer<typeof updateCampaignSchema>;
export type ListCampaignsQueryDto = z.infer<typeof listCampaignsQuerySchema>;
export type SegmentRuleDto = z.infer<typeof segmentRuleSchema>;
export type SegmentRulesDto = z.infer<typeof segmentRulesSchema>;
