import { env } from '../config/env.js';
import { createJob } from './job.service.js';
import { isoDateKey } from '../utils/time.js';
import { logger } from '../utils/logger.js';

export class SchedulerService {
  private timer?: NodeJS.Timeout;

  start(): void {
    if (!env.SCHEDULER_ENABLED) {
      logger.info('Scheduler is disabled');
      return;
    }

    const run = () => {
      this.createDailyContentJobs().catch((error) => logger.error({ error }, 'Scheduled content job creation failed'));
    };

    run();
    this.timer = setInterval(run, env.SCHEDULED_INTERVAL_MS);
    this.timer.unref();
    logger.info({ intervalMs: env.SCHEDULED_INTERVAL_MS }, 'Scheduler started');
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    logger.info('Scheduler stopped');
  }

  async createDailyContentJobs(date = new Date()): Promise<void> {
    const key = isoDateKey(date);
    const jobs = [
      {
        vertical: 'combat' as const,
        topic: 'Daily combat fantasy preview and strategy update',
        idempotencyKey: `scheduled:${key}:combat:content.article`,
      },
      {
        vertical: 'pro_wrestling' as const,
        topic: 'Daily pro-wrestling fantasy scorecard strategy update',
        idempotencyKey: `scheduled:${key}:pro_wrestling:content.article`,
      },
    ];

    for (const job of jobs) {
      const result = await createJob({
        vertical: job.vertical,
        jobType: 'content.article',
        mode: 'DRAFT_ONLY',
        priority: 30,
        idempotencyKey: job.idempotencyKey,
        requestedBy: { source: 'scheduler', role: 'system' },
        input: { topic: job.topic, keywords: ['FantasyMMAdness', 'fantasy predictions'] },
        metadata: { scheduled: true, dateKey: key },
      });
      logger.info({ jobId: result.job.jobId, created: result.created, idempotencyKey: job.idempotencyKey }, 'Scheduled content job ensured');
    }
  }
}
