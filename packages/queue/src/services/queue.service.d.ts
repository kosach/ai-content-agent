import { Queue } from 'bullmq';
import { JobType, JobData } from '@ai-agent/core';
/**
 * Queue Service
 *
 * Manages job enqueueing to BullMQ queues
 * Provides type-safe interface for job creation
 */
export declare class QueueService {
    private queues;
    constructor();
    /**
     * Initialize all queues
     */
    private initializeQueues;
    /**
     * Enqueue a job
     */
    enqueue(jobType: JobType, data: JobData): Promise<string>;
    /**
     * Get queue name for job type
     */
    private getQueueName;
    /**
     * Get max retries for job type
     */
    private getMaxRetries;
    /**
     * Get timeout for job type
     */
    private getTimeout;
    /**
     * Get queue instance (for advanced usage)
     */
    getQueue(queueName: string): Queue | undefined;
    /**
     * Close all queues
     */
    close(): Promise<void>;
}
/**
 * Export singleton instance
 */
export declare const queueService: QueueService;
//# sourceMappingURL=queue.service.d.ts.map