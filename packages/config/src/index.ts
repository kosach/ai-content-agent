import 'dotenv/config';
import { z } from 'zod';

/**
 * Configuration Schema
 * 
 * Validates all environment variables at startup
 */
const ConfigSchema = z.object({
  // Node Environment
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  database: z.object({
    url: z.string().url(),
  }),

  // Redis
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(6379),
    password: z.string().optional(),
  }),

  // S3 Storage
  s3: z.object({
    endpoint: z.string().optional(), // Optional for AWS S3, required for MinIO
    bucket: z.string().min(1, 'S3 bucket name is required'),
    accessKey: z.string().min(1, 'S3 access key is required'),
    secretKey: z.string().min(1, 'S3 secret key is required'),
    region: z.string().default('us-east-1'),
  }),

  // AI Providers
  ai: z.object({
    gemini: z.object({
      apiKey: z.string().min(1, 'Gemini API key is required'),
      model: z.string().default('gemini-2.0-flash-exp'),
    }),
    openai: z.object({
      apiKey: z.string().optional(),
    }),
    anthropic: z.object({
      apiKey: z.string().optional(),
    }),
  }),

  // Telegram
  telegram: z.object({
    botToken: z.string().min(1, 'Telegram bot token is required'),
  }),

  // YouTube OAuth
  youtube: z.object({
    clientId: z.string().min(1).optional(),
    clientSecret: z.string().min(1).optional(),
    redirectUri: z.string().optional(),
  }),

  // Facebook OAuth
  facebook: z.object({
    appId: z.string().min(1).optional(),
    appSecret: z.string().min(1).optional(),
    redirectUri: z.string().optional(),
  }),

  // API Server
  api: z.object({
    port: z.coerce.number().default(3000),
    host: z.string().default('0.0.0.0'),
    baseUrl: z.string().default('http://localhost:3000'),
  }),

  // Workers
  worker: z.object({
    concurrency: z.coerce.number().default(5),
  }),

  // Observability
  observability: z.object({
    logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    otelEndpoint: z.string().url().optional(),
  }),
});

type Config = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from environment variables
 */
function loadConfig(): Config {
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
  } catch (error) {
    if (error instanceof z.ZodError) {
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
export const config = loadConfig();

// Export types
export type { Config };
