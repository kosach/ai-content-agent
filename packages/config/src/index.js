"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
const zod_1 = require("zod");
/**
 * Configuration Schema
 *
 * Validates all environment variables at startup
 */
const ConfigSchema = zod_1.z.object({
    // Node Environment
    nodeEnv: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    // Database
    database: zod_1.z.object({
        url: zod_1.z.string().url(),
    }),
    // Redis
    redis: zod_1.z.object({
        host: zod_1.z.string().default('localhost'),
        port: zod_1.z.coerce.number().default(6379),
        password: zod_1.z.string().optional(),
    }),
    // S3 Storage
    s3: zod_1.z.object({
        endpoint: zod_1.z.string().optional(), // Optional for AWS S3, required for MinIO
        bucket: zod_1.z.string().min(1, 'S3 bucket name is required'),
        accessKey: zod_1.z.string().min(1, 'S3 access key is required'),
        secretKey: zod_1.z.string().min(1, 'S3 secret key is required'),
        region: zod_1.z.string().default('us-east-1'),
    }),
    // AI Providers
    ai: zod_1.z.object({
        gemini: zod_1.z.object({
            apiKey: zod_1.z.string().min(1, 'Gemini API key is required'),
            model: zod_1.z.string().default('gemini-2.0-flash-exp'),
        }),
        openai: zod_1.z.object({
            apiKey: zod_1.z.string().optional(),
        }),
        anthropic: zod_1.z.object({
            apiKey: zod_1.z.string().optional(),
        }),
    }),
    // Telegram
    telegram: zod_1.z.object({
        botToken: zod_1.z.string().min(1, 'Telegram bot token is required'),
    }),
    // YouTube OAuth
    youtube: zod_1.z.object({
        clientId: zod_1.z.string().min(1).optional(),
        clientSecret: zod_1.z.string().min(1).optional(),
        redirectUri: zod_1.z.string().optional(),
    }),
    // Facebook OAuth
    facebook: zod_1.z.object({
        appId: zod_1.z.string().min(1).optional(),
        appSecret: zod_1.z.string().min(1).optional(),
        redirectUri: zod_1.z.string().optional(),
    }),
    // API Server
    api: zod_1.z.object({
        port: zod_1.z.coerce.number().default(3000),
        host: zod_1.z.string().default('0.0.0.0'),
        baseUrl: zod_1.z.string().default('http://localhost:3000'),
    }),
    // Workers
    worker: zod_1.z.object({
        concurrency: zod_1.z.coerce.number().default(5),
    }),
    // Observability
    observability: zod_1.z.object({
        logLevel: zod_1.z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
        otelEndpoint: zod_1.z.string().url().optional(),
    }),
});
/**
 * Load and validate configuration from environment variables
 */
function loadConfig() {
    const rawConfig = {
        nodeEnv: process.env.NODE_ENV,
        database: {
            url: process.env.DATABASE_URL,
        },
        redis: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            password: process.env.REDIS_PASSWORD,
        },
        s3: {
            endpoint: process.env.S3_ENDPOINT,
            bucket: process.env.S3_BUCKET,
            accessKey: process.env.S3_ACCESS_KEY,
            secretKey: process.env.S3_SECRET_KEY,
            region: process.env.S3_REGION,
        },
        ai: {
            gemini: {
                apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY,
                model: process.env.GEMINI_MODEL,
            },
            openai: {
                apiKey: process.env.OPENAI_API_KEY,
            },
            anthropic: {
                apiKey: process.env.ANTHROPIC_API_KEY,
            },
        },
        telegram: {
            botToken: process.env.TELEGRAM_BOT_TOKEN,
        },
        youtube: {
            clientId: process.env.YOUTUBE_CLIENT_ID,
            clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
            redirectUri: process.env.YOUTUBE_REDIRECT_URI,
        },
        facebook: {
            appId: process.env.FACEBOOK_APP_ID,
            appSecret: process.env.FACEBOOK_APP_SECRET,
            redirectUri: process.env.FACEBOOK_REDIRECT_URI,
        },
        api: {
            port: process.env.API_PORT,
            host: process.env.API_HOST,
            baseUrl: process.env.API_BASE_URL,
        },
        worker: {
            concurrency: process.env.WORKER_CONCURRENCY,
        },
        observability: {
            logLevel: process.env.LOG_LEVEL,
            otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        },
    };
    try {
        return ConfigSchema.parse(rawConfig);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error('Configuration validation failed:');
            error.errors.forEach((err) => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
            throw new Error('Invalid configuration');
        }
        throw error;
    }
}
// Export singleton config instance
exports.config = loadConfig();
//# sourceMappingURL=index.js.map