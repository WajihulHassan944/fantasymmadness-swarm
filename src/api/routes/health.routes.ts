import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { isMongoReady } from '../../db/connection.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: env.SERVICE_NAME,
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/readiness', (_req, res) => {
  const ready = isMongoReady();
  res.status(ready ? 200 : 503).json({
    ok: ready,
    mongo: {
      readyState: mongoose.connection.readyState,
      dbName: mongoose.connection.db?.databaseName,
    },
    timestamp: new Date().toISOString(),
  });
});
