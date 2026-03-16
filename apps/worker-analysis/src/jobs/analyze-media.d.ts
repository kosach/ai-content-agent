import { Job } from 'bullmq';
import { AnalyzeMediaJobData } from '@ai-agent/core';
/**
 * Analyze Media Job
 *
 * Responsibility: ONLY media analysis
 * 1. Download media from Telegram
 * 2. Upload to permanent storage (S3)
 * 3. Analyze content with AI (topics, mood, objects, title)
 * 4. Update MediaAsset with results
 *
 * Does NOT:
 * - Generate drafts (worker-generation)
 * - Ask questions (conversation agent in telegram-bot)
 * - Publish (worker-publish)
 */
export declare function analyzeMediaJob(job: Job<AnalyzeMediaJobData>): Promise<{
    success: boolean;
    data: {
        mediaAssetId: any;
        storageUrl: any;
        analysis: any;
    };
}>;
//# sourceMappingURL=analyze-media.d.ts.map