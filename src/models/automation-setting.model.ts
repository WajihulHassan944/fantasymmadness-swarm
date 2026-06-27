import mongoose, { Schema } from 'mongoose';
import type { SwarmMode } from '../contracts/domain.js';

export interface AutomationSettingDocument extends mongoose.Document {
  key: string;
  enabled: boolean;
  mode: SwarmMode;
  approvalRequired: boolean;
  autoPublishAllowed: boolean;
  socialPublishAllowed: boolean;
  config: Record<string, unknown>;
  updatedBy?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const automationSettingSchema = new Schema<AutomationSettingDocument>({
  key: { type: String, required: true, unique: true, index: true },
  enabled: { type: Boolean, required: true, default: false, index: true },
  mode: { type: String, enum: ['DRY_RUN', 'SHADOW', 'DRAFT_ONLY', 'APPROVAL_REQUIRED', 'AUTOMATED'], default: 'DRAFT_ONLY' },
  approvalRequired: { type: Boolean, default: true },
  autoPublishAllowed: { type: Boolean, default: false },
  socialPublishAllowed: { type: Boolean, default: false },
  config: { type: Schema.Types.Mixed, default: {} },
  updatedBy: { type: Schema.Types.Mixed },
}, { timestamps: true, collection: 'swarm_automation_settings' });

export const AutomationSetting = mongoose.models.AutomationSetting || mongoose.model<AutomationSettingDocument>('AutomationSetting', automationSettingSchema);
