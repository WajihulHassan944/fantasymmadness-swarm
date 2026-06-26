import { wrestlingStatsSchema } from '../contracts/domain.js';
import { getAiProvider } from '../providers/ai/index.js';
import { slugify } from '../utils/slug.js';
import { coerceRecord, getString } from './base.js';
const DEFAULT_STATS = { HP: 14, BP: 9, K: 5, PM: 4, FM: 1 };
export class WrestlingAgent {
    name = 'wrestling-agent';
    version = '1.0.0';
    supports(jobType) {
        return ['wrestling.scorecard-suggestion', 'wrestling.match-analysis', 'wrestling.wrestler-profile'].includes(jobType);
    }
    async run(job) {
        if (job.jobType === 'wrestling.scorecard-suggestion')
            return this.scorecardSuggestion(job);
        if (job.jobType === 'wrestling.wrestler-profile')
            return this.wrestlerProfile(job);
        return this.matchAnalysis(job);
    }
    async scorecardSuggestion(job) {
        const input = job.input || {};
        const competitorA = coerceRecord(input.competitorA);
        const competitorB = coerceRecord(input.competitorB);
        const nameA = this.wrestlerName(competitorA, 'Competitor A');
        const nameB = this.wrestlerName(competitorB, 'Competitor B');
        const statsA = this.estimateStats(competitorA, 1.03);
        const statsB = this.estimateStats(competitorB, 0.98);
        const winner = this.pickWinner(statsA, statsB);
        const fallback = {
            competitorA: statsA,
            competitorB: statsB,
            winnerPrediction: winner,
            confidence: 62,
            rationale: [
                `${nameA} projection uses available historical HP/BP/K/PM/FM values with a small matchup adjustment.`,
                `${nameB} projection uses available historical HP/BP/K/PM/FM values with a conservative adjustment.`,
                'This is advisory only; users still submit their own predictions through the current website flow.',
            ],
            safety: {
                advisoryOnly: true,
                officialScoringOwner: 'existing Vercel Node.js backend',
            },
        };
        const ai = getAiProvider();
        const aiResult = await ai.generateJson({
            system: 'You suggest pro-wrestling fantasy scorecards for FantasyMMAdness. Categories are HP, BP, K, PM, FM for both competitors plus winnerPrediction A/B/DRAW. This is advisory only; never claim official score or payout.',
            user: JSON.stringify({ competitorA, competitorB, fallback, ruleVersion: input.ruleVersion || 'WRESTLING_V1' }),
            schemaName: 'ScorecardPayload',
            fallback,
            temperature: 0.25,
        });
        const output = this.normalizeScorecard(aiResult.output, fallback);
        return {
            artifact: {
                jobId: job.jobId,
                vertical: 'pro_wrestling',
                jobType: job.jobType,
                artifactType: 'wrestling.scorecard-suggestion',
                title: `Scorecard suggestion: ${nameA} vs ${nameB}`,
                summary: 'Advisory HP/BP/K/PM/FM prediction suggestion for review or user assistance.',
                reviewStatus: 'AWAITING_REVIEW',
                payload: output,
                provenance: {
                    provider: aiResult.provider,
                    model: aiResult.model,
                    promptVersion: 'wrestling-scorecard-v1',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: { score: aiResult.warnings.length ? 70 : output.confidence, warnings: aiResult.warnings },
                metadata: {
                    advisoryOnly: true,
                    officialScoringOwner: 'backend',
                    mode: job.mode,
                },
            },
            tokenUsage: aiResult.tokenUsage,
            warnings: aiResult.warnings,
        };
    }
    async matchAnalysis(job) {
        const input = job.input || {};
        const competitorA = coerceRecord(input.competitorA);
        const competitorB = coerceRecord(input.competitorB);
        const nameA = this.wrestlerName(competitorA, 'Competitor A');
        const nameB = this.wrestlerName(competitorB, 'Competitor B');
        const eventName = getString(input, 'eventName', 'Upcoming Pro Wrestling Event');
        const header = `${nameA} vs ${nameB}: Fantasy Pro Wrestling Match Analysis`;
        const fallback = {
            vertical: 'pro_wrestling',
            metaTitle: `${header} | FantasyMMAdness`,
            metaDescription: `FantasyMMAdness pro-wrestling analysis for ${nameA} vs ${nameB}, including action-category context and scorecard strategy.`,
            header,
            slug: slugify(header),
            tags: ['FantasyMMAdness', 'Pro Wrestling', eventName],
            sections: [
                {
                    title: 'Match context',
                    content: `${eventName} gives players a chance to evaluate ${nameA} and ${nameB} across HP, BP, K, PM, and FM prediction categories.`,
                    headings: [],
                },
                {
                    title: 'Fantasy category read',
                    content: 'High-volume wrestlers may create more HP/BP opportunities, while explosive styles can increase K, PM, and FM variance.',
                    headings: [
                        { title: 'Tie-break discipline', content: 'Avoid extreme projections unless historical stats or match format strongly supports them.' },
                    ],
                },
            ],
        };
        const ai = getAiProvider();
        const aiResult = await ai.generateJson({
            system: 'Write FantasyMMAdness pro-wrestling match analysis compatible with the existing Blog model. Use HP, BP, K, PM, FM context but do not alter official scoring rules.',
            user: JSON.stringify({ eventName, competitorA, competitorB, fallback }),
            schemaName: 'WebsiteBlogDraft',
            fallback,
            temperature: 0.45,
        });
        return {
            artifact: {
                jobId: job.jobId,
                vertical: 'pro_wrestling',
                jobType: job.jobType,
                artifactType: 'wrestling.match-analysis',
                title: aiResult.output.header || header,
                summary: aiResult.output.metaDescription || fallback.metaDescription,
                reviewStatus: 'AWAITING_REVIEW',
                payload: { ...fallback, ...aiResult.output, vertical: 'pro_wrestling' },
                provenance: {
                    provider: aiResult.provider,
                    model: aiResult.model,
                    promptVersion: 'wrestling-analysis-v1',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: { score: aiResult.warnings.length ? 72 : 87, warnings: aiResult.warnings },
                metadata: { mapsToBackendModel: 'Blog', mode: job.mode },
            },
            tokenUsage: aiResult.tokenUsage,
            warnings: aiResult.warnings,
        };
    }
    async wrestlerProfile(job) {
        const input = job.input || {};
        const wrestler = coerceRecord(input.wrestler);
        const displayName = this.wrestlerName(wrestler, getString(input, 'displayName', 'Pro Wrestler'));
        const stats = this.estimateStats(wrestler, 1);
        const fallback = {
            displayName,
            slug: slugify(displayName),
            promotion: String(wrestler.promotion || input.promotion || ''),
            wrestlingStyle: String(wrestler.wrestlingStyle || input.wrestlingStyle || ''),
            signatureMoves: Array.isArray(input.signatureMoves) ? input.signatureMoves.map(String) : [],
            finishingMoves: Array.isArray(input.finishingMoves) ? input.finishingMoves.map(String) : [],
            biography: `${displayName} profile draft for FantasyMMAdness admin review. Confirm all public biography and image details before importing.`,
            historicalStatistics: { matches: Number(coerceRecord(wrestler.historicalStatistics).matches || 0), ...stats },
            seo: {
                title: `${displayName} Fantasy Pro Wrestling Profile | FantasyMMAdness`,
                description: `Fantasy pro-wrestling profile for ${displayName}, including style notes and HP/BP/K/PM/FM context.`,
                keywords: [displayName, 'FantasyMMAdness', 'pro wrestling fantasy'],
            },
            importSafety: { canAutoImport: false, requiresBackendValidation: true },
        };
        const ai = getAiProvider();
        const aiResult = await ai.generateJson({
            system: 'Create a FantasyMMAdness pro-wrestler profile draft. Never invent unsupported biographical facts; mark uncertain fields for review in biography if needed.',
            user: JSON.stringify({ wrestler, fallback }),
            schemaName: 'WrestlerProfilePayload',
            fallback,
            temperature: 0.35,
        });
        return {
            artifact: {
                jobId: job.jobId,
                vertical: 'pro_wrestling',
                jobType: job.jobType,
                artifactType: 'wrestling.wrestler-profile',
                title: `Wrestler profile: ${displayName}`,
                summary: aiResult.output.seo?.description || fallback.seo.description,
                reviewStatus: 'AWAITING_REVIEW',
                payload: { ...fallback, ...aiResult.output, importSafety: fallback.importSafety },
                provenance: {
                    provider: aiResult.provider,
                    model: aiResult.model,
                    promptVersion: 'wrestler-profile-v1',
                    agentVersion: this.version,
                    generatedAt: new Date(),
                    sources: [],
                },
                quality: { score: aiResult.warnings.length ? 70 : 84, warnings: aiResult.warnings },
                metadata: { mapsToBackendModel: 'ProWrestler', mode: job.mode },
            },
            tokenUsage: aiResult.tokenUsage,
            warnings: aiResult.warnings,
        };
    }
    wrestlerName(wrestler, fallback) {
        return String(wrestler.displayName || wrestler.name || fallback).trim();
    }
    estimateStats(wrestler, modifier) {
        const historical = coerceRecord(wrestler.historicalStatistics);
        const raw = {
            HP: historical.HP ?? DEFAULT_STATS.HP,
            BP: historical.BP ?? DEFAULT_STATS.BP,
            K: historical.K ?? DEFAULT_STATS.K,
            PM: historical.PM ?? DEFAULT_STATS.PM,
            FM: historical.FM ?? DEFAULT_STATS.FM,
        };
        const parsed = wrestlingStatsSchema.parse(raw);
        return {
            HP: Math.max(0, Math.round(parsed.HP * modifier)),
            BP: Math.max(0, Math.round(parsed.BP * modifier)),
            K: Math.max(0, Math.round(parsed.K * modifier)),
            PM: Math.max(0, Math.round(parsed.PM * modifier)),
            FM: Math.max(0, Math.round(parsed.FM * modifier)),
        };
    }
    pickWinner(statsA, statsB) {
        const totalA = statsA.HP + statsA.BP + statsA.K * 1.2 + statsA.PM * 1.5 + statsA.FM * 2;
        const totalB = statsB.HP + statsB.BP + statsB.K * 1.2 + statsB.PM * 1.5 + statsB.FM * 2;
        if (Math.abs(totalA - totalB) < 2)
            return 'DRAW';
        return totalA >= totalB ? 'A' : 'B';
    }
    normalizeScorecard(output, fallback) {
        const a = wrestlingStatsSchema.safeParse(output.competitorA);
        const b = wrestlingStatsSchema.safeParse(output.competitorB);
        const winner = ['A', 'B', 'DRAW'].includes(String(output.winnerPrediction)) ? output.winnerPrediction : fallback.winnerPrediction;
        return {
            competitorA: a.success ? a.data : fallback.competitorA,
            competitorB: b.success ? b.data : fallback.competitorB,
            winnerPrediction: winner,
            confidence: Math.max(0, Math.min(100, Number(output.confidence || fallback.confidence))),
            rationale: Array.isArray(output.rationale) ? output.rationale.map(String) : fallback.rationale,
            safety: fallback.safety,
        };
    }
}
