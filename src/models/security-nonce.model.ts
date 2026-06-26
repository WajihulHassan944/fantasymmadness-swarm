import mongoose, { Schema } from 'mongoose';

export interface SecurityNonceDocument extends mongoose.Document {
  keyId: string;
  nonce: string;
  expiresAt: Date;
  createdAt: Date;
}

const securityNonceSchema = new Schema<SecurityNonceDocument>({
  keyId: { type: String, required: true },
  nonce: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true, collection: 'swarm_security_nonces' });

securityNonceSchema.index({ keyId: 1, nonce: 1 }, { unique: true });

export const SecurityNonce = mongoose.models.SecurityNonce || mongoose.model<SecurityNonceDocument>('SecurityNonce', securityNonceSchema);
