import 'dotenv/config';
import { z } from 'zod';
/**
 * Configuration Schema
 *
 * Validates all environment variables at startup
 */
declare const ConfigSchema: z.ZodObject<{
    nodeEnv: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    database: z.ZodObject<{
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        url: string;
    }, {
        url: string;
    }>;
    redis: z.ZodObject<{
        host: z.ZodDefault<z.ZodString>;
        port: z.ZodDefault<z.ZodNumber>;
        password: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        host: string;
        port: number;
        password?: string | undefined;
    }, {
        host?: string | undefined;
        port?: number | undefined;
        password?: string | undefined;
    }>;
    s3: z.ZodObject<{
        endpoint: z.ZodOptional<z.ZodString>;
        bucket: z.ZodString;
        accessKey: z.ZodString;
        secretKey: z.ZodString;
        region: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        bucket: string;
        accessKey: string;
        secretKey: string;
        region: string;
        endpoint?: string | undefined;
    }, {
        bucket: string;
        accessKey: string;
        secretKey: string;
        endpoint?: string | undefined;
        region?: string | undefined;
    }>;
    ai: z.ZodObject<{
        gemini: z.ZodObject<{
            apiKey: z.ZodString;
            model: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            apiKey: string;
            model: string;
        }, {
            apiKey: string;
            model?: string | undefined;
        }>;
        openai: z.ZodObject<{
            apiKey: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            apiKey?: string | undefined;
        }, {
            apiKey?: string | undefined;
        }>;
        anthropic: z.ZodObject<{
            apiKey: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            apiKey?: string | undefined;
        }, {
            apiKey?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        gemini: {
            apiKey: string;
            model: string;
        };
        openai: {
            apiKey?: string | undefined;
        };
        anthropic: {
            apiKey?: string | undefined;
        };
    }, {
        gemini: {
            apiKey: string;
            model?: string | undefined;
        };
        openai: {
            apiKey?: string | undefined;
        };
        anthropic: {
            apiKey?: string | undefined;
        };
    }>;
    telegram: z.ZodObject<{
        botToken: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        botToken: string;
    }, {
        botToken: string;
    }>;
    youtube: z.ZodObject<{
        clientId: z.ZodOptional<z.ZodString>;
        clientSecret: z.ZodOptional<z.ZodString>;
        redirectUri: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        clientId?: string | undefined;
        clientSecret?: string | undefined;
        redirectUri?: string | undefined;
    }, {
        clientId?: string | undefined;
        clientSecret?: string | undefined;
        redirectUri?: string | undefined;
    }>;
    facebook: z.ZodObject<{
        appId: z.ZodOptional<z.ZodString>;
        appSecret: z.ZodOptional<z.ZodString>;
        redirectUri: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        redirectUri?: string | undefined;
        appId?: string | undefined;
        appSecret?: string | undefined;
    }, {
        redirectUri?: string | undefined;
        appId?: string | undefined;
        appSecret?: string | undefined;
    }>;
    api: z.ZodObject<{
        port: z.ZodDefault<z.ZodNumber>;
        host: z.ZodDefault<z.ZodString>;
        baseUrl: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        host: string;
        port: number;
        baseUrl: string;
    }, {
        host?: string | undefined;
        port?: number | undefined;
        baseUrl?: string | undefined;
    }>;
    worker: z.ZodObject<{
        concurrency: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        concurrency: number;
    }, {
        concurrency?: number | undefined;
    }>;
    observability: z.ZodObject<{
        logLevel: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
        otelEndpoint: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        logLevel: "error" | "trace" | "fatal" | "warn" | "info" | "debug";
        otelEndpoint?: string | undefined;
    }, {
        logLevel?: "error" | "trace" | "fatal" | "warn" | "info" | "debug" | undefined;
        otelEndpoint?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    worker: {
        concurrency: number;
    };
    telegram: {
        botToken: string;
    };
    youtube: {
        clientId?: string | undefined;
        clientSecret?: string | undefined;
        redirectUri?: string | undefined;
    };
    facebook: {
        redirectUri?: string | undefined;
        appId?: string | undefined;
        appSecret?: string | undefined;
    };
    nodeEnv: "development" | "production" | "test";
    database: {
        url: string;
    };
    redis: {
        host: string;
        port: number;
        password?: string | undefined;
    };
    s3: {
        bucket: string;
        accessKey: string;
        secretKey: string;
        region: string;
        endpoint?: string | undefined;
    };
    ai: {
        gemini: {
            apiKey: string;
            model: string;
        };
        openai: {
            apiKey?: string | undefined;
        };
        anthropic: {
            apiKey?: string | undefined;
        };
    };
    api: {
        host: string;
        port: number;
        baseUrl: string;
    };
    observability: {
        logLevel: "error" | "trace" | "fatal" | "warn" | "info" | "debug";
        otelEndpoint?: string | undefined;
    };
}, {
    worker: {
        concurrency?: number | undefined;
    };
    telegram: {
        botToken: string;
    };
    youtube: {
        clientId?: string | undefined;
        clientSecret?: string | undefined;
        redirectUri?: string | undefined;
    };
    facebook: {
        redirectUri?: string | undefined;
        appId?: string | undefined;
        appSecret?: string | undefined;
    };
    database: {
        url: string;
    };
    redis: {
        host?: string | undefined;
        port?: number | undefined;
        password?: string | undefined;
    };
    s3: {
        bucket: string;
        accessKey: string;
        secretKey: string;
        endpoint?: string | undefined;
        region?: string | undefined;
    };
    ai: {
        gemini: {
            apiKey: string;
            model?: string | undefined;
        };
        openai: {
            apiKey?: string | undefined;
        };
        anthropic: {
            apiKey?: string | undefined;
        };
    };
    api: {
        host?: string | undefined;
        port?: number | undefined;
        baseUrl?: string | undefined;
    };
    observability: {
        logLevel?: "error" | "trace" | "fatal" | "warn" | "info" | "debug" | undefined;
        otelEndpoint?: string | undefined;
    };
    nodeEnv?: "development" | "production" | "test" | undefined;
}>;
type Config = z.infer<typeof ConfigSchema>;
export declare const config: {
    worker: {
        concurrency: number;
    };
    telegram: {
        botToken: string;
    };
    youtube: {
        clientId?: string | undefined;
        clientSecret?: string | undefined;
        redirectUri?: string | undefined;
    };
    facebook: {
        redirectUri?: string | undefined;
        appId?: string | undefined;
        appSecret?: string | undefined;
    };
    nodeEnv: "development" | "production" | "test";
    database: {
        url: string;
    };
    redis: {
        host: string;
        port: number;
        password?: string | undefined;
    };
    s3: {
        bucket: string;
        accessKey: string;
        secretKey: string;
        region: string;
        endpoint?: string | undefined;
    };
    ai: {
        gemini: {
            apiKey: string;
            model: string;
        };
        openai: {
            apiKey?: string | undefined;
        };
        anthropic: {
            apiKey?: string | undefined;
        };
    };
    api: {
        host: string;
        port: number;
        baseUrl: string;
    };
    observability: {
        logLevel: "error" | "trace" | "fatal" | "warn" | "info" | "debug";
        otelEndpoint?: string | undefined;
    };
};
export type { Config };
//# sourceMappingURL=index.d.ts.map