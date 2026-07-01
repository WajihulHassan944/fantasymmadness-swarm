import { env } from '../config/env.js';
import { getAiProvider } from '../providers/ai/index.js';
import { getString, getStringArray } from './base.js';
export class SocialAgent {
    name = 'social-agent';
    version = '1.2.0';
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
        const canAutoPublish = job.mode === 'AUTOMATED'
            && env.SWARM_SOCIAL_PUBLISH_ENABLED
            && platformReadiness.length > 0
            && platformReadiness.every((item) => item.configured);
        const fallback = this.buildFallbackPayload(job, {
            campaignName,
            topic,
            sport,
            targetPlatforms,
            hashtags,
            platformReadiness,
            canAutoPublish,
        });
        const ai = getAiProvider();
        const aiResult = await ai.generateJson({
            system: 'You create safe social-media and YouTube growth drafts for FantasyMMAdness. Avoid unsupported odds, guarantees, financial claims, unverified results, fake community percentages, or direct payout claims. Return JSON only. Every visual asset must include a small FantasyMMAdness logo overlay in a corner when a logo URL is configured. Every YouTube video must end with the exact required CTA supplied in the input.',
            user: JSON.stringify({
                vertical: job.vertical,
                jobType: job.jobType,
                sport,
                campaignName,
                topic,
                platforms: targetPlatforms,
                hashtags,
                automationKey: input.automationKey,
                campaignId: input.campaignId,
                campaignType: input.campaignType,
                targetOutput: input.targetOutput,
                postingGoal: input.postingGoal || '10,000 July signups through content, prediction CTA, signup, and return visits',
                requiredYouTubeEndingLine: this.requiredYouTubeEndingLine(),
                brandOverlay: this.brandOverlay(),
                dailyTargets: this.dailyTargets(),
            }),
            schemaName: 'SocialDraftPayload',
            fallback,
            temperature: 0.7,
        });
        const output = {
            ...fallback,
            ...aiResult.output,
            publicationReadiness: fallback.publicationReadiness,
            brandOverlay: fallback.brandOverlay,
            dailyTargets: fallback.dailyTargets,
        };
        const warnings = [...aiResult.warnings];
        if (!env.BRAND_LOGO_URL)
            warnings.push('BRAND_LOGO_URL is not configured; visual briefs require a small logo overlay but cannot point to a concrete logo yet.');
        return {
            artifact: {
                jobId: job.jobId,
                vertical: job.vertical,
                jobType: job.jobType,
                artifactType: job.jobType === 'social.calendar' ? 'social.calendar-plan' : 'social.post-draft',
                title: `Social drafts: ${campaignName}`,
                summary: `Social and growth automation draft for ${campaignName}.`,
                reviewStatus: 'AWAITING_REVIEW',
                payload: output,
                provenance: {
                    provider: aiResult.provider,
                    model: aiResult.model,
                    promptVersion: 'social-growth-v3',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: { score: warnings.length ? 74 : 88, warnings },
                metadata: {
                    publishMode: output.publishMode,
                    canAutoPublish,
                    mode: job.mode,
                    automationKey: input.automationKey,
                    campaignId: input.campaignId,
                    campaignType: input.campaignType,
                    sport,
                    growthSystem: this.isGrowthJob(job.jobType) ? 'july-10000-signups' : undefined,
                    livePostingImplementedBy: 'backend-or-social-provider-adapter-after-approval',
                },
            },
            tokenUsage: aiResult.tokenUsage,
            warnings,
        };
    }
    buildFallbackPayload(job, context) {
        const publishMode = context.canAutoPublish ? 'automation_ready' : job.mode === 'APPROVAL_REQUIRED' ? 'approval_required' : 'draft_only';
        const base = {
            campaignName: context.campaignName,
            publishMode,
            posts: [],
            safetyNotes: this.safetyNotes(job.jobType),
            dailyTargets: this.dailyTargets(),
            brandOverlay: this.brandOverlay(),
            publicationReadiness: {
                canAutoPublish: context.canAutoPublish,
                reason: context.canAutoPublish
                    ? 'Job requested AUTOMATED mode, social publishing flag is enabled, and all selected platform credentials are configured.'
                    : 'Current output is approval-first. Backend/admin approval should publish later. Live posting needs platform credentials, logo configuration, and backend approval controls.',
                configuredPlatforms: this.configuredPlatforms(),
                platformReadiness: context.platformReadiness,
            },
        };
        if (job.jobType === 'social.youtube-growth-video-draft') {
            const videos = this.youtubeVideoDrafts(context.topic, context.sport);
            return {
                ...base,
                youtubeVideos: videos,
                posts: videos.map((video) => ({
                    platform: 'youtube',
                    text: `${video.title}\n\n${video.outline.join(' ')}\n\n${video.requiredEndingLine}`,
                    hashtags: this.hashtags(job.vertical, context.sport, context.hashtags, ['FantasyMMadness', 'FightPredictions', 'CombatSports']),
                    mediaSuggestion: video.thumbnailBrief,
                    callToAction: video.requiredEndingLine,
                    scheduledSlot: video.slot,
                    contentPillar: 'youtube_long_form_trust_engine',
                    visualBrief: video.thumbnailBrief,
                })),
            };
        }
        if (job.jobType === 'social.short-form-video-pack') {
            const clips = this.shortFormClips(context.topic, context.sport);
            return {
                ...base,
                shortFormClips: clips,
                posts: clips.flatMap((clip) => context.targetPlatforms.map((platform) => ({
                    platform,
                    text: `${clip.hook} ${clip.callToAction}`,
                    hashtags: this.hashtags(job.vertical, context.sport, context.hashtags, ['FantasyMMAdness', 'FightPicks']),
                    mediaSuggestion: clip.visualBrief,
                    callToAction: clip.callToAction,
                    scheduledSlot: '5 PM short-form drop',
                    contentPillar: 'short_form_mass_reach',
                    visualBrief: clip.visualBrief,
                }))),
            };
        }
        const postCount = this.postCountFor(job.jobType, context.targetPlatforms[0]);
        const posts = [];
        for (const platform of context.targetPlatforms) {
            for (let index = 0; index < postCount; index += 1) {
                posts.push({
                    platform,
                    text: this.defaultPostText(job.jobType, context.topic, index),
                    hashtags: this.hashtags(job.vertical, context.sport, context.hashtags),
                    mediaSuggestion: this.defaultMediaSuggestion(job.jobType, context.topic),
                    callToAction: this.defaultCallToAction(job.jobType),
                    scheduledSlot: this.defaultScheduledSlot(job.jobType, platform, index),
                    contentPillar: this.contentPillarFor(job.jobType),
                    visualBrief: this.defaultMediaSuggestion(job.jobType, context.topic),
                });
            }
        }
        return { ...base, posts };
    }
    youtubeVideoDrafts(topic, sport = 'mma') {
        const requiredEndingLine = this.requiredYouTubeEndingLine();
        const logoNote = this.logoNote();
        const count = Math.max(2, Math.min(4, env.GROWTH_DAILY_YOUTUBE_VIDEOS));
        const templates = [
            {
                slot: '10 AM',
                title: `Fantasy MMadness Picks for Tonight: ${topic}`,
                format: 'Morning upcoming fight predictions',
                duration: '5-10 min',
                outline: ['Event context', 'Key matchups', 'Prediction angles', 'Community discussion prompt', 'Signup CTA'],
                thumbnailBrief: `High-contrast fight prediction thumbnail with event title, two-fighter layout, prediction visual cue, and ${logoNote}.`,
                requiredEndingLine,
            },
            {
                slot: '2 PM',
                title: `Quick Breakdown: Keys to Victory for ${topic}`,
                format: 'Afternoon quick breakdown',
                duration: '2-5 min',
                outline: ['Fighter strengths', 'Risk factors', 'Fantasy scoring angles', 'Community picks if supplied', 'Signup CTA'],
                thumbnailBrief: `Clean tactical breakdown thumbnail with 3 key bullets, combat-sports background, and ${logoNote}.`,
                requiredEndingLine,
            },
            {
                slot: '7 PM',
                title: `Live Countdown: Last Picks Before ${topic}`,
                format: 'Event-day live countdown',
                duration: '10-20 min',
                outline: ['Countdown status', 'Last prediction reminders', 'Fan questions', 'Leaderboard/rankings hook', 'Signup CTA'],
                thumbnailBrief: `Countdown thumbnail with timer motif, prediction deadline warning, and ${logoNote}.`,
                requiredEndingLine,
            },
            {
                slot: '10 PM',
                title: `Results Show: Winners, Leaderboard, and Surprises from ${topic}`,
                format: 'Post-event result show',
                duration: '5-15 min',
                outline: ['Result summary only from verified input', 'Biggest surprises', 'Leaderboard mention if supplied', 'Next event teaser', 'Return-visit CTA'],
                thumbnailBrief: `Results recap thumbnail with winner/leaderboard energy, no unverified claims, and ${logoNote}.`,
                requiredEndingLine,
            },
        ];
        return templates.slice(0, count);
    }
    shortFormClips(topic, sport = 'mma') {
        const count = Math.max(5, Math.min(10, env.GROWTH_DAILY_SHORTS));
        const logoNote = this.logoNote();
        const cta = 'Make your picks on Fantasy MMadness before the event starts.';
        const hooks = [
            `This ${this.sportLabel(sport)} pick could split the community.`,
            `Before ${topic} starts, watch this one matchup angle.`,
            'Most fans are missing the fantasy scoring angle here.',
            'One round can change the whole leaderboard.',
            'Do not make your prediction before checking this.',
            'The safest pick might not be the smartest fantasy pick.',
            'Tonight is a prediction deadline test.',
            'This fight has upset potential.',
            'The leaderboard can move fast after this card.',
            'Your pick only matters if it is locked before the event.',
        ];
        return hooks.slice(0, count).map((hook, index) => ({
            platformGroup: ['YouTube Shorts', 'Instagram Reels', 'Facebook Reels', 'X'],
            hook,
            duration: '15-45 sec',
            scriptBeats: [
                'Open with a clear prediction or conflict hook.',
                'Show the fighter/event visual or approved poster.',
                'Add one fantasy scoring or leaderboard angle.',
                'End with the signup/prediction CTA.',
            ],
            overlayText: [
                index % 2 === 0 ? 'LOCK YOUR PICK' : 'PREDICTION DEADLINE',
                'Fantasy MMadness',
                'Make your picks before the event starts',
            ],
            visualBrief: `Vertical 9:16 combat-sports clip with bold text overlays, approved event/fighter art, countdown/prediction motif, and ${logoNote}.`,
            callToAction: cta,
        }));
    }
    defaultCampaignName(job, sport = 'mma') {
        if (this.isGrowthJob(job.jobType))
            return 'Fantasy MMadness July 10,000 Signup Growth System';
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
        if (jobType === 'social.youtube-growth-video-draft')
            return ['youtube'];
        if (jobType === 'social.short-form-video-pack')
            return ['youtube', 'instagram', 'facebook', 'x'];
        if (jobType === 'social.x-growth-posts')
            return ['x'];
        if (jobType === 'social.instagram-growth-posts')
            return ['instagram'];
        if (jobType === 'social.facebook-growth-posts')
            return ['facebook'];
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
    defaultPostText(jobType, topic, index = 0) {
        if (jobType === 'social.x-growth-posts')
            return `${topic}: prediction window is open. Post ${index + 1}: pick angle, deadline reminder, or live reaction. Make your picks on Fantasy MMadness before the event starts.`;
        if (jobType === 'social.instagram-growth-posts')
            return `${topic} is built for predictions. Use the poster, poll, or story frame to push fans toward Fantasy MMadness picks before lock time.`;
        if (jobType === 'social.facebook-growth-posts')
            return `${topic} discussion: who are you backing and why? Make your picks on Fantasy MMadness before the event starts.`;
        if (jobType.includes('result'))
            return `${topic} is updated. Review the action, strategy notes, and fantasy implications on FantasyMMAdness.`;
        if (jobType.includes('reminder'))
            return `${topic} is closing soon. Lock in your FantasyMMAdness predictions before the deadline.`;
        if (jobType.includes('winner'))
            return 'FantasyMMAdness contest results are ready. Check the winners announcement and latest leaderboard updates.';
        if (jobType.includes('blog'))
            return `New on FantasyMMAdness: ${topic}. Read the latest fantasy-focused breakdown.`;
        return `Ready for ${topic}? Build your fantasy predictions on FantasyMMAdness and follow the action with strategy-first contest play.`;
    }
    defaultCallToAction(jobType) {
        if (this.isGrowthJob(jobType) || jobType.includes('youtube'))
            return 'Make your picks on Fantasy MMadness before the event starts.';
        if (jobType.includes('blog'))
            return 'Read the latest FantasyMMAdness breakdown.';
        if (jobType.includes('reminder'))
            return 'Enter or update your predictions before lock time.';
        return 'Join or review the latest FantasyMMAdness contests.';
    }
    defaultMediaSuggestion(jobType, topic) {
        const logoNote = this.logoNote();
        if (jobType === 'social.instagram-growth-posts')
            return `Instagram 4:5 or 9:16 prediction graphic for ${topic}, with poster/poll/story variant and ${logoNote}.`;
        if (jobType === 'social.facebook-growth-posts')
            return `Facebook discussion graphic for ${topic}, community question layout, event/prediction visual, and ${logoNote}.`;
        if (jobType === 'social.x-growth-posts')
            return `X-friendly fight prediction card or live-reaction graphic for ${topic}, concise text, and ${logoNote}.`;
        return `Use approved event, fighter, wrestler, contest, or blog artwork with ${logoNote}.`;
    }
    defaultScheduledSlot(jobType, platform, index) {
        if (jobType === 'social.x-growth-posts')
            return ['8 AM', '10 AM', '12 PM', '2 PM', '5 PM', '7 PM', '10 PM'][index % 7] || 'rolling X slot';
        if (platform === 'instagram')
            return ['8 AM', '5 PM', '7 PM', '10 PM'][index % 4] || 'Instagram slot';
        if (platform === 'facebook')
            return ['12 PM', '7 PM', '10 PM'][index % 3] || 'Facebook slot';
        if (platform === 'youtube')
            return ['10 AM', '2 PM', '7 PM', '10 PM'][index % 4] || 'YouTube slot';
        return 'daily publishing slot';
    }
    contentPillarFor(jobType) {
        if (jobType.includes('youtube'))
            return 'long_form_trust_and_discovery';
        if (jobType.includes('short-form'))
            return 'mass_reach_short_form';
        if (jobType.includes('instagram'))
            return 'fast_awareness';
        if (jobType.includes('facebook'))
            return 'community_engagement';
        if (jobType.includes('x-growth'))
            return 'real_time_visibility';
        return 'content_to_prediction_to_signup';
    }
    postCountFor(jobType, platform) {
        if (jobType === 'social.instagram-growth-posts')
            return Math.max(4, Math.min(6, env.GROWTH_DAILY_INSTAGRAM_POSTS));
        if (jobType === 'social.facebook-growth-posts')
            return Math.max(3, Math.min(5, env.GROWTH_DAILY_FACEBOOK_POSTS));
        if (jobType === 'social.x-growth-posts')
            return Math.max(8, Math.min(15, env.GROWTH_DAILY_X_POSTS));
        if (jobType === 'social.multi-platform-daily-posts') {
            if (platform === 'instagram')
                return Math.max(4, Math.min(6, env.GROWTH_DAILY_INSTAGRAM_POSTS));
            if (platform === 'facebook')
                return Math.max(3, Math.min(5, env.GROWTH_DAILY_FACEBOOK_POSTS));
            if (platform === 'x')
                return Math.max(8, Math.min(15, env.GROWTH_DAILY_X_POSTS));
        }
        return 1;
    }
    hashtags(vertical, sport, extra, defaults = []) {
        return [...new Set(['FantasyMMAdness', this.defaultSportHashtag(vertical, sport), ...defaults, ...extra])];
    }
    dailyTargets() {
        return {
            julySignupGoal: env.JULY_SIGNUP_GOAL,
            timezone: env.GROWTH_TIMEZONE,
            instagram: `${Math.max(4, Math.min(6, env.GROWTH_DAILY_INSTAGRAM_POSTS))} posts/day`,
            facebook: `${Math.max(3, Math.min(5, env.GROWTH_DAILY_FACEBOOK_POSTS))} posts/day`,
            x: `${Math.max(8, Math.min(15, env.GROWTH_DAILY_X_POSTS))} posts/day`,
            youtube: `${Math.max(2, Math.min(4, env.GROWTH_DAILY_YOUTUBE_VIDEOS))} videos/day`,
            shorts: `${Math.max(5, Math.min(10, env.GROWTH_DAILY_SHORTS))} clips/day`,
            blogs: `${Math.max(2, Math.min(4, env.GROWTH_DAILY_BLOGS))} articles/day`,
            stories: `${Math.max(5, Math.min(10, env.GROWTH_DAILY_STORIES))} stories/day`,
            notifications: `${Math.max(2, Math.min(3, env.GROWTH_DAILY_NOTIFICATIONS))} notifications/day`,
            totalAssetCap: env.SWARM_DAILY_CONTENT_ASSET_CAP,
        };
    }
    brandOverlay() {
        return {
            required: true,
            logoUrl: env.BRAND_LOGO_URL,
            position: env.BRAND_LOGO_CORNER,
            opacity: env.BRAND_LOGO_OPACITY,
            note: env.BRAND_LOGO_URL
                ? `Place the Fantasy MMadness logo small in the ${env.BRAND_LOGO_CORNER} corner on every generated visual.`
                : 'Place the Fantasy MMadness logo small in a corner on every generated visual after BRAND_LOGO_URL is configured.',
        };
    }
    logoNote() {
        return env.BRAND_LOGO_URL
            ? `small Fantasy MMadness logo in the ${env.BRAND_LOGO_CORNER} corner`
            : 'small Fantasy MMadness logo in a corner once BRAND_LOGO_URL is configured';
    }
    requiredYouTubeEndingLine() {
        return 'Make your picks on Fantasy MMadness before the event starts.';
    }
    safetyNotes(jobType) {
        const notes = [
            'Draft first. Do not publish unsupported odds, guarantees, payouts, or unverified result claims.',
            'Live platform posting should remain disabled until backend/admin approval flow is tested.',
            'Every visual post should include a small Fantasy MMadness logo overlay in a corner.',
        ];
        if (jobType.includes('youtube'))
            notes.push(`Every YouTube video must end with: "${this.requiredYouTubeEndingLine()}"`);
        return notes;
    }
    isGrowthJob(jobType) {
        return jobType.includes('growth') || jobType.includes('short-form');
    }
    sportLabel(sport = 'mma') {
        if (sport === 'boxing')
            return 'boxing';
        if (sport === 'kickboxing')
            return 'kickboxing';
        if (sport === 'pro_wrestling')
            return 'pro-wrestling';
        return 'combat sports';
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
        if (platform === 'youtube') {
            if (!env.YOUTUBE_CHANNEL_ID)
                missing.push('YOUTUBE_CHANNEL_ID');
            if (env.YOUTUBE_UPLOAD_ENABLED) {
                if (!env.YOUTUBE_CLIENT_ID)
                    missing.push('YOUTUBE_CLIENT_ID');
                if (!env.YOUTUBE_CLIENT_SECRET)
                    missing.push('YOUTUBE_CLIENT_SECRET');
                if (!env.YOUTUBE_REFRESH_TOKEN)
                    missing.push('YOUTUBE_REFRESH_TOKEN');
            }
        }
        return { platform, configured: missing.length === 0, missing };
    }
    configuredPlatforms() {
        return this.normalizePlatforms(['x', 'instagram', 'facebook', 'discord', 'youtube'])
            .filter((platform) => this.platformReadiness(platform).configured);
    }
}
