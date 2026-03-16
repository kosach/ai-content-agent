import { Queue } from 'bullmq';
import { config } from '@ai-agent/config';
import { logger } from '@ai-agent/observability';
import {
  JobType,
  JobData,
  QUEUE_NAMES,
  MAX_RETRIES,
  JOB_TIMEOUT,
} from '@ai-agent/core';

/**
 * Queue Service
 * 
 * Manages job enqueueing to BullMQ queues
 * Provides type-safe interface for job creation
 */
export class QueueService {
  private queues: Map<string, Queue>;

  constructor() {
    this.queues = new Map();
    this.initializeQueues();
  }

  /**
   * Initialize all queues
   */
  private initializeQueues(): void {
    const connection = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    };

    // Create queue instances for each job type
    Object.values(QUEUE_NAMES).forEach((queueName) => {
      const queue = new Queue(queueName, { connection });
      this.queues.set(queueName, queue);
      logger.info({ queueName }, 'Queue initialized');
    });
  }

  /**
   * Enqueue a job
   */
  async enqueue(jobType: JobType, data: JobData): Promise<string> {
    const queueName = this.getQueueName(jobType);
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found for job type: ${jobType}`);
    }

    const jobOptions = {
      attempts: this.getMaxRetries(jobType),
      backoff: {
        type: 'exponential' as const,
        delay: 5000, // Start with 5 second delay
      },
      timeout: this.getTimeout(jobType),
    };

    logger.info({ jobType, queueName, data }, 'Enqueueing job');

    try {
      const job = await queue.add(jobType, data, jobOptions);
      
      logger.info({ jobType, jobId: job.id }, 'Job enqueued successfully');
      
      return job.id!;
    } catch (error) {
      logger.error({ error, jobType, data }, 'Failed to enqueue job');
      throw error;
    }
  }

  /**
   * Get queue name for job type
   */
  private getQueueName(jobType: JobType): string {
    const queueMap: Record<JobType, string> = {
      [JobType.ANALYZE_MEDIA]: QUEUE_NAMES.MEDIA_ANALYSIS,
      [JobType.GENERATE_DRAFTS]: QUEUE_NAMES.DRAFT_GENERATION,
      [JobType.PUBLISH_YOUTUBE]: QUEUE_NAMES.YOUTUBE_PUBLISHING,
      [JobType.PUBLISH_FACEBOOK]: QUEUE_NAMES.FACEBOOK_PUBLISHING,
    };

    return queueMap[jobType];
  }

  /**
   * Get max retries for job type
   */
  private getMaxRetries(jobType: JobType): number {
    const retriesMap: Record<JobType, number> = {
      [JobType.ANALYZE_MEDIA]: MAX_RETRIES.MEDIA_ANALYSIS,
      [JobType.GENERATE_DRAFTS]: MAX_RETRIES.DRAFT_GENERATION,
      [JobType.PUBLISH_YOUTUBE]: MAX_RETRIES.YOUTUBE_PUBLISHING,
      [JobType.PUBLISH_FACEBOOK]: MAX_RETRIES.FACEBOOK_PUBLISHING,
    };

    return retriesMap[jobType];
  }

  /**
   * Get timeout for job type
   */
  private getTimeout(jobType: JobType): number {
    const timeoutMap: Record<JobType, number> = {
      [JobType.ANALYZE_MEDIA]: JOB_TIMEOUT.MEDIA_ANALYSIS,
      [JobType.GENERATE_DRAFTS]: JOB_TIMEOUT.DRAFT_GENERATION,
      [JobType.PUBLISH_YOUTUBE]: JOB_TIMEOUT.YOUTUBE_PUBLISHING,
      [JobType.PUBLISH_FACEBOOK]: JOB_TIMEOUT.FACEBOOK_PUBLISHING,
    };

    return timeoutMap[jobType];
  }

  /**
   * Get queue instance (for advanced usage)
   */
  getQueue(queueName: string): Queue | undefined {
    return this.queues.get(queueName);
  }

  /**
   * Close all queues
   */
  async close(): Promise<void> {
    logger.info('Closing all queues');
    
    for (const [queueName, queue] of this.queues) {
      await queue.close();
      logger.info({ queueName }, 'Queue closed');
    }
  }
}

/**
 * Export singleton instance
 */
export const queueService = new QueueService();
