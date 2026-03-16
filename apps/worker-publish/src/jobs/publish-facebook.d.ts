import { Job } from 'bullmq';
import { PublishFacebookJobData } from '@ai-agent/core';
/**
 * Publish to Facebook Job
 *
 * Similar to YouTube job but publishes to Facebook Page
 */
export declare function publishFacebookJob(job: Job<PublishFacebookJobData>): Promise<{
    success: boolean;
    alreadyPublished: boolean;
    data?: undefined;
} | {
    success: boolean;
    data: any;
    alreadyPublished?: undefined;
}>;
//# sourceMappingURL=publish-facebook.d.ts.map