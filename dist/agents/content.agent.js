import { websiteBlogDraftSchema } from '../contracts/domain.js';
import { getAiProvider } from '../providers/ai/index.js';
import { slugify } from '../utils/slug.js';
import { getString, getStringArray } from './base.js';
export class ContentAgent {
    name = 'content-agent';
    version = '1.1.0';
    supports(jobType) {
        return jobType.startsWith('content.');
    }
    async run(job) {
        if (this.isPlanJob(job.jobType))
            return this.runPlanJob(job);
        return this.runBlogLikeJob(job);
    }
    async runPlanJob(job) {
        const input = job.input || {};
        const topic = getString(input, 'topic', this.defaultTopic(job));
        const artifactType = this.artifactTypeFor(job.jobType);
        const fallback = this.buildPlanFallback(job, topic);
        const ai = getAiProvider();
        const aiResult = await ai.generateJson({
            system: 'You create FantasyMMAdness content planning artifacts. Return JSON only. Do not change official rules, scoring, contest logic, wallet behavior, or payouts.',
            user: JSON.stringify({ vertical: job.vertical, jobType: job.jobType, topic, input, sourceEntity: job.sourceEntity }),
            schemaName: 'ContentPlanPayload',
            fallback,
            temperature: 0.45,
        });
        const payload = { ...fallback, ...aiResult.output };
        return {
            artifact: {
                jobId: job.jobId,
                vertical: job.vertical,
                jobType: job.jobType,
                artifactType,
                title: payload.title,
                summary: payload.summary,
                reviewStatus: 'AWAITING_REVIEW',
                payload,
                provenance: {
                    provider: aiResult.provider,
                    model: aiResult.model,
                    promptVersion: 'content-plan-v1',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: { score: aiResult.warnings.length ? 74 : 86, warnings: aiResult.warnings },
                metadata: { mode: job.mode, automationKey: input.automationKey },
            },
            tokenUsage: aiResult.tokenUsage,
            warnings: aiResult.warnings,
        };
    }
    async runBlogLikeJob(job) {
        const input = job.input || {};
        const topic = getString(input, 'topic', this.defaultTopic(job));
        const sport = getString(input, 'sport', getString(input, 'discipline', job.vertical === 'pro_wrestling' ? 'pro_wrestling' : 'mma'));
        const eventName = getString(input, 'eventName');
        const matchTitle = getString(input, 'matchTitle');
        const tone = getString(input, 'tone', 'confident, analytical, fantasy-sports focused');
        const keywords = getStringArray(input, 'keywords');
        const targetAudience = getString(input, 'targetAudience', 'FantasyMMAdness players and combat-sports fans');
        const fallback = this.buildFallbackDraft(job, topic, eventName, matchTitle, keywords, sport);
        const ai = getAiProvider();
        const aiResult = await ai.generateJson({
            system: 'You create production-ready FantasyMMAdness website content. Follow the existing website style. Never invent official results, payouts, wallet values, locked contest data, or scoring rules. Return a blog draft compatible with the existing Blog model: metaTitle, metaDescription, header, sections[].',
            user: JSON.stringify({
                vertical: job.vertical,
                jobType: job.jobType,
                topic,
                eventName,
                matchTitle,
                tone,
                keywords,
                targetAudience,
                sport,
                sourceEntity: job.sourceEntity,
                automationKey: input.automationKey,
                targetOutput: input.targetOutput,
                currentWebsiteContract: {
                    blogFields: ['metaTitle', 'metaDescription', 'header', 'sections.title', 'sections.content', 'sections.headings'],
                    note: 'Backend will publish only after admin approval.',
                },
            }),
            schemaName: 'WebsiteBlogDraft',
            fallback,
        });
        const parsed = websiteBlogDraftSchema.safeParse({ ...aiResult.output, vertical: job.vertical });
        const payload = parsed.success ? parsed.data : fallback;
        const warnings = [...aiResult.warnings];
        if (!parsed.success)
            warnings.push('AI output did not fully match WebsiteBlogDraft schema; fallback draft was used.');
        return {
            artifact: {
                jobId: job.jobId,
                vertical: job.vertical,
                jobType: job.jobType,
                artifactType: this.artifactTypeFor(job.jobType),
                title: payload.header,
                summary: payload.metaDescription,
                reviewStatus: 'AWAITING_REVIEW',
                payload,
                provenance: {
                    provider: aiResult.provider,
                    model: aiResult.model,
                    promptVersion: 'content-v2',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: { score: warnings.length ? 75 : 88, warnings },
                metadata: {
                    mapsToBackendModel: this.mapsToBackendModel(job.jobType, job.vertical),
                    mode: job.mode,
                    automationKey: input.automationKey,
                    campaignId: input.campaignId,
                    campaignType: input.campaignType,
                    sport,
                },
            },
            tokenUsage: aiResult.tokenUsage,
            warnings,
        };
    }
    artifactTypeFor(jobType) {
        if (jobType === 'content.match-preview' || jobType === 'content.pro-wrestling-match-preview')
            return 'content.match-preview-draft';
        if (jobType === 'content.event-recap' || jobType === 'content.fight-result-recap' || jobType === 'content.pro-wrestling-result-recap')
            return 'content.event-recap-draft';
        if (jobType === 'content.fighter-profile' || jobType === 'content.wrestler-profile')
            return 'content.profile-draft';
        if (jobType.includes('newsletter'))
            return 'content.newsletter-draft';
        if (jobType === 'content.homepage-feature')
            return 'content.homepage-feature';
        if (jobType.includes('update-suggestion'))
            return 'content.content-update-suggestion';
        if (jobType === 'content.calendar')
            return 'content.calendar-plan';
        if (jobType === 'content.blog-topic-suggestions' || jobType === 'content.user-dashboard-opportunities')
            return 'content.topic-suggestions';
        if (jobType === 'content.faq')
            return 'content.faq-draft';
        if (jobType === 'content.how-to-play')
            return 'content.how-to-play-draft';
        if (jobType === 'content.landing-page-suggestion' || jobType === 'content.sport-landing-page-brief' || jobType === 'content.fight-detail-page-brief' || jobType === 'content.fighter-profile-page-brief')
            return 'content.landing-page-suggestion';
        return 'content.article-draft';
    }
    isPlanJob(jobType) {
        return [
            'content.calendar',
            'content.blog-topic-suggestions',
            'content.user-dashboard-opportunities',
            'content.newsletter-draft',
            'content.blog-newsletter-draft',
            'content.homepage-feature',
            'content.faq',
            'content.how-to-play',
            'content.landing-page-suggestion',
            'content.old-blog-update-suggestion',
            'content.fighter-update-suggestion',
            'content.sport-landing-page-brief',
            'content.fight-detail-page-brief',
            'content.fighter-profile-page-brief',
        ].includes(jobType);
    }
    mapsToBackendModel(jobType, vertical) {
        if (jobType === 'content.fighter-profile')
            return 'Fighter/ProfileContent';
        if (jobType === 'content.wrestler-profile')
            return 'ProWrestler/ProfileContent';
        if (jobType === 'content.homepage-feature')
            return 'HomepageFeature';
        if (jobType.includes('newsletter'))
            return 'NewsletterDraft';
        return vertical === 'pro_wrestling' ? 'Blog/ProWrestlingContent' : 'Blog';
    }
    defaultTopic(job) {
        return job.vertical === 'pro_wrestling'
            ? 'Fantasy pro-wrestling match prediction strategy'
            : 'Fantasy combat sports prediction strategy';
    }
    buildPlanFallback(job, topic) {
        const title = this.planTitle(job.jobType, topic);
        return {
            title,
            summary: `Automation-ready content plan for ${topic}.`,
            items: [
                {
                    title: `${topic}: fantasy-focused overview`,
                    contentType: this.contentTypeFor(job.jobType),
                    targetKeyword: job.vertical === 'pro_wrestling' ? 'pro wrestling fantasy predictions' : 'mma fantasy predictions',
                    priority: 'high',
                    recommendedJobType: 'content.article',
                    notes: 'Review for factual accuracy and align with current site rules before publishing.',
                },
                {
                    title: `${topic}: social promotion angle`,
                    contentType: 'social_draft',
                    priority: 'medium',
                    recommendedJobType: 'social.draft',
                    notes: 'Use only after admin approval and platform credential validation.',
                },
            ],
            publishingNotes: [
                'Backend owns final publishing.',
                'Admin review is recommended before live content or social publishing.',
            ],
        };
    }
    planTitle(jobType, topic) {
        if (jobType === 'content.calendar')
            return `Content calendar: ${topic}`;
        if (jobType === 'content.blog-topic-suggestions')
            return `Blog topic suggestions: ${topic}`;
        if (jobType === 'content.user-dashboard-opportunities')
            return `User dashboard opportunities: ${topic}`;
        if (jobType.includes('newsletter'))
            return `Newsletter draft: ${topic}`;
        if (jobType === 'content.homepage-feature')
            return `Homepage feature copy: ${topic}`;
        if (jobType === 'content.faq')
            return `FAQ draft: ${topic}`;
        if (jobType === 'content.how-to-play')
            return `How-to-play content: ${topic}`;
        if (jobType === 'content.landing-page-suggestion' || jobType === 'content.sport-landing-page-brief')
            return `Sport landing page brief: ${topic}`;
        if (jobType === 'content.fight-detail-page-brief')
            return `Fight detail page brief: ${topic}`;
        if (jobType === 'content.fighter-profile-page-brief')
            return `Fighter/wrestler profile page brief: ${topic}`;
        return `Content update suggestion: ${topic}`;
    }
    contentTypeFor(jobType) {
        if (jobType === 'content.calendar')
            return 'content_calendar';
        if (jobType === 'content.blog-topic-suggestions')
            return 'topic_suggestion';
        if (jobType === 'content.user-dashboard-opportunities')
            return 'dashboard_opportunity';
        if (jobType.includes('newsletter'))
            return 'newsletter';
        if (jobType === 'content.homepage-feature')
            return 'homepage_feature';
        if (jobType === 'content.faq')
            return 'faq';
        if (jobType === 'content.how-to-play')
            return 'how_to_play';
        if (jobType === 'content.landing-page-suggestion' || jobType === 'content.sport-landing-page-brief')
            return 'sport_landing_page';
        if (jobType === 'content.fight-detail-page-brief')
            return 'fight_detail_page';
        if (jobType === 'content.fighter-profile-page-brief')
            return 'profile_page';
        return 'content_update';
    }
    verticalLabel(vertical, sport = 'mma') {
        if (vertical === 'pro_wrestling')
            return 'Pro Wrestling';
        if (sport === 'boxing')
            return 'Boxing';
        if (sport === 'kickboxing')
            return 'Kickboxing';
        return 'MMA';
    }
    buildFallbackDraft(job, topic, eventName, matchTitle, keywords, sport = 'mma') {
        const titleSubject = matchTitle || eventName || topic;
        const verticalLabel = this.verticalLabel(job.vertical, sport);
        const header = `${titleSubject}: ${verticalLabel} Fantasy Preview`;
        return {
            vertical: job.vertical,
            metaTitle: `${header} | FantasyMMAdness`,
            metaDescription: `FantasyMMAdness preview for ${titleSubject}, including key angles, prediction context, and player-focused strategy notes.`,
            header,
            slug: slugify(header),
            tags: [...new Set([verticalLabel, 'FantasyMMAdness', ...keywords])],
            sections: [
                {
                    title: 'Overview',
                    content: `${titleSubject} is prepared as a FantasyMMAdness draft for admin review. This section should be refined with confirmed event details before publishing.`,
                    headings: [
                        {
                            title: 'Fantasy angle',
                            content: job.vertical === 'pro_wrestling'
                                ? 'Focus on HP, BP, K, PM, FM volume patterns, winner selection, and match-format context.'
                                : sport === 'boxing'
                                    ? 'Focus on boxing style, pace, round-by-round activity, knockdown risk, durability, and fantasy contest strategy.'
                                    : 'Focus on matchup tendencies, finishing risk, fight pace, fantasy scoring categories, and contest strategy.',
                        },
                    ],
                },
                {
                    title: 'What players should watch',
                    content: 'Players should compare recent form, matchup style, expected pace, and contest lock timing before submitting predictions.',
                    headings: [],
                },
                {
                    title: 'Admin publishing notes',
                    content: 'Verify names, schedule, images, and any official event details before publishing this draft to the live website.',
                    headings: [],
                },
            ],
        };
    }
}
