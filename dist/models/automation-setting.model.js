import mongoose, { Schema } from 'mongoose';
const automationSettingSchema = new Schema({
    key: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, required: true, default: false, index: true },
    mode: { type: String, enum: ['DRY_RUN', 'SHADOW', 'DRAFT_ONLY', 'APPROVAL_REQUIRED', 'AUTOMATED'], default: 'DRAFT_ONLY' },
    approvalRequired: { type: Boolean, default: true },
    autoPublishAllowed: { type: Boolean, default: false },
    socialPublishAllowed: { type: Boolean, default: false },
    config: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: Schema.Types.Mixed },
}, { timestamps: true, collection: 'swarm_automation_settings' });
export const AutomationSetting = mongoose.models.AutomationSetting || mongoose.model('AutomationSetting', automationSettingSchema);
