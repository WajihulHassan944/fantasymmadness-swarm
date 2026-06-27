import { coerceRecord, getString } from './base.js';
export class DataCandidateAgent {
    name = 'data-candidate-agent';
    version = '1.1.0';
    supports(jobType) {
        return jobType.startsWith('data.');
    }
    async run(job) {
        if (job.jobType === 'data.trending-mma-topics' || job.jobType === 'data.trending-wrestling-topics') {
            return this.trendReport(job);
        }
        return this.externalCandidate(job);
    }
    async trendReport(job) {
        const input = job.input || {};
        const verticalLabel = job.vertical === 'pro_wrestling' ? 'pro-wrestling' : 'MMA/combat';
        const seedTopics = Array.isArray(input.seedTopics) ? input.seedTopics.map(String).filter(Boolean) : [];
        const topics = seedTopics.length ? seedTopics : [
            `${verticalLabel} fantasy predictions`,
            `${verticalLabel} event preview`,
            `${verticalLabel} contest strategy`,
            `${verticalLabel} player picks`,
        ];
        return {
            artifact: {
                jobId: job.jobId,
                vertical: job.vertical,
                jobType: job.jobType,
                artifactType: 'data.trend-report',
                title: `Trend topic report: ${verticalLabel}`,
                summary: `Draft topic opportunities for ${verticalLabel} traffic growth.`,
                reviewStatus: 'AWAITING_REVIEW',
                payload: {
                    sourceMode: 'input_or_configured_sources',
                    note: 'Phase 1 does not scrape live trend sources by default. Backend can pass source snapshots/page inventory, or source connectors can be enabled later.',
                    topics: topics.map((topic, index) => ({
                        topic,
                        priority: index < 2 ? 'high' : 'medium',
                        suggestedContentType: index % 2 === 0 ? 'blog' : 'social_campaign',
                        targetIntent: 'fantasy sports discovery and contest participation',
                        followUpJobTypes: ['content.article', 'seo.keyword-opportunity', 'social.draft'],
                    })),
                    recommendedNextSteps: [
                        'Review topics in admin panel.',
                        'Approve useful topics into content calendar.',
                        'Create blog and social draft jobs from approved topics.',
                    ],
                },
                provenance: {
                    provider: 'internal-trend-planner',
                    model: 'rules-v1',
                    promptVersion: 'trend-data-v1',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: { score: seedTopics.length ? 82 : 64, warnings: seedTopics.length ? [] : ['No external trend source snapshot was supplied; output is a planning baseline.'] },
                metadata: { mode: job.mode, automationKey: input.automationKey },
            },
        };
    }
    async externalCandidate(job) {
        const input = job.input || {};
        const sourceName = getString(input, 'sourceName', 'manual');
        const rawRecord = coerceRecord(input.rawRecord);
        const normalized = this.normalize(job, rawRecord);
        return {
            artifact: {
                jobId: job.jobId,
                vertical: job.vertical,
                jobType: job.jobType,
                artifactType: 'data.external-candidate',
                title: `External candidate: ${normalized.label}`,
                summary: 'Normalized candidate record. Backend approval is required before any production import.',
                reviewStatus: 'AWAITING_REVIEW',
                payload: {
                    sourceName,
                    sourceUrl: getString(input, 'sourceUrl'),
                    rawRecord,
                    normalized,
                    confidence: this.confidenceScore(rawRecord),
                    importSafety: {
                        canAutoImport: false,
                        requiresBackendValidation: true,
                        protectedCollections: ['users', 'wallet ledgers', 'entries', 'predictions', 'payouts', 'settlement records'],
                    },
                },
                provenance: {
                    provider: 'internal-normalizer',
                    model: 'rules-v1',
                    promptVersion: 'data-v1',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: {
                    score: this.confidenceScore(rawRecord),
                    warnings: ['Candidate only. Do not write this directly into production collections.'],
                },
                metadata: {
                    mapsToBackendModel: job.vertical === 'pro_wrestling' ? 'ProWrestlingMatch/ProWrestler' : 'Match',
                    mode: job.mode,
                },
            },
        };
    }
    normalize(job, rawRecord) {
        if (job.vertical === 'pro_wrestling') {
            const competitorA = String(rawRecord.competitorA || rawRecord.wrestlerA || rawRecord.fighterA || 'Competitor A');
            const competitorB = String(rawRecord.competitorB || rawRecord.wrestlerB || rawRecord.fighterB || 'Competitor B');
            const eventName = String(rawRecord.eventName || rawRecord.event || 'Pro Wrestling Event');
            return {
                type: 'pro_wrestling_match_candidate',
                label: `${competitorA} vs ${competitorB}`,
                eventName,
                promotionName: rawRecord.promotionName || rawRecord.promotion || undefined,
                matchTitle: rawRecord.matchTitle || `${competitorA} vs ${competitorB}`,
                competitorA: { displayName: competitorA },
                competitorB: { displayName: competitorB },
                matchDate: rawRecord.matchDate || rawRecord.date || undefined,
                lockAt: rawRecord.lockAt || undefined,
            };
        }
        const fighterA = String(rawRecord.matchFighterA || rawRecord.fighterA || rawRecord.competitorA || 'Fighter A');
        const fighterB = String(rawRecord.matchFighterB || rawRecord.fighterB || rawRecord.competitorB || 'Fighter B');
        return {
            type: 'combat_match_candidate',
            label: `${fighterA} vs ${fighterB}`,
            matchName: rawRecord.matchName || `${fighterA} vs ${fighterB}`,
            matchFighterA: fighterA,
            matchFighterB: fighterB,
            matchCategory: rawRecord.matchCategory || rawRecord.discipline || 'mma',
            matchDate: rawRecord.matchDate || rawRecord.date || undefined,
            matchTime: rawRecord.matchTime || undefined,
            matchType: rawRecord.matchType || 'LIVE',
        };
    }
    confidenceScore(rawRecord) {
        const keyCount = Object.keys(rawRecord).length;
        if (keyCount >= 8)
            return 82;
        if (keyCount >= 4)
            return 68;
        return 45;
    }
}
