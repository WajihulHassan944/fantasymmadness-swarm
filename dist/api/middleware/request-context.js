import crypto from 'node:crypto';
export function requestContext(req, res, next) {
    const incomingId = req.header('x-request-id');
    req.requestId = incomingId && incomingId.length <= 120 ? incomingId : crypto.randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
}
