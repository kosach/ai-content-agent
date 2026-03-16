import { Job } from 'bullmq';
import { GenerateDraftsJobData } from '@ai-agent/core';
/**
 * Generate Drafts Job
 *
 * Responsibility: Generate YouTube Short + Facebook post drafts
 * 1. Get session + media analysis from database
 * 2. Call contentAgent.generateDrafts() (Gemini)
 * 3. Create DraftPackage in database
 * 4. Update session status to AWAITING_APPROVAL
 * 5. Send draft preview to user (Telegram)
 */
export declare function generateDraftsJob(job: Job<GenerateDraftsJobData>): Promise<{
    success: boolean;
    data: {
        sessionId: any;
        draftPackageId: any;
        drafts: any;
    };
}>;
//# sourceMappingURL=generate-drafts.d.ts.map