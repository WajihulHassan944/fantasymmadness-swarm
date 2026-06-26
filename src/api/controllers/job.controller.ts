import type { Request, Response } from 'express';
import { createJobSchema } from '../../contracts/job.js';
import { cancelJob, createJob, getJob, listJobs, retryJob } from '../../services/job.service.js';

export async function createJobHandler(req: Request, res: Response): Promise<void> {
  const parsed = createJobSchema.parse(req.body);
  const { job, created } = await createJob(parsed);
  res.status(created ? 202 : 200).json({ ok: true, created, job: serializeJob(job), requestId: req.requestId });
}

export async function listJobsHandler(req: Request, res: Response): Promise<void> {
  const result = await listJobs(req.query);
  res.json({
    ok: true,
    items: result.items.map(serializeJob),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: Math.ceil(result.total / result.limit),
    },
    requestId: req.requestId,
  });
}

export async function getJobHandler(req: Request, res: Response): Promise<void> {
  const job = await getJob(req.params.jobId);
  res.json({ ok: true, job: serializeJob(job), requestId: req.requestId });
}

export async function cancelJobHandler(req: Request, res: Response): Promise<void> {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
  const job = await cancelJob(req.params.jobId, reason);
  res.json({ ok: true, job: serializeJob(job), requestId: req.requestId });
}

export async function retryJobHandler(req: Request, res: Response): Promise<void> {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
  const job = await retryJob(req.params.jobId, reason);
  res.json({ ok: true, job: serializeJob(job), requestId: req.requestId });
}

export function serializeJob(job: any): Record<string, unknown> {
  return {
    jobId: job.jobId,
    vertical: job.vertical,
    jobType: job.jobType,
    mode: job.mode,
    status: job.status,
    priority: job.priority,
    idempotencyKey: job.idempotencyKey,
    requestedBy: job.requestedBy,
    sourceEntity: job.sourceEntity,
    input: job.input,
    artifactId: job.artifactId,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    scheduledAt: job.scheduledAt,
    runAfter: job.runAfter,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    cancellationRequested: job.cancellationRequested,
    callbackUrl: job.callbackUrl,
    backendCorrelationId: job.backendCorrelationId,
    tokenUsage: job.tokenUsage,
    costEstimate: job.costEstimate,
    error: job.error,
    statusHistory: job.statusHistory,
    metadata: job.metadata,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
