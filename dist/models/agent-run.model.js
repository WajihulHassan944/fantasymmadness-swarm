import crypto from 'node:crypto';
import mongoose, { Schema } from 'mongoose';
const agentRunSchema = new Schema({
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
export const AgentRun = mongoose.models.AgentRun || mongoose.model('AgentRun', agentRunSchema);
