import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.header('x-request-id');
  req.requestId = incomingId && incomingId.length <= 120 ? incomingId : crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}
