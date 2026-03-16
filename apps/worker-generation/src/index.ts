import { Worker } from 'bullmq';
import { config } from '@ai-agent/config';
import { logger } from '@ai-agent/observability';
import { QUEUE_NAMES } from '@ai-agent/core';
import { geminiClient } from '@ai-agent/ai';
import { generateDraftsJob } from './jobs/generate-drafts';

async function main() {
  logger.info('Starting draft generation worker...');

  // Initialize Gemini client
  geminiClient.initialize(config.ai.gemini.apiKey);
  logger.info('Gemini client initialized');

  const worker = new Worker(
    QUEUE_NAMES.DRAFT_GENERATION,
    async (job) => {
      logger.info(
        { jobId: job.id, sessionId: job.data.sessionId },
        'Processing draft generation job'
      );

      try {
        const result = await generateDraftsJob(job);
        logger.info({ jobId: job.id, result }, 'Draft generation completed');
        return result;
      } catch (error) {
        logger.error({ jobId: job.id, error }, 'Draft generation failed');
        throw error;
      }
    },
    {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
      },
      concurrency: config.worker.concurrency,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err }, 'Job failed');
  });

  logger.info('Draft generation worker started successfully');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await worker.close();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start draft generation worker');
  process.exit(1);
});
