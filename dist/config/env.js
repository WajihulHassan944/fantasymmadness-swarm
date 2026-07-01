import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const numberFromEnv = (defaultValue) => z.preprocess((value) => {
    if (value === undefined || value === null || value === '')
        return defaultValue;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
}, z.number());
const booleanFromEnv = (defaultValue) => z.preprocess((value) => {
    if (value === undefined || value === null || value === '')
        return defaultValue;
    if (typeof value === 'boolean')
        return value;
    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized))
        return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized))
        return false;
    return value;
}, z.boolean());
const optionalString = z.preprocess((value) => {
    if (value === undefined || value === null)
        return undefined;
    const normalized = String(value).trim();
    return normalized.length ? normalized : undefined;
}, z.string().optional());
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    SERVICE_NAME: z.string().default('fantasymmadness-swarm'),
    PORT: numberFromEnv(8080),
    LOG_LEVEL: z.string().default('info'),
    MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/fantasymmadness_swarm'),
    MONGODB_DB_NAME: z.string().default('fantasymmadness_swarm'),
    SWARM_API_KEY: optionalString,
    SWARM_HMAC_KEY_ID: z.string().default('swarm-v1'),
    SWARM_HMAC_SECRET: optionalString,
    HMAC_MAX_SKEW_SECONDS: numberFromEnv(300),
    CORS_ORIGINS: z.string().default('https://fantasymmadness.com,https://www.fantasymmadness.com'),
    API_RATE_LIMIT_WINDOW_MS: numberFromEnv(60_000),
    API_RATE_LIMIT_MAX: numberFromEnv(240),
    API_BODY_LIMIT: z.string().default('1mb'),
    WORKER_ID: z.string().default(`worker-${process.pid}`),
    WORKER_CONCURRENCY: numberFromEnv(2),
    JOB_POLL_INTERVAL_MS: numberFromEnv(2500),
    JOB_LEASE_SECONDS: numberFromEnv(120),
    JOB_DEFAULT_MAX_ATTEMPTS: numberFromEnv(3),
    JOB_RETRY_BASE_DELAY_MS: numberFromEnv(30_000),
    SCHEDULER_ENABLED: booleanFromEnv(false),
    SCHEDULED_INTERVAL_MS: numberFromEnv(3_600_000),
    SCHEDULED_DAILY_SEO_ENABLED: booleanFromEnv(true),
    SCHEDULED_FIGHT_CALENDAR_ENABLED: booleanFromEnv(true),
    SCHEDULED_DAILY_SOCIAL_ENABLED: booleanFromEnv(true),
    SCHEDULED_DAILY_CONTENT_ENABLED: booleanFromEnv(true),
    SCHEDULED_SOCIAL_DRAFTS_PER_DAY: numberFromEnv(3),
    SCHEDULED_GROWTH_PLAN_ENABLED: booleanFromEnv(true),
    SOCIAL_DEFAULT_PLATFORMS: z.string().default('x,instagram,facebook'),
    JULY_SIGNUP_GOAL: numberFromEnv(10_000),
    GROWTH_TIMEZONE: z.string().default('America/New_York'),
    GROWTH_DAILY_INSTAGRAM_POSTS: numberFromEnv(6),
    GROWTH_DAILY_FACEBOOK_POSTS: numberFromEnv(5),
    GROWTH_DAILY_X_POSTS: numberFromEnv(15),
    GROWTH_DAILY_YOUTUBE_VIDEOS: numberFromEnv(2),
    GROWTH_DAILY_SHORTS: numberFromEnv(8),
    GROWTH_DAILY_BLOGS: numberFromEnv(4),
    GROWTH_DAILY_STORIES: numberFromEnv(10),
    GROWTH_DAILY_NOTIFICATIONS: numberFromEnv(3),
    SWARM_DAILY_CONTENT_ASSET_CAP: numberFromEnv(60),
    BRAND_LOGO_URL: optionalString,
    BRAND_LOGO_CORNER: z.string().default('bottom-right'),
    BRAND_LOGO_OPACITY: numberFromEnv(0.86),
    OPENAI_API_KEY: optionalString,
    OPENAI_MODEL: z.string().default('gpt-4o-mini'),
    OPENAI_DISABLED: booleanFromEnv(false),
    OPENAI_REQUEST_TIMEOUT_MS: numberFromEnv(45_000),
    BACKEND_CALLBACK_ENABLED: booleanFromEnv(false),
    BACKEND_BASE_URL: optionalString,
    BACKEND_HMAC_KEY_ID: z.string().default('backend-v1'),
    BACKEND_HMAC_SECRET: optionalString,
    SWARM_DEFAULT_MODE: z.enum(['DRY_RUN', 'SHADOW', 'DRAFT_ONLY', 'APPROVAL_REQUIRED', 'AUTOMATED']).default('DRAFT_ONLY'),
    SWARM_AUTO_PUBLISH_ENABLED: booleanFromEnv(false),
    SWARM_AUTO_IMPORT_ENABLED: booleanFromEnv(false),
    SWARM_SOCIAL_PUBLISH_ENABLED: booleanFromEnv(false),
    TWITTER_API_KEY: optionalString,
    TWITTER_API_SECRET: optionalString,
    TWITTER_ACCESS_TOKEN: optionalString,
    TWITTER_ACCESS_SECRET: optionalString,
    META_GRAPH_API_VERSION: z.string().default('v21.0'),
    META_APP_ID: optionalString,
    META_APP_SECRET: optionalString,
    FACEBOOK_PAGE_ID: optionalString,
    FACEBOOK_PAGE_ACCESS_TOKEN: optionalString,
    INSTAGRAM_BUSINESS_ACCOUNT_ID: optionalString,
    INSTAGRAM_ACCESS_TOKEN: optionalString,
    YOUTUBE_CHANNEL_ID: optionalString,
    YOUTUBE_CLIENT_ID: optionalString,
    YOUTUBE_CLIENT_SECRET: optionalString,
    YOUTUBE_REFRESH_TOKEN: optionalString,
    YOUTUBE_UPLOAD_ENABLED: booleanFromEnv(false),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
    process.exit(1);
}
if (parsed.data.NODE_ENV === 'production') {
    const hasApiKey = Boolean(parsed.data.SWARM_API_KEY && parsed.data.SWARM_API_KEY.length >= 24);
    const hasHmacSecret = Boolean(parsed.data.SWARM_HMAC_SECRET && parsed.data.SWARM_HMAC_SECRET.length >= 32);
    if (!hasApiKey && !hasHmacSecret) {
        // eslint-disable-next-line no-console
        console.error('Production requires SWARM_API_KEY length >= 24 or SWARM_HMAC_SECRET length >= 32.');
        process.exit(1);
    }
}
export const env = {
    ...parsed.data,
    CORS_ORIGINS: parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
    SOCIAL_DEFAULT_PLATFORMS: parsed.data.SOCIAL_DEFAULT_PLATFORMS.split(',').map((platform) => platform.trim().toLowerCase()).filter(Boolean),
};
