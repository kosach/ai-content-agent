import { Job } from 'bullmq';
import { PublishYouTubeJobData } from '@ai-agent/core';
/**
 * Publish to YouTube Job
 *
 * Responsibility: Upload video to YouTube as Short
 * 1. Get PublishJob, DraftPackage, MediaAsset, ConnectedAccount
 * 2. Check if already published (idempotency)
 * 3. Download video from S3
 * 4. Call YouTubePublisher.publish()
 * 5. Update PublishJob with result
 * 6. Check if all jobs for session completed
 * 7. Send notification to user
 */
export declare function publishYouTubeJob(job: Job<PublishYouTubeJobData>): Promise<{
    success: boolean;
    alreadyPublished: boolean;
    data?: undefined;
} | {
    success: boolean;
    data: any;
    alreadyPublished?: undefined;
}>;
//# sourceMappingURL=publish-youtube.d.ts.map