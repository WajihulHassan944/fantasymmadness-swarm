import { getAiProvider } from '../providers/ai/index.js';
import { getString, getStringArray } from './base.js';
export class SocialAgent {
    name = 'social-agent';
    version = '1.0.0';
    supports(jobType) {
        return jobType === 'social.draft';
    }
    async run(job) {
        const input = job.input || {};
        const campaignName = getString(input, 'campaignName', job.vertical === 'pro_wrestling' ? 'Pro Wrestling Fantasy Contest' : 'Fight Fantasy Contest');
        const topic = getString(input, 'topic', campaignName);
        const platforms = getStringArray(input, 'platforms');
        const targetPlatforms = platforms.length ? platforms : ['x', 'instagram', 'facebook', 'discord'];
        const hashtags = getStringArray(input, 'hashtags');
        const fallback = {
            campaignName,
            publishMode: 'draft_only',
            posts: targetPlatforms.map((platform) => ({
                platform: platform,
                text: `Ready for ${topic}? Build your fantasy predictions on FantasyMMAdness and follow the action with strategy-first contest play.`,
                hashtags: [...new Set(['FantasyMMAdness', job.vertical === 'pro_wrestling' ? 'ProWrestling' : 'MMAFantasy', ...hashtags])],
                mediaSuggestion: 'Use approved event or athlete artwork from the existing website asset workflow.',
                callToAction: 'Join or review the latest FantasyMMAdness contests.',
            })),
            safetyNotes: ['Draft only. Do not publish until an admin approves platform copy and verified event details.'],
        };
        const ai = getAiProvider();
        const aiResult = await ai.generateJson({
            system: 'You create safe social-media drafts for FantasyMMAdness. Do not publish. Avoid unsupported odds, guarantees, or financial claims. Return JSON only.',
            user: JSON.stringify({ vertical: job.vertical, campaignName, topic, platforms: targetPlatforms, hashtags }),
            schemaName: 'SocialDraftPayload',
            fallback,
            temperature: 0.7,
        });
        return {
            artifact: {
                jobId: job.jobId,
                vertical: job.vertical,
                jobType: job.jobType,
                artifactType: 'social.post-draft',
                title: `Social drafts: ${campaignName}`,
                summary: `Draft-only social campaign for ${campaignName}.`,
                reviewStatus: 'AWAITING_REVIEW',
                payload: aiResult.output,
                provenance: {
                    provider: aiResult.provider,
                    model: aiResult.model,
                    promptVersion: 'social-v1',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: { score: aiResult.warnings.length ? 74 : 86, warnings: aiResult.warnings },
                metadata: { publishMode: 'draft_only', mode: job.mode },
            },
            tokenUsage: aiResult.tokenUsage,
            warnings: aiResult.warnings,
        };
    }
}
