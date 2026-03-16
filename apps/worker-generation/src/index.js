"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const config_1 = require("@ai-agent/config");
const observability_1 = require("@ai-agent/observability");
const core_1 = require("@ai-agent/core");
const ai_1 = require("@ai-agent/ai");
const generate_drafts_1 = require("./jobs/generate-drafts");
async function main() {
    observability_1.logger.info('Starting draft generation worker...');
    // Initialize Gemini client
    ai_1.geminiClient.initialize(config_1.config.ai.gemini.apiKey);
    observability_1.logger.info('Gemini client initialized');
    const worker = new bullmq_1.Worker(core_1.QUEUE_NAMES.DRAFT_GENERATION, async (job) => {
        observability_1.logger.info({ jobId: job.id, sessionId: job.data.sessionId }, 'Processing draft generation job');
        try {
            const result = await (0, generate_drafts_1.generateDraftsJob)(job);
            observability_1.logger.info({ jobId: job.id, result }, 'Draft generation completed');
            return result;
        }
        catch (error) {
            observability_1.logger.error({ jobId: job.id, error }, 'Draft generation failed');
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
    observability_1.logger.info('Draft generation worker started successfully');
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        observability_1.logger.info('SIGTERM received, shutting down gracefully...');
        await worker.close();
        process.exit(0);
    });
}
main().catch((error) => {
    observability_1.logger.fatal({ error }, 'Failed to start draft generation worker');
    process.exit(1);
});
//# sourceMappingURL=index.js.map