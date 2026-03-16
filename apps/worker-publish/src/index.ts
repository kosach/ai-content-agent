import { Worker } from 'bullmq';
import { config } from '@ai-agent/config';
import { logger } from '@ai-agent/observability';
import { QUEUE_NAMES } from '@ai-agent/core';
import { publishYouTubeJob } from './jobs/publish-youtube';
import { publishFacebookJob } from './jobs/publish-facebook';

async function main() {
  logger.info('Starting publish workers...');

  // YouTube worker
  const youtubeWorker = new Worker(
    QUEUE_NAMES.YOUTUBE_PUBLISHING,
    async (job) => {
      logger.info({ jobId: job.id, sessionId: job.data.sessionId }, 'Processing YouTube publish job');
      try {
        const result = await publishYouTubeJob(job);
        logger.info({ jobId: job.id, result }, 'YouTube publish completed');
        return result;
      } catch (error) {
        logger.error({ jobId: job.id, error }, 'YouTube publish failed');
        throw error;
      }
    },
    {
      connection: { host: config.redis.host, port: config.redis.port },
      concurrency: config.worker.concurrency,
    }
  );

  // Facebook worker
  const facebookWorker = new Worker(
    QUEUE_NAMES.FACEBOOK_PUBLISHING,
    async (job) => {
      logger.info({ jobId: job.id, sessionId: job.data.sessionId }, 'Processing Facebook publish job');
      try {
        const result = await publishFacebookJob(job);
        logger.info({ jobId: job.id, result }, 'Facebook publish completed');
        return result;
      } catch (error) {
        logger.error({ jobId: job.id, error }, 'Facebook publish failed');
        throw error;
      }
    },
    {
      connection: { host: config.redis.host, port: config.redis.port },
      concurrency: config.worker.concurrency,
    }
  );

  logger.info('Publish workers started successfully');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down...');
    await Promise.all([youtubeWorker.close(), facebookWorker.close()]);
    process.exit(0);
  });
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start publish workers');
  process.exit(1);
});
