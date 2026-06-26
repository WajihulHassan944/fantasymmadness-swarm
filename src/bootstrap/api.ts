import http from 'node:http';
import { createApp } from '../api/server.js';
import { env } from '../config/env.js';
import { connectToMongo, disconnectFromMongo } from '../db/connection.js';
import { logger } from '../utils/logger.js';

async function main(): Promise<void> {
  await connectToMongo();
  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Swarm API listening');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Swarm API shutdown requested');
    server.close(async () => {
      await disconnectFromMongo();
      logger.info('Swarm API stopped');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 15_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error({ error }, 'Swarm API failed to start');
  process.exit(1);
});
