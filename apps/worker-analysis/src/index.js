"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const config_1 = require("@ai-agent/config");
const observability_1 = require("@ai-agent/observability");
const core_1 = require("@ai-agent/core");
const ai_1 = require("@ai-agent/ai");
const analyze_media_1 = require("./jobs/analyze-media");
async function main() {
    observability_1.logger.info('Starting media analysis worker...');
    // Initialize Gemini client
    ai_1.geminiClient.initialize(config_1.config.ai.gemini.apiKey);
    observability_1.logger.info('Gemini client initialized');
    const worker = new bullmq_1.Worker(core_1.QUEUE_NAMES.MEDIA_ANALYSIS, async (job) => {
        observability_1.logger.info({ jobId: job.id, sessionId: job.data.sessionId }, 'Processing media analysis job');
        try {
            const result = await (0, analyze_media_1.analyzeMediaJob)(job);
            observability_1.logger.info({ jobId: job.id, result }, 'Media analysis completed');
            return result;
        }
        catch (error) {
            observability_1.logger.error({ jobId: job.id, error }, 'Media analysis failed');
            throw error;
        }
    }, {
        connection: {
            host: config_1.config.redis.host,
            port: config_1.config.redis.port,
        },
        concurrency: config_1.config.worker.concurrency,
    });
    worker.on('completed', (job) => {
        observability_1.logger.info({ jobId: job.id }, 'Job completed');
    });
    worker.on('failed', (job, err) => {
        observability_1.logger.error({ jobId: job?.id, error: err }, 'Job failed');
    });
    observability_1.logger.info('Media analysis worker started successfully');
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        observability_1.logger.info('SIGTERM received, shutting down gracefully...');
        await worker.close();
        process.exit(0);
    });
}
main().catch((error) => {
    observability_1.logger.fatal({ error }, 'Failed to start media analysis worker');
    process.exit(1);
});
//# sourceMappingURL=index.js.map