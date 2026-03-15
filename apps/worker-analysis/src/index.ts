import { Worker } from 'bullmq';
import { config } from '@ai-agent/config';
import { logger } from '@ai-agent/observability';
import { QUEUE_NAMES } from '@ai-agent/core';
import { analyzeMediaJob } from './jobs/analyze-media';

async function main() {
  logger.info('Starting media analysis worker...');

  const worker = new Worker(
    QUEUE_NAMES.MEDIA_ANALYSIS,
    async (job) => {
      logger.info({ jobId: job.id, sessionId: job.data.sessionId }, 'Processing media analysis job');
      
      try {
        const result = await analyzeMediaJob(job);
        logger.info({ jobId: job.id, result }, 'Media analysis completed');
        return result;
      } catch (error) {
        logger.error({ jobId: job.id, error }, 'Media analysis failed');
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

  logger.info('Media analysis worker started successfully');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await worker.close();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start media analysis worker');
  process.exit(1);
});
