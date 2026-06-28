import { env } from '../config/env.js';
import type { JobType } from '../contracts/job.js';
import type { SwarmJobDocument } from '../models/job.model.js';
import { getAiProvider } from '../providers/ai/index.js';
import type { AgentExecutionResult, SwarmAgent } from './base.js';
import { getString, getStringArray } from './base.js';

interface SocialDraftPayload extends Record<string, unknown> {
  campaignName: string;
  publishMode: 'draft_only' | 'approval_required' | 'automation_ready';
  posts: Array<{
    platform: 'x' | 'instagram' | 'facebook' | 'discord' | 'youtube';
    text: string;
    hashtags: string[];
    mediaSuggestion?: string;
    callToAction: string;
  }>;
  safetyNotes: string[];
  publicationReadiness: {
    canAutoPublish: boolean;
    reason: string;
    configuredPlatforms: string[];
  };
}

export class SocialAgent implements SwarmAgent {
  readonly name = 'social-agent';
  readonly version = '1.1.0';

  supports(jobType: JobType): boolean {
    return jobType.startsWith('social.');
  }

  async run(job: SwarmJobDocument): Promise<AgentExecutionResult> {
    const input = job.input || {};
    const sport = getString(input, 'sport', getString(input, 'discipline', job.vertical === 'pro_wrestling' ? 'pro_wrestling' : 'mma'));
    const campaignName = getString(input, 'campaignName', this.defaultCampaignName(job, sport));
    const topic = getString(input, 'topic', getString(input, 'title', campaignName));
    const platforms = getStringArray(input, 'platforms');
    const targetPlatforms = platforms.length ? platforms : this.defaultPlatforms(job.jobType);
    const hashtags = getStringArray(input, 'hashtags');
    const canAutoPublish = job.mode === 'AUTOMATED' && env.SWARM_SOCIAL_PUBLISH_ENABLED && this.hasTwitterCredentials(targetPlatforms);

    const fallback: SocialDraftPayload = {
      campaignName,
      publishMode: canAutoPublish ? 'automation_ready' : job.mode === 'APPROVAL_REQUIRED' ? 'approval_required' : 'draft_only',
      posts: targetPlatforms.map((platform) => ({
        platform: platform as 'x' | 'instagram' | 'facebook' | 'discord' | 'youtube',
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
          ? 'Job requested AUTOMATED mode and X/Twitter credentials are configured.'
          : 'Current Phase 1 output is a draft artifact; backend/admin approval should publish later.',
        configuredPlatforms: this.configuredPlatforms(),
      },
    };

    const ai = getAiProvider();
    const aiResult = await ai.generateJson<SocialDraftPayload>({
      system: 'You create safe social-media drafts for FantasyMMAdness. Avoid unsupported odds, guarantees, financial claims, or unverified results. Return JSON only. Keep posts concise and platform-ready.',
      user: JSON.stringify({ vertical: job.vertical, jobType: job.jobType, sport, campaignName, topic, platforms: targetPlatforms, hashtags, automationKey: input.automationKey, campaignId: input.campaignId, targetOutput: input.targetOutput }),
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

  private defaultCampaignName(job: SwarmJobDocument, sport = 'mma'): string {
    if (job.jobType.includes('winner')) return 'FantasyMMAdness winners announcement';
    if (job.jobType.includes('reminder')) return 'FantasyMMAdness contest reminder';
    if (job.jobType.includes('blog')) return 'FantasyMMAdness blog promotion';
    if (job.vertical === 'pro_wrestling') return 'Pro Wrestling Fantasy Contest';
    if (sport === 'boxing') return 'Boxing Fantasy Fight Campaign';
    if (sport === 'kickboxing') return 'Kickboxing Fantasy Fight Campaign';
    return 'Fight Fantasy Contest';
  }

  private defaultSportHashtag(vertical: string, sport = 'mma'): string {
    if (vertical === 'pro_wrestling') return 'ProWrestling';
    if (sport === 'boxing') return 'BoxingFantasy';
    if (sport === 'kickboxing') return 'KickboxingFantasy';
    return 'MMAFantasy';
  }

  private defaultPlatforms(jobType: JobType): string[] {
    if (jobType.includes('discord')) return ['discord'];
    if (jobType.includes('youtube')) return ['youtube', 'x'];
    return ['x'];
  }

  private defaultPostText(jobType: JobType, topic: string): string {
    if (jobType.includes('result')) return `${topic} is updated. Review the action, strategy notes, and fantasy implications on FantasyMMAdness.`;
    if (jobType.includes('reminder')) return `${topic} is closing soon. Lock in your FantasyMMAdness predictions before the deadline.`;
    if (jobType.includes('winner')) return `FantasyMMAdness contest results are ready. Check the winners announcement and latest leaderboard updates.`;
    if (jobType.includes('blog')) return `New on FantasyMMAdness: ${topic}. Read the latest fantasy-focused breakdown.`;
    return `Ready for ${topic}? Build your fantasy predictions on FantasyMMAdness and follow the action with strategy-first contest play.`;
  }

  private defaultCallToAction(jobType: JobType): string {
    if (jobType.includes('blog')) return 'Read the latest FantasyMMAdness breakdown.';
    if (jobType.includes('reminder')) return 'Enter or update your predictions before lock time.';
    return 'Join or review the latest FantasyMMAdness contests.';
  }

  private hasTwitterCredentials(platforms: string[]): boolean {
    if (!platforms.includes('x')) return false;
    return Boolean(env.TWITTER_API_KEY && env.TWITTER_API_SECRET && env.TWITTER_ACCESS_TOKEN && env.TWITTER_ACCESS_SECRET);
  }

  private configuredPlatforms(): string[] {
    const platforms: string[] = [];
    if (this.hasTwitterCredentials(['x'])) platforms.push('x');
    return platforms;
  }
}
