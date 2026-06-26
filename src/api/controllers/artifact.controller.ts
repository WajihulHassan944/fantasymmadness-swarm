import { z } from 'zod';
import type { Request, Response } from 'express';
import { getArtifactById, listArtifacts, reviewArtifact } from '../../services/artifact.service.js';
import { reviewStatusSchema } from '../../contracts/artifacts.js';

const listArtifactsQuerySchema = z.object({
  vertical: z.string().optional(),
  artifactType: z.string().optional(),
  reviewStatus: reviewStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const reviewArtifactBodySchema = z.object({
  reviewStatus: reviewStatusSchema,
  reviewedBy: z.record(z.unknown()).optional(),
  reason: z.string().optional(),
});

export async function listArtifactsHandler(req: Request, res: Response): Promise<void> {
  const query = listArtifactsQuerySchema.parse(req.query);
  const result = await listArtifacts(query);
  res.json({
    ok: true,
    items: result.items.map(serializeArtifact),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: Math.ceil(result.total / result.limit),
    },
    requestId: req.requestId,
  });
}

export async function getArtifactHandler(req: Request, res: Response): Promise<void> {
  const artifact = await getArtifactById(req.params.artifactId);
  res.json({ ok: true, artifact: serializeArtifact(artifact), requestId: req.requestId });
}

export async function reviewArtifactHandler(req: Request, res: Response): Promise<void> {
  const body = reviewArtifactBodySchema.parse(req.body);
  const artifact = await reviewArtifact({ artifactId: req.params.artifactId, ...body });
  res.json({ ok: true, artifact: serializeArtifact(artifact), requestId: req.requestId });
}

export function serializeArtifact(artifact: any): Record<string, unknown> {
  return {
    artifactId: artifact.artifactId,
    jobId: artifact.jobId,
    vertical: artifact.vertical,
    jobType: artifact.jobType,
    artifactType: artifact.artifactType,
    title: artifact.title,
    summary: artifact.summary,
    reviewStatus: artifact.reviewStatus,
    payload: artifact.payload,
    provenance: artifact.provenance,
    quality: artifact.quality,
    reviewedBy: artifact.reviewedBy,
    reviewedAt: artifact.reviewedAt,
    reviewReason: artifact.reviewReason,
    metadata: artifact.metadata,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
  };
}
