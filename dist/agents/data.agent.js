import { coerceRecord, getString } from './base.js';
export class DataCandidateAgent {
    name = 'data-candidate-agent';
    version = '1.1.0';
    supports(jobType) {
        return jobType.startsWith('data.');
    }
    async run(job) {
        if (job.jobType === 'data.event-calendar-daily-update') {
            return this.eventCalendarDailyUpdate(job);
        }
        if (job.jobType === 'data.fight-calendar-refresh') {
            return this.calendarRefreshPlan(job);
        }
        if (job.jobType === 'data.trending-mma-topics' || job.jobType === 'data.trending-wrestling-topics') {
            return this.trendReport(job);
        }
        return this.externalCandidate(job);
    }
    async eventCalendarDailyUpdate(job) {
        const input = job.input || {};
        const sport = getString(input, 'sport', getString(input, 'discipline', job.vertical === 'pro_wrestling' ? 'pro_wrestling' : 'mma'));
        const sourceName = getString(input, 'sourceName', 'backend-event-calendar');
        const events = Array.isArray(input.events) ? input.events : Array.isArray(input.scheduleItems) ? input.scheduleItems : [];
        const eventCards = events.slice(0, 12).map((item, index) => this.calendarCard(item, index));
        return {
            artifact: {
                jobId: job.jobId,
                vertical: job.vertical,
                jobType: job.jobType,
                artifactType: 'data.calendar-refresh-plan',
                title: `${this.sportLabel(sport)} event calendar daily update`,
                summary: 'Safe calendar artifact for upcoming events, poster requirements, countdowns, prediction deadlines, and results review.',
                reviewStatus: 'AWAITING_REVIEW',
                payload: {
                    sourceName,
                    sport,
                    eventsSeen: events.length,
                    eventCards,
                    requiredPublicOutputs: [
                        'homepage event module',
                        'event detail pages',
                        'upcoming fights list',
                        'prediction deadline reminders',
                        'post-event result status blocks',
                    ],
                    dailyPublishingTarget: {
                        postsPerDay: '2-5',
                        recommendedSlots: ['8 AM calendar update', '5 PM countdown asset', '10 PM result/update asset'],
                    },
                    dataQualityChecks: [
                        'Verify event name, fighter names, event date/time, and prediction deadline before publishing.',
                        'Verify poster and fighter photo URLs are valid before sending to backend/frontend.',
                        'Do not overwrite live event data directly from swarm output.',
                    ],
                    backendApplyPlan: {
                        action: 'backend_review_and_apply_event_calendar_candidates',
                        requiresBackendValidation: true,
                        safeToAutoApply: false,
                    },
                },
                provenance: {
                    provider: 'internal-event-calendar-agent',
                    model: 'rules-v1',
                    promptVersion: 'event-calendar-daily-v1',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: { score: events.length ? 84 : 68, warnings: events.length ? [] : ['No event snapshot was supplied; output is a daily operating template.'] },
                metadata: { mode: job.mode, automationKey: input.automationKey, sport, growthSystem: 'july-10000-signups' },
            },
        };
    }
    async calendarRefreshPlan(job) {
        const input = job.input || {};
        const sport = getString(input, 'sport', getString(input, 'discipline', job.vertical === 'pro_wrestling' ? 'pro_wrestling' : 'mma'));
        const sourceName = getString(input, 'sourceName', 'backend-fight-schedule');
        const scheduleItems = Array.isArray(input.scheduleItems) ? input.scheduleItems : [];
        return {
            artifact: {
                jobId: job.jobId,
                vertical: job.vertical,
                jobType: job.jobType,
                artifactType: 'data.calendar-refresh-plan',
                title: `${this.sportLabel(sport)} fight calendar refresh plan`,
                summary: 'Reviewable plan for keeping public fight calendars, upcoming fights, and dashboard opportunities fresh.',
                reviewStatus: 'AWAITING_REVIEW',
                payload: {
                    sourceName,
                    sport,
                    scheduleItemsSeen: scheduleItems.length,
                    refreshTargets: [
                        'public fight calendar',
                        'homepage fight-night/latest fight modules',
                        'user dashboard fight opportunities',
                        'upcoming fights carousel/listing',
                    ],
                    orderingRules: [
                        'featured fights first',
                        'live and tonight fights before older fights',
                        'recently added or recently completed fights stay visible',
                        'completed stale fights move below active opportunities',
                    ],
                    backendApplyPlan: {
                        action: 'backend_refresh_fight_schedule_cache_or_priority_fields',
                        requiresBackendValidation: true,
                        safeToAutoApply: false,
                        notes: [
                            'Swarm creates the refresh plan and candidate priorities.',
                            'Backend remains responsible for actual fight visibility and sorting updates.',
                            'Frontend should read the backend-sorted fight list instead of static/test content.',
                        ],
                    },
                },
                provenance: {
                    provider: 'internal-calendar-planner',
                    model: 'rules-v1',
                    promptVersion: 'calendar-refresh-v1',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: { score: 82, warnings: [] },
                metadata: { mode: job.mode, automationKey: input.automationKey, sport },
            },
        };
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
    calendarCard(item, index) {
        const record = coerceRecord(item);
        const fighterA = String(record.matchFighterA || record.fighterA || record.competitorA || 'Fighter A');
        const fighterB = String(record.matchFighterB || record.fighterB || record.competitorB || 'Fighter B');
        const title = String(record.title || record.matchName || record.eventName || `${fighterA} vs ${fighterB}`);
        return {
            priority: index < 3 ? 'high' : 'medium',
            title,
            fighterA,
            fighterB,
            eventDate: record.eventDate || record.matchDate || record.date || undefined,
            predictionDeadline: record.predictionDeadline || record.lockAt || undefined,
            posterUrl: record.posterUrl || record.promotionBackground || undefined,
            fighterPhotoUrls: [record.fighterAImage, record.fighterBImage].filter(Boolean),
            countdownRequired: true,
            resultTrackingRequired: true,
            publicPageCandidate: true,
        };
    }
    sportLabel(sport) {
        if (sport === 'boxing')
            return 'Boxing';
        if (sport === 'kickboxing')
            return 'Kickboxing';
        if (sport === 'pro_wrestling')
            return 'Pro Wrestling';
        return 'MMA/combat';
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
