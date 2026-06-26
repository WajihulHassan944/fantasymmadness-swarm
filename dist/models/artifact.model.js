import crypto from 'node:crypto';
import mongoose, { Schema } from 'mongoose';
const swarmArtifactSchema = new Schema({
    artifactId: { type: String, required: true, unique: true, default: () => `art_${crypto.randomUUID()}` },
    jobId: { type: String, required: true, index: true },
    vertical: { type: String, enum: ['combat', 'pro_wrestling'], required: true, index: true },
    jobType: { type: String, required: true, index: true },
    artifactType: { type: String, required: true, index: true },
    title: { type: String, required: true },
    summary: String,
    reviewStatus: { type: String, enum: ['DRAFT', 'AWAITING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED'], default: 'AWAITING_REVIEW', index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    provenance: { type: Schema.Types.Mixed, default: {} },
    quality: { type: Schema.Types.Mixed, default: { warnings: [] } },
    reviewedBy: { type: Schema.Types.Mixed },
    reviewedAt: Date,
    reviewReason: String,
    metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, collection: 'swarm_artifacts' });
swarmArtifactSchema.index({ vertical: 1, artifactType: 1, reviewStatus: 1, createdAt: -1 });
export const SwarmArtifact = mongoose.models.SwarmArtifact || mongoose.model('SwarmArtifact', swarmArtifactSchema);
