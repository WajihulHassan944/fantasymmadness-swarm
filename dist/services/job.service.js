import { env } from '../config/env.js';
import { createJobSchema, listJobsQuerySchema } from '../contracts/job.js';
import { SwarmJob } from '../models/job.model.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
export async function createJob(input) {
    const parsed = createJobSchema.parse(input);
    if (parsed.idempotencyKey) {
        const existing = await SwarmJob.findOne({ idempotencyKey: parsed.idempotencyKey });
        if (existing)
            return { job: existing, created: false };
    }
    try {
        const job = await SwarmJob.create({
            ...parsed,
            scheduledAt: parsed.scheduledAt || new Date(),
            runAfter: parsed.scheduledAt || new Date(),
            maxAttempts: parsed.maxAttempts || env.JOB_DEFAULT_MAX_ATTEMPTS,
            statusHistory: [{ status: 'queued', at: new Date(), reason: 'job-created' }],
        });
        return { job, created: true };
    }
    catch (error) {
        const err = error;
        if (parsed.idempotencyKey && err.code === 11000) {
            const existing = await SwarmJob.findOne({ idempotencyKey: parsed.idempotencyKey });
            if (existing)
                return { job: existing, created: false };
        }
        throw error;
    }
}
export async function getJob(jobId) {
    const job = await SwarmJob.findOne({ jobId });
    if (!job)
        throw new AppError(404, 'JOB_NOT_FOUND', 'Job not found.');
    return job;
}
export async function listJobs(rawQuery) {
    const query = listJobsQuerySchema.parse(rawQuery ?? {});
    const filter = {};
    if (query.status)
        filter.status = query.status;
    if (query.vertical)
        filter.vertical = query.vertical;
    if (query.jobType)
        filter.jobType = query.jobType;
    const [items, total] = await Promise.all([
        SwarmJob.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit),
        SwarmJob.countDocuments(filter),
    ]);
    return { items, total, page: query.page, limit: query.limit };
}
export async function cancelJob(jobId, reason = 'cancel-requested') {
    const job = await getJob(jobId);
    if (['succeeded', 'awaiting_review', 'approved', 'published', 'rejected', 'dead_letter', 'cancelled'].includes(job.status)) {
        throw new AppError(409, 'JOB_FINALIZED', `Cannot cancel job with status ${job.status}.`);
    }
    job.cancellationRequested = true;
    if (['queued', 'retry_pending'].includes(job.status)) {
        job.status = 'cancelled';
        job.completedAt = new Date();
    }
    job.statusHistory.push({ status: job.status, at: new Date(), reason });
    await job.save();
    return job;
}
export async function retryJob(jobId, reason = 'manual-retry') {
    const job = await getJob(jobId);
    if (!['failed', 'dead_letter', 'retry_pending', 'cancelled'].includes(job.status)) {
        throw new AppError(409, 'JOB_NOT_RETRYABLE', `Cannot retry job with status ${job.status}.`);
    }
    job.status = 'queued';
    job.cancellationRequested = false;
    job.runAfter = new Date();
    job.scheduledAt = new Date();
    job.leaseExpiresAt = undefined;
    job.leasedBy = undefined;
    job.error = undefined;
    job.statusHistory.push({ status: 'queued', at: new Date(), reason });
    await job.save();
    return job;
}
export async function transitionJob(jobId, status, reason, fields = {}) {
    await SwarmJob.updateOne({ jobId }, {
        $set: { ...fields, status },
        $push: { statusHistory: { status, at: new Date(), reason } },
    });
}
export async function logJobEvent(jobId, message, details) {
    logger.info({ jobId, ...details }, message);
}
