import { AUTOMATION_DEFINITIONS } from '../automations/definitions.js';
import type { ArtifactType } from '../contracts/artifacts.js';
import type { JobType } from '../contracts/job.js';
import type { SwarmJobDocument } from '../models/job.model.js';
import { getAiProvider } from '../providers/ai/index.js';
import type { AgentExecutionResult, SwarmAgent } from './base.js';
import { getString } from './base.js';

interface OperationalPayload extends Record<string, unknown> {
  title: string;
  summary: string;
  recommendedActions: Array<{ action: string; owner: 'admin' | 'backend' | 'frontend' | 'swarm'; risk: 'low' | 'medium' | 'high'; note: string }>;
  artifactsToCreate?: Array<{ jobType: string; reason: string }>;
  safety: {
    requiresAdminReview: boolean;
    directProductionWrites: boolean;
    notes: string[];
  };
}

export class AutomationAgent implements SwarmAgent {
  readonly name = 'automation-ops-agent';
  readonly version = '1.0.0';

  supports(jobType: JobType): boolean {
    return jobType.startsWith('automation.')
      || jobType.startsWith('analytics.')
      || jobType.startsWith('media.')
      || jobType.startsWith('notification.');
  }

  async run(job: SwarmJobDocument): Promise<AgentExecutionResult> {
    const input = job.input || {};
    const automationKey = getString(input, 'automationKey');
    const definition = automationKey ? AUTOMATION_DEFINITIONS.find((item) => item.key === automationKey) : undefined;
    const title = this.titleFor(job, definition?.label);
    const fallback: OperationalPayload = {
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
    const aiResult = await ai.generateJson<OperationalPayload>({
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

  private artifactTypeFor(jobType: JobType): ArtifactType {
    if (jobType.startsWith('analytics.')) return 'analytics.report';
    if (jobType.startsWith('media.')) return 'media.image-prompt';
    if (jobType.startsWith('notification.')) return 'notification.draft';
    return 'automation.control-plan';
  }

  private titleFor(job: SwarmJobDocument, label?: string): string {
    if (label) return label;
    if (job.jobType.startsWith('analytics.')) return `Analytics report: ${job.jobType}`;
    if (job.jobType.startsWith('media.')) return `Media prompt: ${job.jobType}`;
    if (job.jobType.startsWith('notification.')) return `Admin notification: ${job.jobType}`;
    return `Automation control plan: ${job.jobType}`;
  }

  private summaryFor(job: SwarmJobDocument, description?: string): string {
    if (description) return description;
    return `Operational artifact generated for ${job.jobType} in ${job.mode} mode.`;
  }

  private defaultActions(jobType: JobType): OperationalPayload['recommendedActions'] {
    if (jobType.startsWith('media.')) {
      return [
        { action: 'Review image prompt for brand safety', owner: 'admin', risk: 'medium', note: 'Avoid using unofficial logos, protected likenesses, or misleading event artwork.' },
        { action: 'Generate media through approved design workflow', owner: 'frontend', risk: 'medium', note: 'Phase 1 does not upload media to production.' },
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

  private defaultFollowUps(jobType: JobType): OperationalPayload['artifactsToCreate'] {
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
