#!/usr/bin/env node
import crypto from 'node:crypto';

const baseUrl = process.env.SWARM_URL || 'http://127.0.0.1:8080';
const apiKey = process.env.SWARM_API_KEY;
const secret = process.env.SWARM_HMAC_SECRET;
const keyId = process.env.SWARM_HMAC_KEY_ID || 'swarm-v1';

const body = JSON.stringify({
  vertical: process.env.VERTICAL || 'combat',
  jobType: process.env.JOB_TYPE || 'content.article',
  mode: 'DRAFT_ONLY',
  priority: 50,
  idempotencyKey: `manual:${Date.now()}`,
  requestedBy: { source: 'developer', role: 'developer' },
  input: {
    topic: process.env.TOPIC || 'FantasyMMAdness automated swarm smoke test',
    keywords: ['FantasyMMAdness', 'automation'],
  },
});

const path = '/internal/v1/jobs';
const url = `${baseUrl}${path}`;
const headers = { 'content-type': 'application/json' };

if (apiKey) {
  headers['x-swarm-api-key'] = apiKey;
} else if (secret) {
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
  const payload = ['POST', path, timestamp, nonce, bodyHash].join('\n');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  headers['x-swarm-key-id'] = keyId;
  headers['x-swarm-timestamp'] = timestamp;
  headers['x-swarm-nonce'] = nonce;
  headers['x-swarm-signature'] = signature;
} else {
  console.error('Set SWARM_API_KEY or SWARM_HMAC_SECRET in your shell.');
  process.exit(1);
}

const response = await fetch(url, { method: 'POST', headers, body });
console.log(response.status, await response.text());
process.exit(response.ok ? 0 : 1);
