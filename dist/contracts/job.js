import { z } from 'zod';
import { requestedBySchema, sourceEntitySchema, swarmModeSchema, verticalSchema } from './domain.js';
export const jobStatusSchema = z.enum([
    'queued',
    'running',
    'retry_pending',
    'awaiting_review',
    'approved',
    'published',
    'rejected',
    'succeeded',
    'failed',
    'dead_letter',
    'cancelled',
]);
export const jobTypeSchema = z.enum([
    'content.article',
    'content.match-preview',
    'content.event-recap',
    'seo.audit',
    'social.draft',
    'data.external-candidate',
    'wrestling.scorecard-suggestion',
    'wrestling.match-analysis',
    'wrestling.wrestler-profile',
    'system.health-check',
]);
export const createJobSchema = z.object({
    vertical: verticalSchema,
    jobType: jobTypeSchema,
    mode: swarmModeSchema.default('DRAFT_ONLY'),
    priority: z.coerce.number().int().min(0).max(100).default(50),
    idempotencyKey: z.string().min(8).max(200).optional(),
    requestedBy: requestedBySchema.default({ source: 'backend' }),
    sourceEntity: sourceEntitySchema,
    input: z.record(z.unknown()).default({}),
    callbackUrl: z.string().url().optional(),
    backendCorrelationId: z.string().optional(),
    scheduledAt: z.coerce.date().optional(),
    maxAttempts: z.coerce.number().int().min(1).max(10).optional(),
    metadata: z.record(z.unknown()).default({}),
});
export const listJobsQuerySchema = z.object({
    status: jobStatusSchema.optional(),
    vertical: verticalSchema.optional(),
    jobType: jobTypeSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
});
