export enum JobType {
  ANALYZE_MEDIA = 'ANALYZE_MEDIA',           // Analyze uploaded video/photo
  GENERATE_DRAFTS = 'GENERATE_DRAFTS',       // Generate YouTube + Facebook drafts
  PUBLISH_YOUTUBE = 'PUBLISH_YOUTUBE',       // Publish to YouTube
  PUBLISH_FACEBOOK = 'PUBLISH_FACEBOOK',     // Publish to Facebook
}

// Queue payload for ANALYZE_MEDIA
export interface AnalyzeMediaJobData {
  sessionId: string;
  brandProfileId: string;
  mediaAssetId: string;
  mediaType: 'PHOTO' | 'VIDEO';
  telegramFileId: string;
}

// Queue payload for GENERATE_DRAFTS
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

// Queue payload for PUBLISH_YOUTUBE
export interface PublishYouTubeJobData {
  sessionId: string;
  brandProfileId: string;
  draftPackageId: string;
  publishJobId: string;
  connectedAccountId: string;
}

// Queue payload for PUBLISH_FACEBOOK
export interface PublishFacebookJobData {
  sessionId: string;
  brandProfileId: string;
  draftPackageId: string;
  publishJobId: string;
  connectedAccountId: string;
}

export type JobData =
  | AnalyzeMediaJobData
  | GenerateDraftsJobData
  | PublishYouTubeJobData
  | PublishFacebookJobData;

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}
