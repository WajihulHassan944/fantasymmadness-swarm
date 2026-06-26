import type { JobType } from '../contracts/job.js';
import type { SwarmJobDocument } from '../models/job.model.js';
import { getAiProvider } from '../providers/ai/index.js';
import type { AgentExecutionResult, SwarmAgent } from './base.js';
import { getString, getStringArray } from './base.js';

interface SocialDraftPayload extends Record<string, unknown> {
  campaignName: string;
  publishMode: 'draft_only';
  posts: Array<{
    platform: 'x' | 'instagram' | 'facebook' | 'discord';
    text: string;
    hashtags: string[];
    mediaSuggestion?: string;
    callToAction: string;
  }>;
  safetyNotes: string[];
}

export class SocialAgent implements SwarmAgent {
  readonly name = 'social-agent';
  readonly version = '1.0.0';

  supports(jobType: JobType): boolean {
    return jobType === 'social.draft';
  }

  async run(job: SwarmJobDocument): Promise<AgentExecutionResult> {
    const input = job.input || {};
    const campaignName = getString(input, 'campaignName', job.vertical === 'pro_wrestling' ? 'Pro Wrestling Fantasy Contest' : 'Fight Fantasy Contest');
    const topic = getString(input, 'topic', campaignName);
    const platforms = getStringArray(input, 'platforms');
    const targetPlatforms = platforms.length ? platforms : ['x', 'instagram', 'facebook', 'discord'];
    const hashtags = getStringArray(input, 'hashtags');

    const fallback: SocialDraftPayload = {
      campaignName,
      publishMode: 'draft_only',
      posts: targetPlatforms.map((platform) => ({
        platform: platform as 'x' | 'instagram' | 'facebook' | 'discord',
        text: `Ready for ${topic}? Build your fantasy predictions on FantasyMMAdness and follow the action with strategy-first contest play.`,
        hashtags: [...new Set(['FantasyMMAdness', job.vertical === 'pro_wrestling' ? 'ProWrestling' : 'MMAFantasy', ...hashtags])],
        mediaSuggestion: 'Use approved event or athlete artwork from the existing website asset workflow.',
        callToAction: 'Join or review the latest FantasyMMAdness contests.',
      })),
      safetyNotes: ['Draft only. Do not publish until an admin approves platform copy and verified event details.'],
    };

    const ai = getAiProvider();
    const aiResult = await ai.generateJson<SocialDraftPayload>({
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
