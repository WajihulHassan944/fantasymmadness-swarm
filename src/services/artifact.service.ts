import type { FilterQuery } from 'mongoose';
import { createArtifactSchema, type CreateArtifactInput, type ReviewStatus } from '../contracts/artifacts.js';
import { SwarmArtifact, type SwarmArtifactDocument } from '../models/artifact.model.js';
import { SwarmJob } from '../models/job.model.js';
import { AppError } from '../utils/errors.js';

export async function createArtifact(input: CreateArtifactInput): Promise<SwarmArtifactDocument> {
  const parsed = createArtifactSchema.parse(input);
  return SwarmArtifact.create(parsed);
}

export async function getArtifactById(artifactId: string): Promise<SwarmArtifactDocument> {
  const artifact = await SwarmArtifact.findOne({ artifactId });
  if (!artifact) throw new AppError(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found.');
  return artifact;
}

export async function listArtifacts(query: {
  vertical?: string;
  artifactType?: string;
  reviewStatus?: ReviewStatus;
  page?: number;
  limit?: number;
}): Promise<{ items: SwarmArtifactDocument[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 25)));
  const filter: FilterQuery<SwarmArtifactDocument> = {};
  if (query.vertical) filter.vertical = query.vertical;
  if (query.artifactType) filter.artifactType = query.artifactType;
  if (query.reviewStatus) filter.reviewStatus = query.reviewStatus;

  const [items, total] = await Promise.all([
    SwarmArtifact.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    SwarmArtifact.countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

export async function reviewArtifact(input: {
  artifactId: string;
  reviewStatus: ReviewStatus;
  reviewedBy?: Record<string, unknown>;
  reason?: string;
}): Promise<SwarmArtifactDocument> {
  const artifact = await getArtifactById(input.artifactId);
  artifact.reviewStatus = input.reviewStatus;
  artifact.reviewedAt = new Date();
  artifact.reviewedBy = input.reviewedBy;
  artifact.reviewReason = input.reason;
  await artifact.save();

  if (['APPROVED', 'REJECTED', 'PUBLISHED'].includes(input.reviewStatus)) {
    const jobStatus = input.reviewStatus === 'APPROVED'
      ? 'approved'
      : input.reviewStatus === 'PUBLISHED'
        ? 'published'
        : 'rejected';
    await SwarmJob.updateOne({ jobId: artifact.jobId }, {
      $set: { status: jobStatus },
      $push: { statusHistory: { status: jobStatus, at: new Date(), reason: input.reason } },
    });
  }

  return artifact;
}
