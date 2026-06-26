import { AppError } from '../utils/errors.js';
import { ContentAgent } from './content.agent.js';
import { DataCandidateAgent } from './data.agent.js';
import { SeoAgent } from './seo.agent.js';
import { SocialAgent } from './social.agent.js';
import { SystemAgent } from './system.agent.js';
import { WrestlingAgent } from './wrestling.agent.js';
import type { SwarmAgent } from './base.js';
import type { JobType } from '../contracts/job.js';

export class AgentRegistry {
  private readonly agents: SwarmAgent[];

  constructor(agents: SwarmAgent[] = [
    new ContentAgent(),
    new SeoAgent(),
    new SocialAgent(),
    new DataCandidateAgent(),
    new WrestlingAgent(),
    new SystemAgent(),
  ]) {
    this.agents = agents;
  }

  list(): Array<{ name: string; version: string; supportedJobTypes: string[] }> {
    const knownJobTypes: JobType[] = [
      'content.article',
      'content.match-preview',
      'content.event-recap',
      'seo.audit',
      'social.draft',
      'data.external-candidate',
      'wrestling.scorecard-suggestion',
      'wrestling.match-analysis',
      'wrestling.wrestler-profile',
      'system.health-check',
    ];

    return this.agents.map((agent) => ({
      name: agent.name,
      version: agent.version,
      supportedJobTypes: knownJobTypes.filter((jobType) => agent.supports(jobType)),
    }));
  }

  resolve(jobType: JobType): SwarmAgent {
    const agent = this.agents.find((candidate) => candidate.supports(jobType));
    if (!agent) throw new AppError(422, 'NO_AGENT_FOR_JOB_TYPE', `No agent is registered for job type ${jobType}.`);
    return agent;
  }
}

export const agentRegistry = new AgentRegistry();
