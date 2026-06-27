import crypto from 'node:crypto';
import mongoose, { Schema } from 'mongoose';

export interface AutomationLogDocument extends mongoose.Document {
  logId: string;
  key?: string;
  trigger?: string;
  action: string;
  status: 'succeeded' | 'skipped' | 'failed';
  message: string;
  createdJobs: string[];
  details: Record<string, unknown>;
  actor?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const automationLogSchema = new Schema<AutomationLogDocument>({
  logId: { type: String, required: true, unique: true, default: () => `alog_${crypto.randomUUID()}` },
  key: { type: String, index: true },
  trigger: { type: String, index: true },
  action: { type: String, required: true, index: true },
  status: { type: String, enum: ['succeeded', 'skipped', 'failed'], required: true, index: true },
  message: { type: String, required: true },
  createdJobs: { type: [String], default: [] },
  details: { type: Schema.Types.Mixed, default: {} },
  actor: { type: Schema.Types.Mixed },
}, { timestamps: true, collection: 'swarm_automation_logs' });

automationLogSchema.index({ trigger: 1, createdAt: -1 });
automationLogSchema.index({ key: 1, createdAt: -1 });

export const AutomationLog = mongoose.models.AutomationLog || mongoose.model<AutomationLogDocument>('AutomationLog', automationLogSchema);
