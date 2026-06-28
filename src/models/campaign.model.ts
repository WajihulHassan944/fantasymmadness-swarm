import crypto from 'node:crypto';
import mongoose, { Schema } from 'mongoose';
import { campaignStatusSchema, campaignTypeValues, type CampaignStatus, type CampaignType, type CombatSport } from '../contracts/campaign.js';
import type { SwarmMode, Vertical } from '../contracts/domain.js';

export interface SwarmCampaignDocument extends mongoose.Document {
  campaignId: string;
  campaignType: CampaignType;
  title: string;
  vertical: Vertical;
  sport: CombatSport;
  mode: SwarmMode;
  status: CampaignStatus;
  priority: number;
  requestedBy: Record<string, unknown>;
  sourceEntity?: Record<string, unknown>;
  input: Record<string, unknown>;
  sections: string[];
  automationKeys: string[];
  jobIds: string[];
  counts: {
    total: number;
    queued: number;
    running: number;
    awaitingReview: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  callbackUrl?: string;
  backendCorrelationId?: string;
  idempotencyKey?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const countsSchema = new Schema({
  total: { type: Number, default: 0 },
  queued: { type: Number, default: 0 },
  running: { type: Number, default: 0 },
  awaitingReview: { type: Number, default: 0 },
  completed: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  cancelled: { type: Number, default: 0 },
}, { _id: false });

const campaignSchema = new Schema<SwarmCampaignDocument>({
  campaignId: { type: String, required: true, unique: true, default: () => `camp_${crypto.randomUUID()}` },
  campaignType: { type: String, enum: campaignTypeValues, required: true, index: true },
  title: { type: String, required: true },
  vertical: { type: String, enum: ['combat', 'pro_wrestling'], required: true, index: true },
  sport: { type: String, enum: ['mma', 'boxing', 'kickboxing', 'combat', 'pro_wrestling'], default: 'mma', index: true },
  mode: { type: String, enum: ['DRY_RUN', 'SHADOW', 'DRAFT_ONLY', 'APPROVAL_REQUIRED', 'AUTOMATED'], default: 'APPROVAL_REQUIRED' },
  status: { type: String, enum: campaignStatusSchema.options, default: 'created', index: true },
  priority: { type: Number, default: 70, index: true },
  requestedBy: { type: Schema.Types.Mixed, default: {} },
  sourceEntity: { type: Schema.Types.Mixed },
  input: { type: Schema.Types.Mixed, default: {} },
  sections: { type: [String], default: [] },
  automationKeys: { type: [String], default: [] },
  jobIds: { type: [String], default: [] },
  counts: { type: countsSchema, default: () => ({}) },
  callbackUrl: String,
  backendCorrelationId: String,
  idempotencyKey: { type: String, unique: true, sparse: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, collection: 'swarm_campaigns' });

campaignSchema.index({ campaignType: 1, status: 1, createdAt: -1 });
campaignSchema.index({ vertical: 1, sport: 1, createdAt: -1 });

export const SwarmCampaign = mongoose.models.SwarmCampaign || mongoose.model<SwarmCampaignDocument>('SwarmCampaign', campaignSchema);
