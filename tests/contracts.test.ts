import { describe, expect, it } from 'vitest';
import { createJobSchema } from '../src/contracts/job.js';
import { websiteBlogDraftSchema } from '../src/contracts/domain.js';

describe('contracts', () => {
  it('validates a combat content job', () => {
    const parsed = createJobSchema.parse({
      vertical: 'combat',
      jobType: 'content.article',
      input: { topic: 'UFC fantasy strategy' },
    });
    expect(parsed.mode).toBe('DRAFT_ONLY');
    expect(parsed.priority).toBe(50);
  });

  it('validates website blog draft contract', () => {
    const draft = websiteBlogDraftSchema.parse({
      vertical: 'pro_wrestling',
      metaTitle: 'Title',
      metaDescription: 'Description',
      header: 'Header',
      sections: [{ title: 'Section', content: 'Content' }],
    });
    expect(draft.sections[0]?.headings).toEqual([]);
  });
});
