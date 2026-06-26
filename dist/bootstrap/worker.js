import { connectToMongo, disconnectFromMongo } from '../db/connection.js';
import { SchedulerService } from '../services/scheduler.service.js';
import { JobWorker } from '../workers/job-worker.js';
import { logger } from '../utils/logger.js';
async function main() {
    await connectToMongo();
    const worker = new JobWorker();
    const scheduler = new SchedulerService();
    scheduler.start();
    worker.start();
    const shutdown = async (signal) => {
        logger.info({ signal }, 'Swarm worker shutdown requested');
        scheduler.stop();
        worker.stop();
        await disconnectFromMongo();
        logger.info('Swarm worker stopped');
        process.exit(0);
    };
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
}
main().catch((error) => {
    logger.error({ error }, 'Swarm worker failed to start');
    process.exit(1);
});
