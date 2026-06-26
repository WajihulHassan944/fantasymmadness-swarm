import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env.js';
import { SecurityNonce } from '../../models/security-nonce.model.js';
import { normalizeSignature, signRequest, timingSafeEqualString } from '../../security/hmac.js';
import { AppError } from '../../utils/errors.js';

function secondsBetweenNow(timestamp: string): number {
  const millis = Date.parse(timestamp);
  if (!Number.isFinite(millis)) return Number.POSITIVE_INFINITY;
  return Math.abs(Date.now() - millis) / 1000;
}

async function assertFreshNonce(keyId: string, nonce: string): Promise<void> {
  try {
    await SecurityNonce.create({
      keyId,
      nonce,
      expiresAt: new Date(Date.now() + env.HMAC_MAX_SKEW_SECONDS * 1000),
    });
  } catch (error) {
    throw new AppError(401, 'REPLAYED_NONCE', 'Request nonce was already used or could not be stored.', { keyId });
  }
}

export async function internalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const apiKey = req.header('x-swarm-api-key');
    if (env.SWARM_API_KEY && apiKey && timingSafeEqualString(apiKey, env.SWARM_API_KEY)) {
      req.authenticatedClient = { type: 'api-key' };
      next();
      return;
    }

    const keyId = req.header('x-swarm-key-id');
    const timestamp = req.header('x-swarm-timestamp');
    const nonce = req.header('x-swarm-nonce');
    const providedSignature = req.header('x-swarm-signature');

    if (!env.SWARM_HMAC_SECRET) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Missing or invalid swarm credentials.');
    }

    if (!keyId || !timestamp || !nonce || !providedSignature) {
      throw new AppError(401, 'HMAC_HEADERS_REQUIRED', 'Missing HMAC authentication headers.');
    }

    if (keyId !== env.SWARM_HMAC_KEY_ID) {
      throw new AppError(401, 'INVALID_KEY_ID', 'Invalid swarm key id.');
    }

    if (secondsBetweenNow(timestamp) > env.HMAC_MAX_SKEW_SECONDS) {
      throw new AppError(401, 'STALE_SIGNATURE', 'Request timestamp is outside the allowed skew.');
    }

    const expectedSignature = signRequest({
      method: req.method,
      pathWithQuery: req.originalUrl,
      timestamp,
      nonce,
      body: req.rawBody || '',
      secret: env.SWARM_HMAC_SECRET,
    });

    if (!timingSafeEqualString(normalizeSignature(providedSignature), expectedSignature)) {
      throw new AppError(401, 'INVALID_SIGNATURE', 'Invalid request signature.');
    }

    await assertFreshNonce(keyId, nonce);
    req.authenticatedClient = { type: 'hmac', keyId };
    next();
  } catch (error) {
    next(error);
  }
}
