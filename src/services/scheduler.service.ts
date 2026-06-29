import { env } from '../config/env.js';
import { createJob } from './job.service.js';
import { triggerAutomationEvent } from './automation.service.js';
import { isoDateKey } from '../utils/time.js';
import { logger } from '../utils/logger.js';
import type { Vertical } from '../contracts/domain.js';
import type { JobType } from '../contracts/job.js';

export class SchedulerService {
  private timer?: NodeJS.Timeout;

  start(): void {
    if (!env.SCHEDULER_ENABLED) {
      logger.info('Scheduler is disabled');
      return;
    }

    const run = () => {
      this.createDailyContentJobs().catch((error) => logger.error({ error }, 'Scheduled content job creation failed'));
      this.createDailyGrowthJobs().catch((error) => logger.error({ error }, 'Scheduled growth job creation failed'));
      this.triggerScheduledAutomations().catch((error) => logger.error({ error }, 'Scheduled automation trigger failed'));
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
    if (!env.SCHEDULED_DAILY_CONTENT_ENABLED) return;
    const key = isoDateKey(date);
    const jobs = [
      {
        vertical: 'combat' as const,
        topic: 'Daily MMA, Boxing, and combat fantasy preview and strategy update',
        idempotencyKey: `scheduled:${key}:combat:content.article`,
        sport: 'combat',
      },
      {
        vertical: 'pro_wrestling' as const,
        topic: 'Daily pro-wrestling fantasy scorecard strategy update',
        idempotencyKey: `scheduled:${key}:pro_wrestling:content.article`,
        sport: 'pro_wrestling',
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
        sourceEntity: { type: 'scheduler_tick', id: `daily-content:${key}:${job.vertical}`, label: job.topic },
        input: { topic: job.topic, sport: job.sport, keywords: ['FantasyMMAdness', 'fantasy predictions', 'fight night'] },
        metadata: { scheduled: true, dateKey: key, schedulerType: 'daily-content' },
      });
      logger.info({ jobId: result.job.jobId, created: result.created, idempotencyKey: job.idempotencyKey }, 'Scheduled content job ensured');
    }
  }

  async createDailyGrowthJobs(date = new Date()): Promise<void> {
    const key = isoDateKey(date);
    const scheduledBy = { source: 'scheduler', role: 'system' } as const;

    if (env.SCHEDULED_DAILY_SEO_ENABLED) {
      await this.ensureScheduledJob({
        key,
        vertical: 'combat',
        jobType: 'seo.daily-audit',
        idempotencySuffix: 'seo:daily-audit:combat',
        sourceLabel: 'Daily SEO audit for MMA, Boxing, and combat pages',
        input: {
          topic: 'Daily SEO audit for fight traffic growth',
          pageInventoryScope: ['homepage', 'fight calendar', 'upcoming fights', 'blogs', 'fighter pages', 'boxing campaigns'],
          targetKeyword: 'fantasy fight predictions',
          sport: 'combat',
        },
        requestedBy: scheduledBy,
      });
      await this.ensureScheduledJob({
        key,
        vertical: 'pro_wrestling',
        jobType: 'seo.daily-audit',
        idempotencySuffix: 'seo:daily-audit:pro_wrestling',
        sourceLabel: 'Daily SEO audit for pro-wrestling pages',
        input: {
          topic: 'Daily SEO audit for pro-wrestling fantasy traffic growth',
          pageInventoryScope: ['pro-wrestling homepage', 'matches', 'wrestlers', 'blogs'],
          targetKeyword: 'pro wrestling fantasy predictions',
          sport: 'pro_wrestling',
        },
        requestedBy: scheduledBy,
      });
      await this.ensureScheduledJob({
        key,
        vertical: 'combat',
        jobType: 'seo.keyword-opportunity',
        idempotencySuffix: 'seo:keyword-opportunity:combat',
        sourceLabel: 'Daily keyword opportunity finder',
        input: { topic: 'Daily keyword opportunities for fights, boxing, blogs, and contests', sport: 'combat' },
        requestedBy: scheduledBy,
      });
    }

    if (env.SCHEDULED_FIGHT_CALENDAR_ENABLED) {
      await this.ensureScheduledJob({
        key,
        vertical: 'combat',
        jobType: 'data.fight-calendar-refresh',
        idempotencySuffix: 'calendar:fight-refresh:combat',
        sourceLabel: 'Daily fight calendar refresh',
        input: { topic: 'Refresh fight schedule and upcoming fight opportunities', sport: 'combat', sourceName: 'backend-fight-schedule' },
        requestedBy: scheduledBy,
      });
      await this.ensureScheduledJob({
        key,
        vertical: 'pro_wrestling',
        jobType: 'data.fight-calendar-refresh',
        idempotencySuffix: 'calendar:fight-refresh:pro_wrestling',
        sourceLabel: 'Daily pro-wrestling schedule refresh',
        input: { topic: 'Refresh pro-wrestling match schedule and dashboard opportunities', sport: 'pro_wrestling', sourceName: 'backend-pro-wrestling-schedule' },
        requestedBy: scheduledBy,
      });
    }

    if (env.SCHEDULED_DAILY_CONTENT_ENABLED) {
      await this.ensureScheduledJob({
        key,
        vertical: 'combat',
        jobType: 'content.user-dashboard-opportunities',
        idempotencySuffix: 'dashboard:fight-opportunities',
        sourceLabel: 'Daily user dashboard fight opportunities',
        input: {
          topic: 'Fresh fight opportunities for user dashboard engagement',
          sport: 'combat',
          targetOutput: 'recommended active, tonight, recent, and promoted fight opportunities for user dashboard modules',
        },
        requestedBy: scheduledBy,
      });
      await this.ensureScheduledJob({
        key,
        vertical: 'combat',
        jobType: 'content.blog-topic-suggestions',
        idempotencySuffix: 'content:daily-blog-topic-suggestions',
        sourceLabel: 'Daily blog topic suggestions for traffic growth',
        input: { topic: 'Daily blog topics for MMA, Boxing, pro wrestling, fight-night promos, and contests', sport: 'combat' },
        requestedBy: scheduledBy,
      });
    }

    if (env.SCHEDULED_DAILY_SOCIAL_ENABLED) {
      const draftsPerDay = Math.max(1, Math.min(12, env.SCHEDULED_SOCIAL_DRAFTS_PER_DAY));
      for (let slot = 1; slot <= draftsPerDay; slot += 1) {
        await this.ensureScheduledJob({
          key,
          vertical: 'combat',
          jobType: 'social.multi-platform-daily-posts',
          idempotencySuffix: `social:multi-platform:${slot}`,
          sourceLabel: `Daily multi-platform social post draft ${slot}`,
          input: {
            topic: `Daily FantasyMMAdness social push ${slot}: fresh fights, boxing, blogs, and contests`,
            sport: 'combat',
            platforms: env.SOCIAL_DEFAULT_PLATFORMS,
            postingSlot: slot,
            postingGoal: 'multiple daily posts for user growth, repeat visits, and traffic acquisition',
            hashtags: ['FantasyMMAdness', 'MMAFantasy', 'BoxingFantasy', 'FightNight'],
          },
          requestedBy: scheduledBy,
          priority: 40,
        });
      }
    }

    if (env.SCHEDULED_GROWTH_PLAN_ENABLED) {
      await this.ensureScheduledJob({
        key,
        vertical: 'combat',
        jobType: 'analytics.user-growth-1000-plan',
        idempotencySuffix: 'analytics:1000-user-growth-plan',
        sourceLabel: '1000-new-users growth plan',
        input: {
          topic: 'Roadmap to acquire 1000 new FantasyMMAdness users through SEO, blogs, X, Instagram, Facebook, and fight promotion',
          targetUsers: 1000,
          channels: ['SEO', 'Blogs', 'X', 'Instagram', 'Facebook', 'Fight calendar', 'User dashboard'],
        },
        requestedBy: scheduledBy,
        priority: 25,
      });
    }
  }

  async triggerScheduledAutomations(date = new Date()): Promise<void> {
    const key = isoDateKey(date);
    for (const trigger of ['schedule.hourly', 'schedule.daily', 'schedule.weekly']) {
      const result = await triggerAutomationEvent({
        trigger,
        sourceEntity: { type: 'scheduler_tick', id: `${trigger}:${key}`, label: trigger },
        input: { dateKey: key, scheduler: true, platforms: env.SOCIAL_DEFAULT_PLATFORMS },
        requestedBy: { source: 'scheduler', role: 'system' },
        dryRun: false,
        force: false,
        metadata: { scheduled: true, trigger, dateKey: key },
      });
      logger.info({ trigger, result }, 'Scheduled automation trigger ensured');
    }
  }

  private async ensureScheduledJob(options: {
    key: string;
    vertical: Vertical;
    jobType: JobType;
    idempotencySuffix: string;
    sourceLabel: string;
    input: Record<string, unknown>;
    requestedBy: { source: 'scheduler'; role: string };
    priority?: number;
  }): Promise<void> {
    const result = await createJob({
      vertical: options.vertical,
      jobType: options.jobType,
      mode: 'DRAFT_ONLY',
      priority: options.priority ?? 35,
      idempotencyKey: `scheduled:${options.key}:${options.idempotencySuffix}`,
      requestedBy: options.requestedBy,
      sourceEntity: { type: 'scheduler_tick', id: `${options.idempotencySuffix}:${options.key}`, label: options.sourceLabel },
      input: options.input,
      metadata: { scheduled: true, dateKey: options.key, schedulerType: options.idempotencySuffix },
    });
    logger.info({ jobId: result.job.jobId, created: result.created, jobType: options.jobType, idempotencyKey: `scheduled:${options.key}:${options.idempotencySuffix}` }, 'Scheduled growth job ensured');
  }
}
