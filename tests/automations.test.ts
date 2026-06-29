import { describe, expect, it } from 'vitest';
import { AUTOMATION_DEFINITIONS, automationsByTrigger } from '../src/automations/definitions.js';
import { jobTypeSchema } from '../src/contracts/job.js';
import { agentRegistry } from '../src/agents/registry.js';

describe('automation registry', () => {
  it('contains the requested traffic-growth automation foundation', () => {
    expect(AUTOMATION_DEFINITIONS.length).toBeGreaterThanOrEqual(50);
    expect(automationsByTrigger('fight.published').map((item) => item.key)).toContain('fight.publish.blogDraft');
    expect(automationsByTrigger('blog.approved').map((item) => item.key)).toContain('blog.approved.twitterPost');
    expect(automationsByTrigger('schedule.daily').map((item) => item.key)).toContain('seo.technicalFoundationAudit');
    expect(automationsByTrigger('schedule.weekly').map((item) => item.key)).toContain('seo.paginationOpportunityReport');
  });

  it('maps every automation to a valid job type and registered agent', () => {
    for (const definition of AUTOMATION_DEFINITIONS) {
      expect(() => jobTypeSchema.parse(definition.jobType)).not.toThrow();
      expect(() => agentRegistry.resolve(definition.jobType)).not.toThrow();
    }
  });
});
