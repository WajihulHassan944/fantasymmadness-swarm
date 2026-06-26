import { z } from 'zod';
import { verticalSchema } from './domain.js';
import { jobTypeSchema } from './job.js';

export const artifactTypeSchema = z.enum([
  'content.article-draft',
  'content.match-preview-draft',
  'content.event-recap-draft',
  'seo.audit-report',
  'social.post-draft',
  'data.external-candidate',
  'wrestling.scorecard-suggestion',
  'wrestling.match-analysis',
  'wrestling.wrestler-profile',
  'system.health-check-result',
]);
export type ArtifactType = z.infer<typeof artifactTypeSchema>;

export const reviewStatusSchema = z.enum(['DRAFT', 'AWAITING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED']);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

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
export type CreateArtifactInput = z.infer<typeof createArtifactSchema>;
