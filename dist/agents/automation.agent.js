import { AUTOMATION_DEFINITIONS } from '../automations/definitions.js';
import { env } from '../config/env.js';
import { getAiProvider } from '../providers/ai/index.js';
import { getString } from './base.js';
export class AutomationAgent {
    name = 'automation-ops-agent';
    version = '1.0.0';
    supports(jobType) {
        return jobType.startsWith('automation.')
            || jobType.startsWith('analytics.')
            || jobType.startsWith('media.')
            || jobType.startsWith('notification.');
    }
    async run(job) {
        const input = job.input || {};
        const automationKey = getString(input, 'automationKey');
        const definition = automationKey ? AUTOMATION_DEFINITIONS.find((item) => item.key === automationKey) : undefined;
        const title = this.titleFor(job, definition?.label);
        const fallback = {
            title,
            summary: this.summaryFor(job, definition?.description),
            recommendedActions: this.defaultActions(job.jobType),
            artifactsToCreate: this.defaultFollowUps(job.jobType),
            safety: {
                requiresAdminReview: job.mode !== 'DRY_RUN' && job.mode !== 'SHADOW',
                directProductionWrites: false,
                notes: [
                    'Phase 1 creates artifacts and recommendations only.',
                    'Backend remains responsible for publishing, wallet, contest, score, and social platform writes.',
                ],
            },
        };
        const ai = getAiProvider();
        const aiResult = await ai.generateJson({
            system: 'You are the FantasyMMAdness automation operations agent. Return JSON only. Create safe operational plans, summaries, notifications, image prompts, dashboards, or admin-control recommendations. Never request direct wallet/contest/payout writes.',
            user: JSON.stringify({
                vertical: job.vertical,
                jobType: job.jobType,
                mode: job.mode,
                sourceEntity: job.sourceEntity,
                input,
                automationDefinition: definition,
            }),
            schemaName: 'OperationalPayload',
            fallback,
            temperature: 0.35,
        });
        const payload = {
            ...fallback,
            ...aiResult.output,
            safety: fallback.safety,
        };
        return {
            artifact: {
                jobId: job.jobId,
                vertical: job.vertical,
                jobType: job.jobType,
                artifactType: this.artifactTypeFor(job.jobType),
                title: payload.title,
                summary: payload.summary,
                reviewStatus: 'AWAITING_REVIEW',
                payload,
                provenance: {
                    provider: aiResult.provider,
                    model: aiResult.model,
                    promptVersion: 'automation-ops-v1',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: { score: aiResult.warnings.length ? 72 : 86, warnings: aiResult.warnings },
                metadata: { mode: job.mode, automationKey, category: definition?.category },
            },
            tokenUsage: aiResult.tokenUsage,
            warnings: aiResult.warnings,
        };
    }
    artifactTypeFor(jobType) {
        if (jobType.startsWith('analytics.'))
            return 'analytics.report';
        if (jobType.startsWith('media.'))
            return 'media.image-prompt';
        if (jobType.startsWith('notification.'))
            return 'notification.draft';
        return 'automation.control-plan';
    }
    titleFor(job, label) {
        if (label)
            return label;
        if (job.jobType.startsWith('analytics.'))
            return `Analytics report: ${job.jobType}`;
        if (job.jobType.startsWith('media.'))
            return `Media prompt: ${job.jobType}`;
        if (job.jobType.startsWith('notification.'))
            return `Admin notification: ${job.jobType}`;
        return `Automation control plan: ${job.jobType}`;
    }
    summaryFor(job, description) {
        if (description)
            return description;
        return `Operational artifact generated for ${job.jobType} in ${job.mode} mode.`;
    }
    defaultActions(jobType) {
        if (jobType === 'analytics.july-10000-signup-growth-plan') {
            return [
                { action: 'Review July growth operating plan daily', owner: 'admin', risk: 'low', note: `Goal is ${env.JULY_SIGNUP_GOAL} July signups; generated numbers are targets, not verified analytics.` },
                { action: 'Approve content batches before publishing', owner: 'admin', risk: 'medium', note: 'Keep all blog, social, YouTube, and notification assets in approval flow until backend publishing controls are live.' },
                { action: 'Feed verified event, result, leaderboard, and signup metrics into the next run', owner: 'backend', risk: 'medium', note: 'The swarm should not invent community percentages, results, rankings, or conversion metrics.' },
            ];
        }
        if (jobType.startsWith('media.')) {
            return [
                { action: 'Review image prompt for brand safety', owner: 'admin', risk: 'medium', note: 'Avoid unofficial logos, protected likenesses, misleading event artwork, or unapproved fighter images.' },
                { action: 'Apply small Fantasy MMadness logo overlay', owner: 'frontend', risk: 'low', note: env.BRAND_LOGO_URL ? `Use ${env.BRAND_LOGO_URL} in the ${env.BRAND_LOGO_CORNER} corner.` : 'Set BRAND_LOGO_URL before generating final visual assets.' },
                { action: 'Generate media through approved design workflow', owner: 'frontend', risk: 'medium', note: 'Phase 1 does not upload media to production.' },
            ];
        }
        if (jobType === 'notification.community-retention-daily') {
            return [
                { action: 'Review prediction reminders and league invites', owner: 'admin', risk: 'low', note: 'Use only verified active events and deadlines.' },
                { action: 'Send through backend notification/email system after approval', owner: 'backend', risk: 'medium', note: 'Respect opt-outs, user preferences, and rate limits.' },
            ];
        }
        if (jobType.startsWith('notification.')) {
            return [
                { action: 'Send admin notification after backend approval', owner: 'backend', risk: 'low', note: 'Notification must link to the relevant job, page, or report.' },
            ];
        }
        if (jobType.startsWith('analytics.')) {
            return [
                { action: 'Review report in admin dashboard', owner: 'admin', risk: 'low', note: 'Use the report for prioritization; do not treat generated metrics as authoritative unless backed by source data.' },
            ];
        }
        return [
            { action: 'Review automation configuration', owner: 'admin', risk: 'low', note: 'Enable only the automations needed for the current rollout.' },
            { action: 'Keep auto-publish disabled until review workflow is complete', owner: 'backend', risk: 'medium', note: 'The website backend remains the write authority.' },
        ];
    }
    defaultFollowUps(jobType) {
        if (jobType === 'analytics.july-10000-signup-growth-plan') {
            return [
                { jobType: 'data.event-calendar-daily-update', reason: 'Keep homepage and event pages aligned with upcoming fights and deadlines.' },
                { jobType: 'content.fight-card-daily-package', reason: 'Turn every combat event into prediction/signup pages and cards.' },
                { jobType: 'content.blog-seo-daily-articles', reason: 'Generate 2-4 SEO article briefs per day.' },
                { jobType: 'social.youtube-growth-video-draft', reason: 'Create 2-4 YouTube long-form trust/discovery videos per day.' },
                { jobType: 'social.short-form-video-pack', reason: 'Create 5-10 short-form clips per day.' },
                { jobType: 'notification.community-retention-daily', reason: 'Create return-visit reminders and league invites.' },
            ];
        }
        if (jobType === 'automation.draft-queue-generation') {
            return [
                { jobType: 'content.article', reason: 'Create priority blog drafts from approved queue items.' },
                { jobType: 'social.draft', reason: 'Create social drafts for approved content calendar items.' },
                { jobType: 'seo.keyword-opportunity', reason: 'Validate traffic potential before publishing.' },
            ];
        }
        return [];
    }
}
