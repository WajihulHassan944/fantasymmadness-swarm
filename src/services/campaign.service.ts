import type { FilterQuery } from 'mongoose';
import { AUTOMATION_DEFINITIONS, automationByKey, type AutomationDefinition } from '../automations/definitions.js';
import {
  createCampaignSchema,
  listCampaignsQuerySchema,
  type CampaignSection,
  type CampaignStatus,
  type CampaignType,
  type CombatSport,
  type CreateCampaignInput,
} from '../contracts/campaign.js';
import type { SwarmMode, Vertical } from '../contracts/domain.js';
import { SwarmCampaign, type SwarmCampaignDocument } from '../models/campaign.model.js';
import { SwarmJob } from '../models/job.model.js';
import { AutomationLog } from '../models/automation-log.model.js';
import { createJob } from './job.service.js';
import { AppError } from '../utils/errors.js';
import { isoDateKey } from '../utils/time.js';

interface CampaignPack {
  campaignType: CampaignType;
  label: string;
  description: string;
  defaultVertical: Vertical;
  defaultSport: CombatSport;
  defaultSections: CampaignSection[];
  automationKeys: string[];
}

const FIGHT_PUBLISH_KEYS = [
  'fight.publish.blogDraft',
  'fight.publish.twitterPost',
  'fight.publish.seoMetadata',
  'fight.publish.schemaMarkup',
  'fight.publish.sitemapRefresh',
  'fight.publish.internalLinks',
  'fight.publish.newsletterDraft',
];

const TONIGHT_EXTRA_KEYS = [
  'event.upcoming.homepageFeature',
  'event.upcoming.promotionalSocial',
  'blog.approved.imagePrompt',
  'seo.openGraphTwitterCards',
  'seo.fightEventStructuredData',
];

const CAMPAIGN_PACKS: CampaignPack[] = [
  {
    campaignType: 'fight_full_campaign',
    label: 'Fight full campaign',
    description: 'Run all safe content, SEO, social, media, newsletter, and promotion agents for one fight.',
    defaultVertical: 'combat',
    defaultSport: 'mma',
    defaultSections: ['content', 'seo', 'social', 'media'],
    automationKeys: [...FIGHT_PUBLISH_KEYS, ...TONIGHT_EXTRA_KEYS],
  },
  {
    campaignType: 'fight_tonight_campaign',
    label: 'Promote tonight fight',
    description: 'Create same-day promotional blog, social, SEO, homepage, newsletter, and image-prompt artifacts.',
    defaultVertical: 'combat',
    defaultSport: 'mma',
    defaultSections: ['content', 'seo', 'social', 'media'],
    automationKeys: [...FIGHT_PUBLISH_KEYS, ...TONIGHT_EXTRA_KEYS],
  },
  {
    campaignType: 'boxing_fight_campaign',
    label: 'Boxing fight campaign',
    description: 'Run the combat automation pack but with boxing-specific prompts, keywords, social copy, and SEO context.',
    defaultVertical: 'combat',
    defaultSport: 'boxing',
    defaultSections: ['content', 'seo', 'social', 'media'],
    automationKeys: [...FIGHT_PUBLISH_KEYS, ...TONIGHT_EXTRA_KEYS],
  },
  {
    campaignType: 'fight_result_campaign',
    label: 'Fight result campaign',
    description: 'Create recap, result social post, and leaderboard summary after a fight result update.',
    defaultVertical: 'combat',
    defaultSport: 'mma',
    defaultSections: ['content', 'social', 'analytics'],
    automationKeys: ['fight.result.recapBlog', 'fight.result.socialPost', 'fight.result.leaderboardSummary'],
  },
  {
    campaignType: 'pro_wrestling_match_campaign',
    label: 'Pro-wrestling match campaign',
    description: 'Create pro-wrestling match preview or recap, social copy, SEO, schema, and newsletter artifacts.',
    defaultVertical: 'pro_wrestling',
    defaultSport: 'pro_wrestling',
    defaultSections: ['content', 'seo', 'social', 'media'],
    automationKeys: [
      'wrestling.matchPublished.previewBlog',
      'wrestling.resultUpdated.recapBlog',
      'blog.approved.twitterPost',
      'blog.approved.seoAudit',
      'blog.approved.relatedLinks',
      'blog.approved.imagePrompt',
      'blog.approved.newsletterDraft',
      'seo.fighterWrestlerStructuredData',
    ],
  },
  {
    campaignType: 'blog_promotion_campaign',
    label: 'Blog promotion campaign',
    description: 'Run social, SEO, related-link, image-prompt, and newsletter agents for an approved blog.',
    defaultVertical: 'combat',
    defaultSport: 'mma',
    defaultSections: ['seo', 'social', 'media', 'content'],
    automationKeys: [
      'blog.approved.twitterPost',
      'blog.approved.seoAudit',
      'blog.approved.relatedLinks',
      'blog.approved.imagePrompt',
      'blog.approved.newsletterDraft',
      'seo.openGraphTwitterCards',
    ],
  },
  {
    campaignType: 'contest_promotion_campaign',
    label: 'Contest promotion campaign',
    description: 'Create contest explainer, closing-reminder, winner-announcement, and social artifacts.',
    defaultVertical: 'combat',
    defaultSport: 'mma',
    defaultSections: ['content', 'social', 'notification'],
    automationKeys: ['contest.created.rulesExplainer', 'contest.closingSoon.reminderPost', 'contest.completed.winnersAnnouncement'],
  },
  {
    campaignType: 'custom_campaign',
    label: 'Custom campaign',
    description: 'Run explicitly selected automation keys or section-based automations.',
    defaultVertical: 'combat',
    defaultSport: 'mma',
    defaultSections: ['content', 'seo', 'social'],
    automationKeys: [],
  },
];

export function listCampaignPacks(): CampaignPack[] {
  return CAMPAIGN_PACKS;
}

export async function createCampaign(rawInput: CreateCampaignInput): Promise<{ campaign: SwarmCampaignDocument; jobs: Array<Record<string, unknown>>; skipped: Array<Record<string, unknown>> }> {
  const input = createCampaignSchema.parse(rawInput);
  const pack = CAMPAIGN_PACKS.find((item) => item.campaignType === input.campaignType);
  if (!pack) throw new AppError(400, 'CAMPAIGN_PACK_NOT_FOUND', `Unsupported campaign type: ${input.campaignType}`);

  const vertical = input.vertical || pack.defaultVertical;
  const sport = input.sport || inferSport(input.campaignType, pack.defaultSport, input.input);
  const sourceEntity = normalizeSourceEntity(input.sourceEntity, input.title || pack.label, sport);
  const title = input.title || campaignTitle(pack, sourceEntity, sport);
  const campaign = await upsertOrCreateCampaign(input, pack, title, vertical, sport, sourceEntity);

  const selectedDefinitions = selectDefinitions(pack, {
    explicitKeys: input.automationKeys,
    sections: input.sections,
    includeAll: input.includeAll,
    vertical,
  });

  const jobs: Array<Record<string, unknown>> = [];
  const skipped: Array<Record<string, unknown>> = [];
  const dateKey = isoDateKey(new Date());

  for (const definition of selectedDefinitions) {
    if (!input.force && definition.riskLevel === 'high' && input.mode === 'AUTOMATED') {
      skipped.push({ automationKey: definition.key, reason: 'high-risk-auto-mode-blocked' });
      continue;
    }

    const effectiveVertical = definition.vertical === 'both' ? vertical : definition.vertical;
    if (effectiveVertical !== vertical && definition.vertical !== 'both') {
      skipped.push({ automationKey: definition.key, reason: `not-compatible-with-${vertical}` });
      continue;
    }

    const idempotencyKey = `${input.idempotencyKey || `campaign:${dateKey}:${campaign.campaignId}`}:${definition.key}`;
    const mode = safeCampaignMode(input.mode, definition);
    const result = await createJob({
      vertical: effectiveVertical,
      jobType: definition.jobType,
      mode,
      priority: input.priority,
      idempotencyKey,
      requestedBy: input.requestedBy,
      sourceEntity,
      input: {
        ...input.input,
        sport,
        discipline: sport,
        campaignId: campaign.campaignId,
        campaignType: input.campaignType,
        campaignTitle: campaign.title,
        automationKey: definition.key,
        automationLabel: definition.label,
        automationCategory: definition.category,
        automationTrigger: definition.trigger,
        targetOutput: definition.output,
        allAgentsCampaign: input.includeAll || input.campaignType.includes('campaign'),
        adminUXIntent: humanIntent(input.campaignType, sport),
      },
      callbackUrl: input.callbackUrl,
      backendCorrelationId: input.backendCorrelationId || campaign.campaignId,
      metadata: {
        ...input.metadata,
        campaign: true,
        campaignId: campaign.campaignId,
        campaignType: input.campaignType,
        campaignTitle: campaign.title,
        sport,
        automationKey: definition.key,
        adminGroup: definition.adminGroup,
        source: 'campaign-service',
      },
    });

    jobs.push({
      automationKey: definition.key,
      label: definition.label,
      category: definition.category,
      jobType: result.job.jobType,
      jobId: result.job.jobId,
      status: result.job.status,
      mode,
      created: result.created,
    });
  }

  campaign.automationKeys = selectedDefinitions.map((definition) => definition.key);
  campaign.jobIds = jobs.map((job) => String(job.jobId)).filter(Boolean);
  campaign.counts = await computeCampaignCounts(campaign.jobIds);
  campaign.status = deriveCampaignStatus(campaign.counts);
  await campaign.save();

  await AutomationLog.create({
    trigger: `campaign.${input.campaignType}`,
    action: 'campaign.created',
    status: jobs.length ? 'succeeded' : 'skipped',
    message: `Campaign created: ${campaign.title}`,
    createdJobs: campaign.jobIds,
    details: { campaignId: campaign.campaignId, campaignType: input.campaignType, sport, selected: jobs.length, skipped },
    actor: input.requestedBy,
  });

  return { campaign, jobs, skipped };
}

export async function getCampaign(campaignId: string): Promise<SwarmCampaignDocument> {
  const campaign = await SwarmCampaign.findOne({ campaignId });
  if (!campaign) throw new AppError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found.');
  campaign.counts = await computeCampaignCounts(campaign.jobIds);
  campaign.status = deriveCampaignStatus(campaign.counts);
  await campaign.save();
  return campaign;
}

export async function listCampaigns(rawQuery: unknown): Promise<{ items: SwarmCampaignDocument[]; total: number; page: number; limit: number }> {
  const query = listCampaignsQuerySchema.parse(rawQuery ?? {});
  const filter: FilterQuery<SwarmCampaignDocument> = {};
  if (query.status) filter.status = query.status;
  if (query.campaignType) filter.campaignType = query.campaignType;
  if (query.vertical) filter.vertical = query.vertical;
  if (query.sport) filter.sport = query.sport;

  const [items, total] = await Promise.all([
    SwarmCampaign.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit),
    SwarmCampaign.countDocuments(filter),
  ]);

  for (const item of items) {
    item.counts = await computeCampaignCounts(item.jobIds);
    item.status = deriveCampaignStatus(item.counts);
  }

  return { items, total, page: query.page, limit: query.limit };
}

export function serializeCampaign(campaign: SwarmCampaignDocument): Record<string, unknown> {
  return {
    campaignId: campaign.campaignId,
    campaignType: campaign.campaignType,
    title: campaign.title,
    vertical: campaign.vertical,
    sport: campaign.sport,
    mode: campaign.mode,
    status: campaign.status,
    priority: campaign.priority,
    requestedBy: campaign.requestedBy,
    sourceEntity: campaign.sourceEntity,
    input: campaign.input,
    sections: campaign.sections,
    automationKeys: campaign.automationKeys,
    jobIds: campaign.jobIds,
    counts: campaign.counts,
    callbackUrl: campaign.callbackUrl,
    backendCorrelationId: campaign.backendCorrelationId,
    idempotencyKey: campaign.idempotencyKey,
    metadata: campaign.metadata,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

async function upsertOrCreateCampaign(
  input: ReturnType<typeof createCampaignSchema.parse>,
  pack: CampaignPack,
  title: string,
  vertical: Vertical,
  sport: CombatSport,
  sourceEntity: Record<string, unknown> | undefined,
): Promise<SwarmCampaignDocument> {
  if (input.idempotencyKey) {
    const existing = await SwarmCampaign.findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) return existing;
  }

  return SwarmCampaign.create({
    campaignType: input.campaignType,
    title,
    vertical,
    sport,
    mode: input.mode,
    status: 'queued',
    priority: input.priority,
    requestedBy: input.requestedBy,
    sourceEntity,
    input: input.input,
    sections: input.sections || pack.defaultSections,
    automationKeys: [],
    jobIds: [],
    counts: { total: 0, queued: 0, running: 0, awaitingReview: 0, completed: 0, failed: 0, cancelled: 0 },
    callbackUrl: input.callbackUrl,
    backendCorrelationId: input.backendCorrelationId,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata,
  });
}

function selectDefinitions(
  pack: CampaignPack,
  options: { explicitKeys?: string[]; sections?: CampaignSection[]; includeAll: boolean; vertical: Vertical },
): AutomationDefinition[] {
  const keys = options.explicitKeys?.length ? options.explicitKeys : pack.automationKeys;
  const definitions = keys
    .map((key) => automationByKey(key))
    .filter((definition): definition is AutomationDefinition => Boolean(definition));

  const sectionFiltered = options.includeAll || !options.sections?.length
    ? definitions
    : definitions.filter((definition) => options.sections?.includes(definition.category as CampaignSection));

  const compatible = sectionFiltered.filter((definition) => definition.vertical === options.vertical || definition.vertical === 'both');

  if (compatible.length || options.explicitKeys?.length) return compatible;

  return AUTOMATION_DEFINITIONS.filter((definition) => {
    const sectionOk = !options.sections?.length || options.sections.includes(definition.category as CampaignSection);
    const verticalOk = definition.vertical === options.vertical || definition.vertical === 'both';
    return sectionOk && verticalOk;
  }).slice(0, 12);
}

async function computeCampaignCounts(jobIds: string[]): Promise<SwarmCampaignDocument['counts']> {
  if (!jobIds.length) return { total: 0, queued: 0, running: 0, awaitingReview: 0, completed: 0, failed: 0, cancelled: 0 };
  const jobs = await SwarmJob.find({ jobId: { $in: jobIds } }, { status: 1 });
  const counts = { total: jobs.length, queued: 0, running: 0, awaitingReview: 0, completed: 0, failed: 0, cancelled: 0 };
  for (const job of jobs) {
    if (job.status === 'queued' || job.status === 'retry_pending') counts.queued += 1;
    else if (job.status === 'running') counts.running += 1;
    else if (job.status === 'awaiting_review') counts.awaitingReview += 1;
    else if (['succeeded', 'approved', 'published'].includes(job.status)) counts.completed += 1;
    else if (['failed', 'dead_letter'].includes(job.status)) counts.failed += 1;
    else if (job.status === 'cancelled') counts.cancelled += 1;
  }
  return counts;
}

function deriveCampaignStatus(counts: SwarmCampaignDocument['counts']): CampaignStatus {
  if (!counts.total) return 'created';
  if (counts.failed && counts.failed === counts.total) return 'failed';
  if (counts.failed) return 'partially_failed';
  if (counts.running) return 'running';
  if (counts.queued) return 'queued';
  if (counts.awaitingReview) return 'awaiting_review';
  if (counts.completed === counts.total) return 'completed';
  if (counts.cancelled === counts.total) return 'cancelled';
  return 'running';
}

function normalizeSourceEntity(sourceEntity: Record<string, unknown> | undefined, title: string, sport: CombatSport): ({ type: string; id?: string; label?: string; url?: string } & Record<string, unknown>) | undefined {
  if (typeof sourceEntity?.type === 'string' && sourceEntity.type.trim()) return { ...sourceEntity, type: sourceEntity.type, sport: sourceEntity.sport || sport } as { type: string } & Record<string, unknown>; 
  return { type: sport === 'boxing' ? 'boxing_fight' : sport === 'pro_wrestling' ? 'pro_wrestling_match' : 'fight', label: title, sport };
}

function inferSport(campaignType: CampaignType, fallback: CombatSport, input: Record<string, unknown>): CombatSport {
  if (campaignType === 'boxing_fight_campaign') return 'boxing';
  const rawSport = typeof input.sport === 'string' ? input.sport.toLowerCase() : typeof input.discipline === 'string' ? input.discipline.toLowerCase() : '';
  if (['boxing', 'mma', 'kickboxing', 'combat', 'pro_wrestling'].includes(rawSport)) return rawSport as CombatSport;
  return fallback;
}

function campaignTitle(pack: CampaignPack, sourceEntity: ({ type: string } & Record<string, unknown>) | undefined, sport: CombatSport): string {
  const label = sourceEntity && typeof sourceEntity.label === 'string' ? sourceEntity.label : '';
  const sportLabel = sport === 'boxing' ? 'Boxing' : sport === 'pro_wrestling' ? 'Pro Wrestling' : sport === 'kickboxing' ? 'Kickboxing' : 'MMA';
  return label ? `${sportLabel}: ${pack.label} — ${label}` : `${sportLabel}: ${pack.label}`;
}

function humanIntent(campaignType: CampaignType, sport: CombatSport): string {
  if (campaignType === 'fight_tonight_campaign') return `Promote tonight's ${sport === 'boxing' ? 'boxing' : 'fight'} event with all safe agents.`;
  if (campaignType === 'boxing_fight_campaign') return 'Promote a boxing fight as a first-class campaign, not generic MMA/combat copy.';
  if (campaignType === 'fight_full_campaign') return 'Run all selected agents for one fight and return visible artifacts for admin review.';
  if (campaignType === 'pro_wrestling_match_campaign') return 'Run all selected pro-wrestling agents for one match.';
  return 'Run selected automation agents as one grouped campaign.';
}

function safeCampaignMode(mode: SwarmMode, definition: AutomationDefinition): SwarmMode {
  if (mode === 'AUTOMATED' && !definition.supportsAutoMode) return definition.defaultMode;
  if (mode === 'AUTOMATED' && definition.riskLevel === 'high') return 'APPROVAL_REQUIRED';
  return mode;
}
