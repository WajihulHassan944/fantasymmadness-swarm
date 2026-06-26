import crypto from 'node:crypto';
import mongoose, { Schema } from 'mongoose';
import type { JobStatus, JobType } from '../contracts/job.js';
import type { SwarmMode, Vertical } from '../contracts/domain.js';

export interface SwarmJobDocument extends mongoose.Document {
  jobId: string;
  vertical: Vertical;
  jobType: JobType;
  mode: SwarmMode;
  status: JobStatus;
  priority: number;
  idempotencyKey?: string;
  requestedBy: Record<string, unknown>;
  sourceEntity?: Record<string, unknown>;
  input: Record<string, unknown>;
  artifactId?: string;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  runAfter: Date;
  leasedBy?: string;
  leaseExpiresAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancellationRequested: boolean;
  callbackUrl?: string;
  backendCorrelationId?: string;
  tokenUsage?: Record<string, unknown>;
  costEstimate?: Record<string, unknown>;
  error?: Record<string, unknown>;
  statusHistory: Array<{ status: JobStatus; at: Date; reason?: string }>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema({
  status: { type: String, required: true },
  at: { type: Date, required: true, default: Date.now },
  reason: String,
}, { _id: false });

const swarmJobSchema = new Schema<SwarmJobDocument>({
  jobId: { type: String, required: true, unique: true, default: () => `job_${crypto.randomUUID()}` },
  vertical: { type: String, enum: ['combat', 'pro_wrestling'], required: true, index: true },
  jobType: {
    type: String,
    enum: [
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
    ],
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

export const SwarmJob = mongoose.models.SwarmJob || mongoose.model<SwarmJobDocument>('SwarmJob', swarmJobSchema);
