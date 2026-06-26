import { ZodError } from 'zod';
import { isAppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
export function notFoundHandler(req, res) {
    res.status(404).json({
        ok: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route not found: ${req.method} ${req.originalUrl}`,
        },
        requestId: req.requestId,
    });
}
export function errorHandler(error, req, res, _next) {
    if (error instanceof ZodError) {
        res.status(400).json({
            ok: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed',
                details: error.flatten(),
            },
            requestId: req.requestId,
        });
        return;
    }
    if (isAppError(error)) {
        res.status(error.statusCode).json({
            ok: false,
            error: {
                code: error.code,
                message: error.message,
                details: error.details,
            },
            requestId: req.requestId,
        });
        return;
    }
    logger.error({ error, requestId: req.requestId }, 'Unhandled API error');
    res.status(500).json({
        ok: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
        },
        requestId: req.requestId,
    });
}
