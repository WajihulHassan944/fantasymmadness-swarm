import crypto from 'node:crypto';
import mongoose, { Schema } from 'mongoose';
import { jobTypeValues } from '../contracts/job.js';
const statusHistorySchema = new Schema({
    status: { type: String, required: true },
    at: { type: Date, required: true, default: Date.now },
    reason: String,
}, { _id: false });
const swarmJobSchema = new Schema({
    jobId: { type: String, required: true, unique: true, default: () => `job_${crypto.randomUUID()}` },
    vertical: { type: String, enum: ['combat', 'pro_wrestling'], required: true, index: true },
    jobType: {
        type: String,
        enum: jobTypeValues,
        required: true,
        index: true,
    },
    mode: { type: String, enum: ['DRY_RUN', 'SHADOW', 'DRAFT_ONLY', 'APPROVAL_REQUIRED', 'AUTOMATED'], default: 'DRAFT_ONLY' },
    status: { type: String, default: 'queued', index: true },
    priority: { type: Number, default: 50, index: true },
    idempotencyKey: { type: String, unique: true, sparse: true },
    requestedBy: { type: Schema.Types.Mixed, default: {} },
    sourceEntity: { type: Schema.Types.Mixed },
    input: { type: Schema.Types.Mixed, default: {} },
    artifactId: { type: String, index: true },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 3, min: 1, max: 10 },
    scheduledAt: { type: Date, default: Date.now, index: true },
    runAfter: { type: Date, default: Date.now, index: true },
    leasedBy: { type: String, index: true },
    leaseExpiresAt: { type: Date, index: true },
    startedAt: Date,
    completedAt: Date,
    cancellationRequested: { type: Boolean, default: false, index: true },
    callbackUrl: String,
    backendCorrelationId: String,
    tokenUsage: { type: Schema.Types.Mixed },
    costEstimate: { type: Schema.Types.Mixed },
    error: { type: Schema.Types.Mixed },
    statusHistory: { type: [statusHistorySchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, collection: 'swarm_jobs' });
swarmJobSchema.index({ status: 1, runAfter: 1, scheduledAt: 1, priority: -1, createdAt: 1 });
swarmJobSchema.index({ vertical: 1, jobType: 1, status: 1, createdAt: -1 });
export const SwarmJob = mongoose.models.SwarmJob || mongoose.model('SwarmJob', swarmJobSchema);
