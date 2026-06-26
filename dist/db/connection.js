import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
let connectionPromise = null;
export function connectToMongo() {
    if (connectionPromise)
        return connectionPromise;
    mongoose.set('strictQuery', true);
    connectionPromise = mongoose.connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 10_000,
        maxPoolSize: 10,
    });
    connectionPromise
        .then(() => logger.info({ dbName: env.MONGODB_DB_NAME }, 'MongoDB connected'))
        .catch((error) => {
        logger.error({ error }, 'MongoDB connection failed');
        connectionPromise = null;
    });
    return connectionPromise;
}
export async function disconnectFromMongo() {
    await mongoose.disconnect();
    connectionPromise = null;
}
export function isMongoReady() {
    return mongoose.connection.readyState === 1;
}
