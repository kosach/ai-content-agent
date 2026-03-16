"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const config_1 = require("@ai-agent/config");
const observability_1 = require("@ai-agent/observability");
const oauth_1 = require("./routes/oauth");
async function main() {
    observability_1.logger.info('Starting API server...');
    const fastify = (0, fastify_1.default)({
        logger: false, // Use our own logger
    });
    // Security plugins
    await fastify.register(helmet_1.default);
    await fastify.register(cors_1.default, {
        origin: true, // Allow all origins for OAuth callbacks
    });
    // Health check
    fastify.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });
    // OAuth routes
    await fastify.register(oauth_1.oauthRoutes);
    // Start server
    try {
        await fastify.listen({
            port: config_1.config.api.port,
            host: config_1.config.api.host,
        });
        observability_1.logger.info({ port: config_1.config.api.port, host: config_1.config.api.host }, 'API server started successfully');
    }
    catch (error) {
        observability_1.logger.fatal({ error }, 'Failed to start API server');
        process.exit(1);
    }
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        observability_1.logger.info('SIGTERM received, shutting down...');
        await fastify.close();
        process.exit(0);
    });
}
main().catch((error) => {
    observability_1.logger.fatal({ error }, 'Failed to start API server');
    process.exit(1);
});
//# sourceMappingURL=index.js.map