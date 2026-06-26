import { websiteBlogDraftSchema } from '../contracts/domain.js';
import { getAiProvider } from '../providers/ai/index.js';
import { slugify } from '../utils/slug.js';
import { getString, getStringArray } from './base.js';
export class ContentAgent {
    name = 'content-agent';
    version = '1.0.0';
    supports(jobType) {
        return ['content.article', 'content.match-preview', 'content.event-recap'].includes(jobType);
    }
    async run(job) {
        const input = job.input || {};
        const topic = getString(input, 'topic', this.defaultTopic(job));
        const eventName = getString(input, 'eventName');
        const matchTitle = getString(input, 'matchTitle');
        const tone = getString(input, 'tone', 'confident, analytical, fantasy-sports focused');
        const keywords = getStringArray(input, 'keywords');
        const targetAudience = getString(input, 'targetAudience', 'FantasyMMAdness players and combat-sports fans');
        const fallback = this.buildFallbackDraft(job, topic, eventName, matchTitle, keywords);
        const ai = getAiProvider();
        const aiResult = await ai.generateJson({
            system: 'You create production-ready FantasyMMAdness website content. Follow the existing website style. Never invent official results, payouts, wallet values, or locked contest data. Return a blog draft compatible with the existing Blog model: metaTitle, metaDescription, header, sections[].',
            user: JSON.stringify({
                vertical: job.vertical,
                jobType: job.jobType,
                topic,
                eventName,
                matchTitle,
                tone,
                keywords,
                targetAudience,
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
        const artifactType = job.jobType === 'content.match-preview'
            ? 'content.match-preview-draft'
            : job.jobType === 'content.event-recap'
                ? 'content.event-recap-draft'
                : 'content.article-draft';
        return {
            artifact: {
                jobId: job.jobId,
                vertical: job.vertical,
                jobType: job.jobType,
                artifactType,
                title: payload.header,
                summary: payload.metaDescription,
                reviewStatus: 'AWAITING_REVIEW',
                payload,
                provenance: {
                    provider: aiResult.provider,
                    model: aiResult.model,
                    promptVersion: 'content-v1',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: {
                    score: warnings.length ? 75 : 88,
                    warnings,
                },
                metadata: {
                    mapsToBackendModel: 'Blog',
                    mode: job.mode,
                },
            },
            tokenUsage: aiResult.tokenUsage,
            warnings,
        };
    }
    defaultTopic(job) {
        return job.vertical === 'pro_wrestling'
            ? 'Fantasy pro-wrestling match prediction strategy'
            : 'Fantasy combat sports prediction strategy';
    }
    buildFallbackDraft(job, topic, eventName, matchTitle, keywords) {
        const titleSubject = matchTitle || eventName || topic;
        const verticalLabel = job.vertical === 'pro_wrestling' ? 'Pro Wrestling' : 'Combat Sports';
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
