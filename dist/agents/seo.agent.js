import { getAiProvider } from '../providers/ai/index.js';
import { getString, getStringArray } from './base.js';
export class SeoAgent {
    name = 'seo-agent';
    version = '1.1.0';
    supports(jobType) {
        return jobType.startsWith('seo.');
    }
    async run(job) {
        const input = job.input || {};
        const targetUrl = getString(input, 'targetUrl');
        const sport = getString(input, 'sport', getString(input, 'discipline', job.vertical === 'pro_wrestling' ? 'pro_wrestling' : 'mma'));
        const targetKeyword = getString(input, 'targetKeyword', this.defaultKeyword(job, sport));
        const pageTitle = getString(input, 'pageTitle', getString(input, 'title', 'FantasyMMAdness'));
        const secondaryKeywords = getStringArray(input, 'secondaryKeywords');
        const fallback = {
            targetUrl: targetUrl || undefined,
            targetKeyword,
            metaTitle: `${pageTitle} | FantasyMMAdness`,
            metaDescription: `Improve FantasyMMAdness visibility for ${targetKeyword} with stronger metadata, structured content, and internal links.`,
            checks: [
                {
                    name: 'Metadata alignment',
                    status: 'warning',
                    severity: 'medium',
                    message: 'Metadata should directly include the primary fantasy keyword and event context.',
                    recommendation: 'Use a concise title and a benefit-focused description for fantasy players.',
                },
                {
                    name: 'Schema readiness',
                    status: 'warning',
                    severity: 'medium',
                    message: 'Structured data should be reviewed before publishing.',
                    recommendation: 'Add Article, SportsEvent, FAQPage, BreadcrumbList, or ProfilePage schema only when details are verified.',
                },
                {
                    name: 'Internal links',
                    status: 'warning',
                    severity: 'medium',
                    message: 'New or updated pages need internal links from related content.',
                    recommendation: 'Connect event, fighter/wrestler, contest, and blog URLs using clear fantasy-intent anchor text.',
                },
            ],
            schemaMarkup: this.defaultSchema(job, pageTitle, targetKeyword),
            internalLinkSuggestions: [
                { anchor: 'Fantasy leagues', targetPath: '/fantasy-leagues', reason: 'Connects informational search to active gameplay.' },
                { anchor: 'Blogs', targetPath: '/blogs', reason: 'Supports content discovery and recency.' },
            ],
            contentBrief: [
                `Introduce the user intent behind ${targetKeyword}.`,
                'Explain how the fantasy format works without changing official website rules.',
                ...secondaryKeywords.map((keyword) => `Naturally include secondary keyword: ${keyword}`),
            ],
            applicationPlan: this.applicationPlanFor(job.jobType),
        };
        const ai = getAiProvider();
        const aiResult = await ai.generateJson({
            system: 'You are a technical SEO assistant for FantasyMMAdness. Produce concise JSON only. Do not claim live rankings, odds, or event facts unless included in input. Create operational recommendations that backend/admin can apply safely.',
            user: JSON.stringify({
                targetUrl,
                targetKeyword,
                pageTitle,
                secondaryKeywords,
                vertical: job.vertical,
                jobType: job.jobType,
                automationKey: input.automationKey,
                targetOutput: input.targetOutput,
                suppliedPageInventory: input.pageInventory,
                suppliedEntity: job.sourceEntity,
                sport,
            }),
            schemaName: 'SeoAuditPayload',
            fallback,
            temperature: 0.2,
        });
        return {
            artifact: {
                jobId: job.jobId,
                vertical: job.vertical,
                jobType: job.jobType,
                artifactType: this.artifactTypeFor(job.jobType),
                title: `${this.titlePrefix(job.jobType)}: ${targetKeyword}`,
                summary: aiResult.output.metaDescription,
                reviewStatus: 'AWAITING_REVIEW',
                payload: { ...aiResult.output, applicationPlan: aiResult.output.applicationPlan || fallback.applicationPlan },
                provenance: {
                    provider: aiResult.provider,
                    model: aiResult.model,
                    promptVersion: 'seo-v2',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: { score: aiResult.warnings.length ? 76 : 90, warnings: aiResult.warnings },
                metadata: {
                    mode: job.mode,
                    automationKey: input.automationKey,
                    seoManagedBySwarm: true,
                    seoAppliedDirectly: false,
                    requiresBackendApply: true,
                    sport,
                },
            },
            tokenUsage: aiResult.tokenUsage,
            warnings: aiResult.warnings,
        };
    }
    artifactTypeFor(jobType) {
        if (jobType === 'seo.metadata' || jobType === 'seo.opengraph-twitter-cards' || jobType === 'seo.fighter-refresh')
            return 'seo.metadata-package';
        if (jobType === 'seo.schema-markup' || jobType === 'seo.fight-event-structured-data' || jobType === 'seo.fighter-wrestler-structured-data')
            return 'seo.schema-markup';
        if (jobType === 'seo.sitemap-refresh')
            return 'seo.sitemap-refresh-plan';
        if (jobType === 'seo.internal-links' || jobType === 'seo.related-post-linking')
            return 'seo.internal-link-plan';
        if (jobType === 'seo.keyword-opportunity')
            return 'seo.keyword-opportunity-report';
        if (jobType !== 'seo.audit' && jobType !== 'seo.blog-audit' && jobType !== 'seo.daily-audit' && jobType !== 'seo.weekly-traffic-opportunity')
            return 'seo.technical-issue-report';
        return 'seo.audit-report';
    }
    defaultKeyword(job, sport = 'mma') {
        if (sport === 'boxing')
            return 'boxing fantasy fight predictions';
        if (sport === 'kickboxing')
            return 'kickboxing fantasy fight predictions';
        if (job.jobType.includes('wrestler') || job.vertical === 'pro_wrestling')
            return 'pro wrestling fantasy predictions';
        if (job.jobType.includes('fighter'))
            return 'mma fighter fantasy profile';
        if (job.jobType.includes('event'))
            return 'mma fantasy event preview';
        return 'mma fantasy predictions';
    }
    titlePrefix(jobType) {
        if (jobType.includes('schema'))
            return 'Schema package';
        if (jobType.includes('sitemap'))
            return 'Sitemap plan';
        if (jobType.includes('link'))
            return 'Internal link plan';
        if (jobType.includes('keyword'))
            return 'Keyword opportunities';
        if (jobType.includes('missing') || jobType.includes('broken') || jobType.includes('duplicate') || jobType.includes('canonical'))
            return 'SEO issue report';
        return 'SEO audit';
    }
    applicationPlanFor(jobType) {
        const action = jobType.includes('sitemap')
            ? 'queue_sitemap_refresh'
            : jobType.includes('schema')
                ? 'apply_schema_markup_after_admin_approval'
                : jobType.includes('link')
                    ? 'apply_internal_link_suggestions_after_admin_approval'
                    : 'patch_page_seo_fields_after_admin_approval';
        return {
            managedBySwarm: true,
            requiresBackendApply: true,
            safeToAutoApply: false,
            targetFields: ['metaTitle', 'metaDescription', 'openGraph', 'twitterCard', 'schemaMarkup', 'internalLinks'],
            backendAction: action,
            notes: [
                'The swarm generates SEO packages and application instructions.',
                'The backend/frontend must approve and apply changes to website pages.',
                'This prevents automated SEO changes from silently modifying live content.',
            ],
        };
    }
    defaultSchema(job, pageTitle, targetKeyword) {
        const type = job.jobType.includes('faq') ? 'FAQPage' : job.jobType.includes('event') ? 'SportsEvent' : 'Article';
        return {
            '@context': 'https://schema.org',
            '@type': type,
            headline: pageTitle,
            about: targetKeyword,
            publisher: { '@type': 'Organization', name: 'FantasyMMAdness' },
        };
    }
}
