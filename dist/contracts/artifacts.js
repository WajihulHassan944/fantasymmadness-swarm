import { z } from 'zod';
import { verticalSchema } from './domain.js';
import { jobTypeSchema } from './job.js';
export const artifactTypeValues = [
    'content.article-draft',
    'content.match-preview-draft',
    'content.event-recap-draft',
    'content.profile-draft',
    'content.newsletter-draft',
    'content.homepage-feature',
    'content.content-update-suggestion',
    'content.calendar-plan',
    'content.topic-suggestions',
    'content.faq-draft',
    'content.how-to-play-draft',
    'content.landing-page-suggestion',
    'seo.audit-report',
    'seo.metadata-package',
    'seo.schema-markup',
    'seo.sitemap-refresh-plan',
    'seo.internal-link-plan',
    'seo.keyword-opportunity-report',
    'seo.technical-issue-report',
    'social.post-draft',
    'social.calendar-plan',
    'data.external-candidate',
    'data.trend-report',
    'data.calendar-refresh-plan',
    'wrestling.scorecard-suggestion',
    'wrestling.match-analysis',
    'wrestling.wrestler-profile',
    'analytics.report',
    'media.image-prompt',
    'notification.draft',
    'automation.control-plan',
    'system.health-check-result',
];
export const artifactTypeSchema = z.enum(artifactTypeValues);
export const reviewStatusSchema = z.enum(['DRAFT', 'AWAITING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED']);
export const provenanceSchema = z.object({
    provider: z.string().optional(),
    model: z.string().optional(),
    promptVersion: z.string().optional(),
    agentVersion: z.string().optional(),
    generatedAt: z.coerce.date().optional(),
    sources: z.array(z.object({
        label: z.string(),
        url: z.string().url().optional(),
        capturedAt: z.coerce.date().optional(),
    })).default([]),
}).passthrough();
export const createArtifactSchema = z.object({
    jobId: z.string().min(1),
    vertical: verticalSchema,
    jobType: jobTypeSchema,
    artifactType: artifactTypeSchema,
    title: z.string().min(1),
    summary: z.string().optional(),
    reviewStatus: reviewStatusSchema.default('AWAITING_REVIEW'),
    payload: z.record(z.unknown()),
    provenance: provenanceSchema.default({ sources: [] }),
    quality: z.object({
        score: z.number().min(0).max(100).optional(),
        warnings: z.array(z.string()).default([]),
    }).default({ warnings: [] }),
    metadata: z.record(z.unknown()).default({}),
});
