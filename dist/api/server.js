import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttpImport from 'pino-http';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { internalAuth } from './middleware/auth.js';
import { requestContext } from './middleware/request-context.js';
import { healthRouter } from './routes/health.routes.js';
import { internalRouter } from './routes/internal.routes.js';
const pinoHttp = pinoHttpImport;
export function createApp() {
    const app = express();
    app.disable('x-powered-by');
    app.use(requestContext);
    app.use(helmet());
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (env.CORS_ORIGINS.includes(origin))
                return callback(null, true);
            return callback(null, false);
        },
        credentials: false,
    }));
    app.use(compression());
    app.use(rateLimit({
        windowMs: env.API_RATE_LIMIT_WINDOW_MS,
        max: env.API_RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
    }));
    app.use(pinoHttp({ logger }));
    app.use(express.json({
        limit: env.API_BODY_LIMIT,
        verify: (req, _res, buffer) => {
            req.rawBody = buffer.toString('utf8');
        },
    }));
    app.use(healthRouter);
    app.use('/internal/v1', internalAuth, internalRouter);
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}
