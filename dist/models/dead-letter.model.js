import crypto from 'node:crypto';
import mongoose, { Schema } from 'mongoose';
const deadLetterSchema = new Schema({
    deadLetterId: { type: String, required: true, unique: true, default: () => `dlq_${crypto.randomUUID()}` },
    jobId: { type: String, required: true, index: true },
    reason: { type: String, required: true },
    error: { type: Schema.Types.Mixed },
    payloadSnapshot: { type: Schema.Types.Mixed },
}, { timestamps: true, collection: 'swarm_dead_letters' });
export const DeadLetter = mongoose.models.DeadLetter || mongoose.model('DeadLetter', deadLetterSchema);
