import crypto from 'node:crypto';
import { sha256Hex } from '../utils/hash.js';
export function canonicalPayload(input) {
    const bodyHash = sha256Hex(input.body || '');
    return [input.method.toUpperCase(), input.pathWithQuery, input.timestamp, input.nonce, bodyHash].join('\n');
}
export function signCanonicalPayload(payload, secret) {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
export function signRequest(input) {
    return signCanonicalPayload(canonicalPayload(input), input.secret);
}
export function timingSafeEqualString(left, right) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length)
        return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
export function normalizeSignature(signature) {
    return signature.startsWith('sha256=') ? signature.slice('sha256='.length) : signature;
}
export function randomSecret(bytes = 48) {
    return crypto.randomBytes(bytes).toString('base64url');
}
