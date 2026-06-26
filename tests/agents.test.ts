import { describe, expect, it } from 'vitest';
import { ContentAgent } from '../src/agents/content.agent.js';
import { WrestlingAgent } from '../src/agents/wrestling.agent.js';

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
});
