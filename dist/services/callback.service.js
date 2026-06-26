import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { signRequest } from '../security/hmac.js';
import { logger } from '../utils/logger.js';
function callbackSecret() {
    return env.BACKEND_HMAC_SECRET || env.SWARM_HMAC_SECRET;
}
function buildCallbackUrl(path, explicitUrl) {
    if (explicitUrl)
        return explicitUrl;
    if (!env.BACKEND_BASE_URL)
        return undefined;
    return `${env.BACKEND_BASE_URL.replace(/\/$/, '')}${path}`;
}
export async function sendJobCompletedCallback(job, artifact) {
    if (!env.BACKEND_CALLBACK_ENABLED)
        return;
    const url = buildCallbackUrl('/api/internal/swarm/webhooks/job-completed', job.callbackUrl);
    if (!url)
        return;
    await postSignedJson(url, {
        event: 'swarm.job.completed',
        jobId: job.jobId,
        backendCorrelationId: job.backendCorrelationId,
        artifactId: artifact.artifactId,
        status: job.status,
        vertical: job.vertical,
        jobType: job.jobType,
        completedAt: new Date().toISOString(),
    });
}
export async function sendJobFailedCallback(job) {
    if (!env.BACKEND_CALLBACK_ENABLED)
        return;
    const url = buildCallbackUrl('/api/internal/swarm/webhooks/job-failed', job.callbackUrl);
    if (!url)
        return;
    await postSignedJson(url, {
        event: 'swarm.job.failed',
        jobId: job.jobId,
        backendCorrelationId: job.backendCorrelationId,
        status: job.status,
        vertical: job.vertical,
        jobType: job.jobType,
        error: job.error,
        failedAt: new Date().toISOString(),
    });
}
async function postSignedJson(url, payload) {
    const secret = callbackSecret();
    if (!secret) {
        logger.warn({ url }, 'Backend callback skipped because no HMAC secret is configured');
        return;
    }
    const parsedUrl = new URL(url);
    const body = JSON.stringify(payload);
    const timestamp = new Date().toISOString();
    const nonce = crypto.randomUUID();
    const pathWithQuery = `${parsedUrl.pathname}${parsedUrl.search}`;
    const signature = signRequest({
        method: 'POST',
        pathWithQuery,
        timestamp,
        nonce,
        body,
        secret,
    });
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-swarm-key-id': env.BACKEND_HMAC_KEY_ID,
            'x-swarm-timestamp': timestamp,
            'x-swarm-nonce': nonce,
            'x-swarm-signature': signature,
        },
        body,
    });
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        logger.warn({ url, status: response.status, body: text.slice(0, 500) }, 'Backend callback failed');
    }
}
