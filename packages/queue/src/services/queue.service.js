"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueService = exports.QueueService = void 0;
const bullmq_1 = require("bullmq");
const config_1 = require("@ai-agent/config");
const observability_1 = require("@ai-agent/observability");
const core_1 = require("@ai-agent/core");
/**
 * Queue Service
 *
 * Manages job enqueueing to BullMQ queues
 * Provides type-safe interface for job creation
 */
class QueueService {
    queues;
    constructor() {
        this.queues = new Map();
        this.initializeQueues();
    }
    /**
     * Initialize all queues
     */
    initializeQueues() {
        const connection = {
            host: config_1.config.redis.host,
            port: config_1.config.redis.port,
            password: config_1.config.redis.password,
        };
        // Create queue instances for each job type
        Object.values(core_1.QUEUE_NAMES).forEach((queueName) => {
            const queue = new bullmq_1.Queue(queueName, { connection });
            this.queues.set(queueName, queue);
            observability_1.logger.info({ queueName }, 'Queue initialized');
        });
    }
    /**
     * Enqueue a job
     */
    async enqueue(jobType, data) {
        const queueName = this.getQueueName(jobType);
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue not found for job type: ${jobType}`);
        }
        const jobOptions = {
            attempts: this.getMaxRetries(jobType),
            backoff: {
                type: 'exponential',
                delay: 5000, // Start with 5 second delay
            },
            timeout: this.getTimeout(jobType),
        };
        observability_1.logger.info({ jobType, queueName, data }, 'Enqueueing job');
        try {
            const job = await queue.add(jobType, data, jobOptions);
            observability_1.logger.info({ jobType, jobId: job.id }, 'Job enqueued successfully');
            return job.id;
        }
        catch (error) {
            observability_1.logger.error({ error, jobType, data }, 'Failed to enqueue job');
            throw error;
        }
    }
    /**
     * Get queue name for job type
     */
    getQueueName(jobType) {
        const queueMap = {
            [core_1.JobType.ANALYZE_MEDIA]: core_1.QUEUE_NAMES.MEDIA_ANALYSIS,
            [core_1.JobType.GENERATE_DRAFTS]: core_1.QUEUE_NAMES.DRAFT_GENERATION,
            [core_1.JobType.PUBLISH_YOUTUBE]: core_1.QUEUE_NAMES.YOUTUBE_PUBLISHING,
            [core_1.JobType.PUBLISH_FACEBOOK]: core_1.QUEUE_NAMES.FACEBOOK_PUBLISHING,
        };
        return queueMap[jobType];
    }
    /**
     * Get max retries for job type
     */
    getMaxRetries(jobType) {
        const retriesMap = {
            [core_1.JobType.ANALYZE_MEDIA]: core_1.MAX_RETRIES.MEDIA_ANALYSIS,
            [core_1.JobType.GENERATE_DRAFTS]: core_1.MAX_RETRIES.DRAFT_GENERATION,
            [core_1.JobType.PUBLISH_YOUTUBE]: core_1.MAX_RETRIES.YOUTUBE_PUBLISHING,
            [core_1.JobType.PUBLISH_FACEBOOK]: core_1.MAX_RETRIES.FACEBOOK_PUBLISHING,
        };
        return retriesMap[jobType];
    }
    /**
     * Get timeout for job type
     */
    getTimeout(jobType) {
        const timeoutMap = {
            [core_1.JobType.ANALYZE_MEDIA]: core_1.JOB_TIMEOUT.MEDIA_ANALYSIS,
            [core_1.JobType.GENERATE_DRAFTS]: core_1.JOB_TIMEOUT.DRAFT_GENERATION,
            [core_1.JobType.PUBLISH_YOUTUBE]: core_1.JOB_TIMEOUT.YOUTUBE_PUBLISHING,
            [core_1.JobType.PUBLISH_FACEBOOK]: core_1.JOB_TIMEOUT.FACEBOOK_PUBLISHING,
        };
        return timeoutMap[jobType];
    }
    /**
     * Get queue instance (for advanced usage)
     */
    getQueue(queueName) {
        return this.queues.get(queueName);
    }
    /**
     * Close all queues
     */
    async close() {
        observability_1.logger.info('Closing all queues');
        for (const [queueName, queue] of this.queues) {
            await queue.close();
            observability_1.logger.info({ queueName }, 'Queue closed');
        }
    }
}
exports.QueueService = QueueService;
/**
 * Export singleton instance
 */
exports.queueService = new QueueService();
//# sourceMappingURL=queue.service.js.map