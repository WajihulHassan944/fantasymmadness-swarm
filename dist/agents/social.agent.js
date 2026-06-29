import { env } from '../config/env.js';
import { getAiProvider } from '../providers/ai/index.js';
import { getString, getStringArray } from './base.js';
export class SocialAgent {
    name = 'social-agent';
    version = '1.1.0';
    supports(jobType) {
        return jobType.startsWith('social.');
    }
    async run(job) {
        const input = job.input || {};
        const sport = getString(input, 'sport', getString(input, 'discipline', job.vertical === 'pro_wrestling' ? 'pro_wrestling' : 'mma'));
        const campaignName = getString(input, 'campaignName', this.defaultCampaignName(job, sport));
        const topic = getString(input, 'topic', getString(input, 'title', campaignName));
        const platforms = getStringArray(input, 'platforms');
        const targetPlatforms = this.normalizePlatforms(platforms.length ? platforms : this.defaultPlatforms(job.jobType));
        const hashtags = getStringArray(input, 'hashtags');
        const platformReadiness = targetPlatforms.map((platform) => this.platformReadiness(platform));
        const canAutoPublish = job.mode === 'AUTOMATED' && env.SWARM_SOCIAL_PUBLISH_ENABLED && platformReadiness.length > 0 && platformReadiness.every((item) => item.configured);
        const fallback = {
            campaignName,
            publishMode: canAutoPublish ? 'automation_ready' : job.mode === 'APPROVAL_REQUIRED' ? 'approval_required' : 'draft_only',
            posts: targetPlatforms.map((platform) => ({
                platform,
                text: this.defaultPostText(job.jobType, topic),
                hashtags: [...new Set(['FantasyMMAdness', this.defaultSportHashtag(job.vertical, sport), ...hashtags])],
                mediaSuggestion: 'Use approved event, fighter, wrestler, contest, or blog artwork from the existing website asset workflow.',
                callToAction: this.defaultCallToAction(job.jobType),
            })),
            safetyNotes: [
                'Draft first. Do not publish unsupported odds, guarantees, payouts, or unverified result claims.',
                'Live platform posting should remain disabled until backend/admin approval flow is tested.',
            ],
            publicationReadiness: {
                canAutoPublish,
                reason: canAutoPublish
                    ? 'Job requested AUTOMATED mode, social publishing flag is enabled, and all selected platform credentials are configured.'
                    : 'Current Phase 1 output is a draft artifact; backend/admin approval should publish later. Live posting needs platform credentials and backend approval controls.',
                configuredPlatforms: this.configuredPlatforms(),
                platformReadiness,
            },
        };
        const ai = getAiProvider();
        const aiResult = await ai.generateJson({
            system: 'You create safe social-media drafts for FantasyMMAdness. Avoid unsupported odds, guarantees, financial claims, or unverified results. Return JSON only. Keep posts concise and platform-ready.',
            user: JSON.stringify({ vertical: job.vertical, jobType: job.jobType, sport, campaignName, topic, platforms: targetPlatforms, hashtags, automationKey: input.automationKey, campaignId: input.campaignId, campaignType: input.campaignType, targetOutput: input.targetOutput, postingGoal: input.postingGoal || 'traffic growth and repeat user engagement' }),
            schemaName: 'SocialDraftPayload',
            fallback,
            temperature: 0.7,
        });
        const output = {
            ...fallback,
            ...aiResult.output,
            publicationReadiness: fallback.publicationReadiness,
        };
        return {
            artifact: {
                jobId: job.jobId,
                vertical: job.vertical,
                jobType: job.jobType,
                artifactType: job.jobType === 'social.calendar' ? 'social.calendar-plan' : 'social.post-draft',
                title: `Social drafts: ${campaignName}`,
                summary: `Social automation draft for ${campaignName}.`,
                reviewStatus: 'AWAITING_REVIEW',
                payload: output,
                provenance: {
                    provider: aiResult.provider,
                    model: aiResult.model,
                    promptVersion: 'social-v2',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: { score: aiResult.warnings.length ? 74 : 86, warnings: aiResult.warnings },
                metadata: {
                    publishMode: output.publishMode,
                    canAutoPublish,
                    mode: job.mode,
                    automationKey: input.automationKey,
                    campaignId: input.campaignId,
                    campaignType: input.campaignType,
                    sport,
                    livePostingImplementedBy: 'backend-or-social-provider-adapter-after-approval',
                },
            },
            tokenUsage: aiResult.tokenUsage,
            warnings: aiResult.warnings,
        };
    }
    defaultCampaignName(job, sport = 'mma') {
        if (job.jobType.includes('winner'))
            return 'FantasyMMAdness winners announcement';
        if (job.jobType.includes('reminder'))
            return 'FantasyMMAdness contest reminder';
        if (job.jobType.includes('blog'))
            return 'FantasyMMAdness blog promotion';
        if (job.vertical === 'pro_wrestling')
            return 'Pro Wrestling Fantasy Contest';
        if (sport === 'boxing')
            return 'Boxing Fantasy Fight Campaign';
        if (sport === 'kickboxing')
            return 'Kickboxing Fantasy Fight Campaign';
        return 'Fight Fantasy Contest';
    }
    defaultSportHashtag(vertical, sport = 'mma') {
        if (vertical === 'pro_wrestling')
            return 'ProWrestling';
        if (sport === 'boxing')
            return 'BoxingFantasy';
        if (sport === 'kickboxing')
            return 'KickboxingFantasy';
        return 'MMAFantasy';
    }
    defaultPlatforms(jobType) {
        if (jobType.includes('discord'))
            return ['discord'];
        if (jobType.includes('youtube'))
            return ['youtube', 'x'];
        if (jobType.includes('instagram'))
            return ['instagram'];
        if (jobType.includes('facebook'))
            return ['facebook'];
        if (jobType.includes('multi-platform') || jobType.includes('promotional') || jobType.includes('campaign'))
            return env.SOCIAL_DEFAULT_PLATFORMS;
        return env.SOCIAL_DEFAULT_PLATFORMS.length ? env.SOCIAL_DEFAULT_PLATFORMS : ['x'];
    }
    defaultPostText(jobType, topic) {
        if (jobType.includes('result'))
            return `${topic} is updated. Review the action, strategy notes, and fantasy implications on FantasyMMAdness.`;
        if (jobType.includes('reminder'))
            return `${topic} is closing soon. Lock in your FantasyMMAdness predictions before the deadline.`;
        if (jobType.includes('winner'))
            return `FantasyMMAdness contest results are ready. Check the winners announcement and latest leaderboard updates.`;
        if (jobType.includes('blog'))
            return `New on FantasyMMAdness: ${topic}. Read the latest fantasy-focused breakdown.`;
        return `Ready for ${topic}? Build your fantasy predictions on FantasyMMAdness and follow the action with strategy-first contest play.`;
    }
    defaultCallToAction(jobType) {
        if (jobType.includes('blog'))
            return 'Read the latest FantasyMMAdness breakdown.';
        if (jobType.includes('reminder'))
            return 'Enter or update your predictions before lock time.';
        return 'Join or review the latest FantasyMMAdness contests.';
    }
    normalizePlatforms(platforms) {
        const allowed = ['x', 'instagram', 'facebook', 'discord', 'youtube'];
        return [...new Set(platforms.map((platform) => platform.toLowerCase().trim()).filter((platform) => allowed.includes(platform)))];
    }
    platformReadiness(platform) {
        const missing = [];
        if (platform === 'x') {
            if (!env.TWITTER_API_KEY)
                missing.push('TWITTER_API_KEY');
            if (!env.TWITTER_API_SECRET)
                missing.push('TWITTER_API_SECRET');
            if (!env.TWITTER_ACCESS_TOKEN)
                missing.push('TWITTER_ACCESS_TOKEN');
            if (!env.TWITTER_ACCESS_SECRET)
                missing.push('TWITTER_ACCESS_SECRET');
        }
        if (platform === 'facebook') {
            if (!env.FACEBOOK_PAGE_ID)
                missing.push('FACEBOOK_PAGE_ID');
            if (!env.FACEBOOK_PAGE_ACCESS_TOKEN)
                missing.push('FACEBOOK_PAGE_ACCESS_TOKEN');
        }
        if (platform === 'instagram') {
            if (!env.INSTAGRAM_BUSINESS_ACCOUNT_ID)
                missing.push('INSTAGRAM_BUSINESS_ACCOUNT_ID');
            if (!env.INSTAGRAM_ACCESS_TOKEN && !env.FACEBOOK_PAGE_ACCESS_TOKEN)
                missing.push('INSTAGRAM_ACCESS_TOKEN or FACEBOOK_PAGE_ACCESS_TOKEN');
        }
        if (platform === 'discord')
            missing.push('DISCORD_WEBHOOK_URL');
        if (platform === 'youtube')
            missing.push('YOUTUBE_CHANNEL_ID / YouTube API credentials');
        return { platform, configured: missing.length === 0, missing };
    }
    configuredPlatforms() {
        return this.normalizePlatforms(['x', 'instagram', 'facebook', 'discord', 'youtube'])
            .filter((platform) => this.platformReadiness(platform).configured);
    }
}
