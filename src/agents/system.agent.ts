import type { JobType } from '../contracts/job.js';
import type { SwarmJobDocument } from '../models/job.model.js';
import type { AgentExecutionResult, SwarmAgent } from './base.js';

export class SystemAgent implements SwarmAgent {
  readonly name = 'system-agent';
  readonly version = '1.0.0';

  supports(jobType: JobType): boolean {
    return jobType === 'system.health-check';
  }

  async run(job: SwarmJobDocument): Promise<AgentExecutionResult> {
    return {
      artifact: {
        jobId: job.jobId,
        vertical: job.vertical,
        jobType: job.jobType,
        artifactType: 'system.health-check-result',
        title: 'Swarm health-check result',
        summary: 'Worker processed a system health-check job successfully.',
        reviewStatus: 'AWAITING_REVIEW',
        payload: {
          ok: true,
          workerProcessedAt: new Date().toISOString(),
          input: job.input,
        },
        provenance: {
          provider: 'internal-system-agent',
          model: 'none',
          promptVersion: 'system-v1',
          agentVersion: this.version,
          generatedAt: new Date(),
          sources: [],
        },
        quality: { score: 100, warnings: [] },
        metadata: { mode: job.mode },
      },
    };
  }
}
