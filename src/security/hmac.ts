import crypto from 'node:crypto';
import { sha256Hex } from '../utils/hash.js';

export interface SignatureInput {
  method: string;
  pathWithQuery: string;
  timestamp: string;
  nonce: string;
  body: string | Buffer;
  secret: string;
}

export function canonicalPayload(input: Omit<SignatureInput, 'secret'>): string {
  const bodyHash = sha256Hex(input.body || '');
  return [input.method.toUpperCase(), input.pathWithQuery, input.timestamp, input.nonce, bodyHash].join('\n');
}

export function signCanonicalPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function signRequest(input: SignatureInput): string {
  return signCanonicalPayload(canonicalPayload(input), input.secret);
}

export function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function normalizeSignature(signature: string): string {
  return signature.startsWith('sha256=') ? signature.slice('sha256='.length) : signature;
}

export function randomSecret(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}
