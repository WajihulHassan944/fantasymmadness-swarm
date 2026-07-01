import { describe, expect, it } from 'vitest';
import { ContentAgent } from '../src/agents/content.agent.js';
import { WrestlingAgent } from '../src/agents/wrestling.agent.js';
import { SeoAgent } from '../src/agents/seo.agent.js';
import { SocialAgent } from '../src/agents/social.agent.js';
import { DataCandidateAgent } from '../src/agents/data.agent.js';

const baseJob: any = {
  jobId: 'job_test',
  vertical: 'combat',
  jobType: 'content.article',
  mode: 'DRAFT_ONLY',
  input: { topic: 'Fantasy fight strategy' },
};

describe('agents', () => {
  it('content agent creates a blog artifact shape', async () => {
    const result = await new ContentAgent().run(baseJob);
    expect(result.artifact.artifactType).toBe('content.article-draft');
    expect(result.artifact.payload.sections).toBeTruthy();
  });

  it('seo agent creates a technical foundation roadmap', async () => {
    const result = await new SeoAgent().run({
      ...baseJob,
      jobType: 'seo.technical-foundation-audit',
      input: { targetKeyword: 'fantasy combat sports contests', pageTitle: 'FantasyMMAdness' },
    });
    expect(result.artifact.artifactType).toBe('seo.technical-issue-report');
    expect((result.artifact.payload as any).technicalSeoRoadmap?.length).toBeGreaterThan(0);
    expect((result.artifact.payload as any).nextPhaseImplementationPlan?.backendRequirements?.length).toBeGreaterThan(0);
  });

  it('wrestling agent creates scorecard suggestions', async () => {
    const result = await new WrestlingAgent().run({
      ...baseJob,
      vertical: 'pro_wrestling',
      jobType: 'wrestling.scorecard-suggestion',
      input: {
        competitorA: { displayName: 'Wrestler A', historicalStatistics: { HP: 10, BP: 7, K: 4, PM: 3, FM: 1 } },
        competitorB: { displayName: 'Wrestler B', historicalStatistics: { HP: 12, BP: 8, K: 3, PM: 4, FM: 1 } },
      },
    });
    expect(result.artifact.artifactType).toBe('wrestling.scorecard-suggestion');
    expect((result.artifact.payload as any).safety.advisoryOnly).toBe(true);
  });

  it('social agent creates YouTube growth videos with required CTA', async () => {
    const result = await new SocialAgent().run({
      ...baseJob,
      jobType: 'social.youtube-growth-video-draft',
      input: { topic: 'Weekend fight card', sport: 'boxing' },
    });
    expect(result.artifact.artifactType).toBe('social.post-draft');
    expect((result.artifact.payload as any).youtubeVideos?.[0]?.requiredEndingLine).toBe('Make your picks on Fantasy MMadness before the event starts.');
  });

  it('data agent creates event calendar daily update artifacts', async () => {
    const result = await new DataCandidateAgent().run({
      ...baseJob,
      jobType: 'data.event-calendar-daily-update',
      input: { events: [{ matchFighterA: 'Fighter A', matchFighterB: 'Fighter B', matchDate: '2026-07-01' }] },
    });
    expect(result.artifact.artifactType).toBe('data.calendar-refresh-plan');
    expect((result.artifact.payload as any).eventsSeen).toBe(1);
  });

});
