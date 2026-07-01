import { z } from 'zod';
import { requestedBySchema, sourceEntitySchema, swarmModeSchema, verticalSchema } from './domain.js';

export const campaignTypeValues = [
  'fight_full_campaign',
  'fight_tonight_campaign',
  'fight_result_campaign',
  'boxing_fight_campaign',
  'pro_wrestling_match_campaign',
  'blog_promotion_campaign',
  'contest_promotion_campaign',
  'july_10000_signup_growth_system',
  'custom_campaign',
] as const;

export const campaignTypeSchema = z.enum(campaignTypeValues);
export type CampaignType = z.infer<typeof campaignTypeSchema>;

export const campaignStatusSchema = z.enum([
  'created',
  'queued',
  'running',
  'awaiting_review',
  'completed',
  'partially_failed',
  'failed',
  'cancelled',
]);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

export const combatSportSchema = z.enum(['mma', 'boxing', 'kickboxing', 'combat', 'pro_wrestling']).default('mma');
export type CombatSport = z.infer<typeof combatSportSchema>;

export const campaignSectionSchema = z.enum(['content', 'seo', 'social', 'media', 'analytics', 'notification', 'data', 'admin']);
export type CampaignSection = z.infer<typeof campaignSectionSchema>;

export const createCampaignSchema = z.object({
  campaignType: campaignTypeSchema,
  title: z.string().min(1).max(200).optional(),
  vertical: verticalSchema.optional(),
  sport: combatSportSchema.optional(),
  mode: swarmModeSchema.default('APPROVAL_REQUIRED'),
  priority: z.coerce.number().int().min(0).max(100).default(70),
  requestedBy: requestedBySchema.default({ source: 'backend' }),
  sourceEntity: sourceEntitySchema,
  input: z.record(z.unknown()).default({}),
  sections: z.array(campaignSectionSchema).optional(),
  automationKeys: z.array(z.string().min(1)).optional(),
  includeAll: z.boolean().default(false),
  force: z.boolean().default(false),
  callbackUrl: z.string().url().optional(),
  backendCorrelationId: z.string().optional(),
  idempotencyKey: z.string().min(8).max(200).optional(),
  metadata: z.record(z.unknown()).default({}),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const listCampaignsQuerySchema = z.object({
  status: campaignStatusSchema.optional(),
  campaignType: campaignTypeSchema.optional(),
  vertical: verticalSchema.optional(),
  sport: combatSportSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
