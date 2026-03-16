"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const config_1 = require("@ai-agent/config");
const observability_1 = require("@ai-agent/observability");
const core_1 = require("@ai-agent/core");
const publish_youtube_1 = require("./jobs/publish-youtube");
const publish_facebook_1 = require("./jobs/publish-facebook");
async function main() {
    observability_1.logger.info('Starting publish workers...');
    // YouTube worker
    const youtubeWorker = new bullmq_1.Worker(core_1.QUEUE_NAMES.YOUTUBE_PUBLISHING, async (job) => {
        observability_1.logger.info({ jobId: job.id, sessionId: job.data.sessionId }, 'Processing YouTube publish job');
        try {
            const result = await (0, publish_youtube_1.publishYouTubeJob)(job);
            observability_1.logger.info({ jobId: job.id, result }, 'YouTube publish completed');
            return result;
        }
        catch (error) {
            observability_1.logger.error({ jobId: job.id, error }, 'YouTube publish failed');
            throw error;
        }
    }, {
        connection: { host: config_1.config.redis.host, port: config_1.config.redis.port },
        concurrency: config_1.config.worker.concurrency,
    });
    // Facebook worker
    const facebookWorker = new bullmq_1.Worker(core_1.QUEUE_NAMES.FACEBOOK_PUBLISHING, async (job) => {
        observability_1.logger.info({ jobId: job.id, sessionId: job.data.sessionId }, 'Processing Facebook publish job');
        try {
            const result = await (0, publish_facebook_1.publishFacebookJob)(job);
            observability_1.logger.info({ jobId: job.id, result }, 'Facebook publish completed');
            return result;
        }
        catch (error) {
            observability_1.logger.error({ jobId: job.id, error }, 'Facebook publish failed');
            throw error;
        }
    }, {
        connection: { host: config_1.config.redis.host, port: config_1.config.redis.port },
        concurrency: config_1.config.worker.concurrency,
    });
    observability_1.logger.info('Publish workers started successfully');
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        observability_1.logger.info('SIGTERM received, shutting down...');
        await Promise.all([youtubeWorker.close(), facebookWorker.close()]);
        process.exit(0);
    });
}
main().catch((error) => {
    observability_1.logger.fatal({ error }, 'Failed to start publish workers');
    process.exit(1);
});
//# sourceMappingURL=index.js.map