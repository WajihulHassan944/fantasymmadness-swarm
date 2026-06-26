import { env } from '../config/env.js';
import { AgentRun } from '../models/agent-run.model.js';
import { DeadLetter } from '../models/dead-letter.model.js';
import { SwarmJob, type SwarmJobDocument } from '../models/job.model.js';
import { agentRegistry } from '../agents/registry.js';
import { createArtifact } from '../services/artifact.service.js';
import { sendJobCompletedCallback, sendJobFailedCallback } from '../services/callback.service.js';
import { safeJsonHash } from '../utils/hash.js';
import { logger } from '../utils/logger.js';

export class JobWorker {
  private active = false;
  private readonly workerId: string;
  private readonly concurrency: number;
  private readonly timers = new Set<NodeJS.Timeout>();

  constructor(workerId = env.WORKER_ID, concurrency = env.WORKER_CONCURRENCY) {
    this.workerId = workerId;
    this.concurrency = Math.max(1, concurrency);
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    logger.info({ workerId: this.workerId, concurrency: this.concurrency }, 'Job worker started');
    for (let index = 0; index < this.concurrency; index += 1) {
      this.loop(index).catch((error) => logger.error({ error, workerId: this.workerId }, 'Worker loop crashed'));
    }
  }

  stop(): void {
    this.active = false;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    logger.info({ workerId: this.workerId }, 'Job worker stopped');
  }

  private async loop(slot: number): Promise<void> {
    while (this.active) {
      try {
        const job = await this.claimNextJob();
        if (!job) {
          await this.sleep(env.JOB_POLL_INTERVAL_MS);
          continue;
        }
        await this.processJob(job, slot);
      } catch (error) {
        logger.error({ error, slot, workerId: this.workerId }, 'Worker loop iteration failed');
        await this.sleep(env.JOB_POLL_INTERVAL_MS);
      }
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        resolve();
      }, ms);
      this.timers.add(timer);
    });
  }

  private async claimNextJob(): Promise<SwarmJobDocument | null> {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + env.JOB_LEASE_SECONDS * 1000);
    const job = await SwarmJob.findOneAndUpdate(
      {
        status: { $in: ['queued', 'retry_pending'] },
        scheduledAt: { $lte: now },
        runAfter: { $lte: now },
        cancellationRequested: { $ne: true },
        $expr: { $lt: ['$attempts', '$maxAttempts'] },
      },
      {
        $set: {
          status: 'running',
          leasedBy: this.workerId,
          leaseExpiresAt,
          startedAt: now,
        },
        $inc: { attempts: 1 },
        $push: { statusHistory: { status: 'running', at: now, reason: `claimed-by-${this.workerId}` } },
      },
      { sort: { priority: -1, scheduledAt: 1, createdAt: 1 }, new: true },
    );

    return job;
  }

  private async processJob(job: SwarmJobDocument, slot: number): Promise<void> {
    logger.info({ jobId: job.jobId, jobType: job.jobType, vertical: job.vertical, slot }, 'Processing job');
    const agent = agentRegistry.resolve(job.jobType);
    const run = await AgentRun.create({
      jobId: job.jobId,
      agentName: agent.name,
      status: 'running',
      inputHash: safeJsonHash(job.input),
      startedAt: new Date(),
    });

    try {
      const freshJob = await SwarmJob.findOne({ jobId: job.jobId });
      if (!freshJob) throw new Error('Claimed job disappeared.');
      if (freshJob.cancellationRequested) {
        await this.markCancelled(freshJob, run.runId);
        return;
      }

      const result = await agent.run(freshJob);
      const artifact = await createArtifact(result.artifact);

      freshJob.status = 'awaiting_review';
      freshJob.artifactId = artifact.artifactId;
      freshJob.completedAt = new Date();
      freshJob.leasedBy = undefined;
      freshJob.leaseExpiresAt = undefined;
      freshJob.tokenUsage = result.tokenUsage;
      freshJob.costEstimate = result.costEstimate;
      freshJob.statusHistory.push({ status: 'awaiting_review', at: new Date(), reason: `artifact-created:${artifact.artifactId}` });
      await freshJob.save();

      run.status = 'succeeded';
      run.outputArtifactId = artifact.artifactId;
      run.tokenUsage = result.tokenUsage;
      run.costEstimate = result.costEstimate;
      run.finishedAt = new Date();
      await run.save();

      await sendJobCompletedCallback(freshJob, artifact);
      logger.info({ jobId: job.jobId, artifactId: artifact.artifactId, agent: agent.name }, 'Job completed and awaiting review');
    } catch (error) {
      await this.markFailed(job.jobId, run.runId, error);
    }
  }

  private async markCancelled(job: SwarmJobDocument, runId: string): Promise<void> {
    job.status = 'cancelled';
    job.completedAt = new Date();
    job.leasedBy = undefined;
    job.leaseExpiresAt = undefined;
    job.statusHistory.push({ status: 'cancelled', at: new Date(), reason: 'cancelled-before-execution' });
    await job.save();
    await AgentRun.updateOne({ runId }, { $set: { status: 'failed', finishedAt: new Date(), error: { message: 'Job was cancelled.' } } });
  }

  private async markFailed(jobId: string, runId: string, error: unknown): Promise<void> {
    const normalizedError = this.normalizeError(error);
    const job = await SwarmJob.findOne({ jobId });
    if (!job) return;

    const canRetry = job.attempts < job.maxAttempts;
    const nextStatus = canRetry ? 'retry_pending' : 'dead_letter';
    const retryDelay = env.JOB_RETRY_BASE_DELAY_MS * Math.pow(2, Math.max(0, job.attempts - 1));
    const runAfter = new Date(Date.now() + retryDelay);

    job.status = nextStatus;
    job.error = normalizedError;
    job.leasedBy = undefined;
    job.leaseExpiresAt = undefined;
    if (canRetry) job.runAfter = runAfter;
    else job.completedAt = new Date();
    job.statusHistory.push({ status: nextStatus, at: new Date(), reason: normalizedError.message });
    await job.save();

    await AgentRun.updateOne({ runId }, { $set: { status: 'failed', finishedAt: new Date(), error: normalizedError } });

    if (!canRetry) {
      await DeadLetter.create({
        jobId: job.jobId,
        reason: normalizedError.message,
        error: normalizedError,
        payloadSnapshot: { input: job.input, vertical: job.vertical, jobType: job.jobType },
      });
      await sendJobFailedCallback(job);
    }

    logger.error({ jobId, error: normalizedError, canRetry, nextStatus }, 'Job failed');
  }

  private normalizeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack, failedAt: new Date().toISOString() };
    }
    return { message: 'Unknown job failure', detail: error, failedAt: new Date().toISOString() };
  }
}
