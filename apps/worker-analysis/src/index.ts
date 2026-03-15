import { Worker } from 'bullmq';
import { config } from '@ai-agent/config';
import { logger } from '@ai-agent/observability';
import { QUEUE_NAMES } from '@ai-agent/core';
import { analyzeContentJob } from './jobs/analyze-content';

async function main() {
  logger.info('Starting analysis worker...');

  const worker = new Worker(
    QUEUE_NAMES.ANALYSIS,
    async (job) => {
      logger.info({ jobId: job.id, contentId: job.data.contentId }, 'Processing analysis job');
      
      try {
        const result = await analyzeContentJob(job);
        logger.info({ jobId: job.id, result }, 'Analysis completed');
        return result;
      } catch (error) {
        logger.error({ jobId: job.id, error }, 'Analysis failed');
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

  logger.info('Analysis worker started successfully');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await worker.close();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start analysis worker');
  process.exit(1);
});
