import { describe, expect, it } from 'vitest';
import { canonicalPayload, normalizeSignature, signRequest } from '../src/security/hmac.js';

describe('HMAC signing', () => {
  it('creates stable signatures for identical requests', () => {
    const input = {
      method: 'POST',
      pathWithQuery: '/internal/v1/jobs',
      timestamp: '2026-06-26T00:00:00.000Z',
      nonce: 'nonce-1',
      body: '{"ok":true}',
      secret: 'super-secret-value',
    };

    expect(signRequest(input)).toEqual(signRequest(input));
    expect(canonicalPayload(input)).toContain('/internal/v1/jobs');
  });

  it('normalizes sha256 prefix', () => {
    expect(normalizeSignature('sha256=abc')).toBe('abc');
    expect(normalizeSignature('abc')).toBe('abc');
  });
});
