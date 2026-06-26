import crypto from 'node:crypto';

export function sha256Hex(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function safeJsonHash(value: unknown): string {
  return sha256Hex(JSON.stringify(value ?? null));
}
