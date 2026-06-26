import { getAiProvider } from '../providers/ai/index.js';
import { getString, getStringArray } from './base.js';
export class SeoAgent {
    name = 'seo-agent';
    version = '1.0.0';
    supports(jobType) {
        return jobType === 'seo.audit';
    }
    async run(job) {
        const input = job.input || {};
        const targetUrl = getString(input, 'targetUrl');
        const targetKeyword = getString(input, 'targetKeyword', job.vertical === 'pro_wrestling' ? 'pro wrestling fantasy predictions' : 'mma fantasy predictions');
        const pageTitle = getString(input, 'pageTitle', 'FantasyMMAdness');
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
                    recommendation: 'Add Article or SportsEvent schema only when event details are verified.',
                },
            ],
            schemaMarkup: {
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: pageTitle,
                about: targetKeyword,
                publisher: { '@type': 'Organization', name: 'FantasyMMAdness' },
            },
            internalLinkSuggestions: [
                { anchor: 'Fantasy leagues', targetPath: '/fantasy-leagues', reason: 'Connects informational search to active gameplay.' },
                { anchor: 'Blogs', targetPath: '/blogs', reason: 'Supports content discovery and recency.' },
            ],
            contentBrief: [
                `Introduce the user intent behind ${targetKeyword}.`,
                'Explain how the fantasy format works without changing official website rules.',
                ...secondaryKeywords.map((keyword) => `Naturally include secondary keyword: ${keyword}`),
            ],
        };
        const ai = getAiProvider();
        const aiResult = await ai.generateJson({
            system: 'You are a technical SEO assistant for FantasyMMAdness. Produce concise JSON only. Do not claim live rankings, odds, or event facts unless included in input.',
            user: JSON.stringify({ targetUrl, targetKeyword, pageTitle, secondaryKeywords, vertical: job.vertical }),
            schemaName: 'SeoAuditPayload',
            fallback,
            temperature: 0.2,
        });
        return {
            artifact: {
                jobId: job.jobId,
                vertical: job.vertical,
                jobType: job.jobType,
                artifactType: 'seo.audit-report',
                title: `SEO audit: ${targetKeyword}`,
                summary: aiResult.output.metaDescription,
                reviewStatus: 'AWAITING_REVIEW',
                payload: aiResult.output,
                provenance: {
                    provider: aiResult.provider,
                    model: aiResult.model,
                    promptVersion: 'seo-v1',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: { score: aiResult.warnings.length ? 76 : 90, warnings: aiResult.warnings },
                metadata: { mode: job.mode },
            },
            tokenUsage: aiResult.tokenUsage,
            warnings: aiResult.warnings,
        };
    }
}
