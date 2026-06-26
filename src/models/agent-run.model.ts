import crypto from 'node:crypto';
import mongoose, { Schema } from 'mongoose';

export interface AgentRunDocument extends mongoose.Document {
  runId: string;
  jobId: string;
  agentName: string;
  status: 'running' | 'succeeded' | 'failed';
  inputHash: string;
  outputArtifactId?: string;
  tokenUsage?: Record<string, unknown>;
  costEstimate?: Record<string, unknown>;
  error?: Record<string, unknown>;
  startedAt: Date;
  finishedAt?: Date;
}

const agentRunSchema = new Schema<AgentRunDocument>({
  runId: { type: String, required: true, unique: true, default: () => `run_${crypto.randomUUID()}` },
  jobId: { type: String, required: true, index: true },
  agentName: { type: String, required: true, index: true },
  status: { type: String, enum: ['running', 'succeeded', 'failed'], default: 'running', index: true },
  inputHash: { type: String, required: true },
  outputArtifactId: String,
  tokenUsage: { type: Schema.Types.Mixed },
  costEstimate: { type: Schema.Types.Mixed },
  error: { type: Schema.Types.Mixed },
  startedAt: { type: Date, default: Date.now },
  finishedAt: Date,
}, { timestamps: true, collection: 'swarm_agent_runs' });

agentRunSchema.index({ jobId: 1, createdAt: -1 });

export const AgentRun = mongoose.models.AgentRun || mongoose.model<AgentRunDocument>('AgentRun', agentRunSchema);
