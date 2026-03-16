export declare enum JobType {
    ANALYZE_MEDIA = "ANALYZE_MEDIA",// Analyze uploaded video/photo
    GENERATE_DRAFTS = "GENERATE_DRAFTS",// Generate YouTube + Facebook drafts
    PUBLISH_YOUTUBE = "PUBLISH_YOUTUBE",// Publish to YouTube
    PUBLISH_FACEBOOK = "PUBLISH_FACEBOOK"
}
export interface AnalyzeMediaJobData {
    sessionId: string;
    brandProfileId: string;
    mediaAssetId: string;
    mediaType: 'PHOTO' | 'VIDEO';
    telegramFileId: string;
}
export interface GenerateDraftsJobData {
    sessionId: string;
    brandProfileId: string;
    userIntent: string;
    tone: string;
    mediaAnalysis: {
        topics: string[];
        mood: string;
        objects: string[];
        suggestedTitle: string;
        contentType: string;
        targetAudience: string;
    };
}
export interface PublishYouTubeJobData {
    sessionId: string;
    brandProfileId: string;
    draftPackageId: string;
    publishJobId: string;
    connectedAccountId: string;
}
export interface PublishFacebookJobData {
    sessionId: string;
    brandProfileId: string;
    draftPackageId: string;
    publishJobId: string;
    connectedAccountId: string;
}
export type JobData = AnalyzeMediaJobData | GenerateDraftsJobData | PublishYouTubeJobData | PublishFacebookJobData;
export declare enum JobStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    RETRYING = "RETRYING"
}
export interface JobResult {
    success: boolean;
    data?: any;
    error?: string;
}
//# sourceMappingURL=job.d.ts.map