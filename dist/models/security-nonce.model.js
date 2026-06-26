import mongoose, { Schema } from 'mongoose';
const securityNonceSchema = new Schema({
    keyId: { type: String, required: true },
    nonce: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true, collection: 'swarm_security_nonces' });
securityNonceSchema.index({ keyId: 1, nonce: 1 }, { unique: true });
export const SecurityNonce = mongoose.models.SecurityNonce || mongoose.model('SecurityNonce', securityNonceSchema);
