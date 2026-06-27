import { AppError } from '../utils/errors.js';
import { AutomationAgent } from './automation.agent.js';
import { ContentAgent } from './content.agent.js';
import { DataCandidateAgent } from './data.agent.js';
import { SeoAgent } from './seo.agent.js';
import { SocialAgent } from './social.agent.js';
import { SystemAgent } from './system.agent.js';
import { WrestlingAgent } from './wrestling.agent.js';
import { jobTypeValues } from '../contracts/job.js';
export class AgentRegistry {
    agents;
    constructor(agents = [
        new ContentAgent(),
        new SeoAgent(),
        new SocialAgent(),
        new DataCandidateAgent(),
        new WrestlingAgent(),
        new AutomationAgent(),
        new SystemAgent(),
    ]) {
        this.agents = agents;
    }
    list() {
        return this.agents.map((agent) => ({
            name: agent.name,
            version: agent.version,
            supportedJobTypes: jobTypeValues.filter((jobType) => agent.supports(jobType)),
        }));
    }
    resolve(jobType) {
        const agent = this.agents.find((candidate) => candidate.supports(jobType));
        if (!agent)
            throw new AppError(422, 'NO_AGENT_FOR_JOB_TYPE', `No agent is registered for job type ${jobType}.`);
        return agent;
    }
}
export const agentRegistry = new AgentRegistry();
