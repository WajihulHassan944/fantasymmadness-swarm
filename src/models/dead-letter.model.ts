import crypto from 'node:crypto';
import mongoose, { Schema } from 'mongoose';

export interface DeadLetterDocument extends mongoose.Document {
  deadLetterId: string;
  jobId: string;
  reason: string;
  error?: Record<string, unknown>;
  payloadSnapshot?: Record<string, unknown>;
  createdAt: Date;
}

const deadLetterSchema = new Schema<DeadLetterDocument>({
  deadLetterId: { type: String, required: true, unique: true, default: () => `dlq_${crypto.randomUUID()}` },
  jobId: { type: String, required: true, index: true },
  reason: { type: String, required: true },
  error: { type: Schema.Types.Mixed },
  payloadSnapshot: { type: Schema.Types.Mixed },
}, { timestamps: true, collection: 'swarm_dead_letters' });

export const DeadLetter = mongoose.models.DeadLetter || mongoose.model<DeadLetterDocument>('DeadLetter', deadLetterSchema);
