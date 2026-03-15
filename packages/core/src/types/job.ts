export enum JobType {
  ANALYZE_MEDIA = 'ANALYZE_MEDIA',           // Analyze uploaded video/photo
  GENERATE_DRAFTS = 'GENERATE_DRAFTS',       // Generate YouTube + Facebook drafts
  PUBLISH_YOUTUBE = 'PUBLISH_YOUTUBE',       // Publish to YouTube
  PUBLISH_FACEBOOK = 'PUBLISH_FACEBOOK',     // Publish to Facebook
}

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

export interface JobData {
  sessionId: string;
  brandProfileId: string;
  [key: string]: any;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  data: JobData;
  result?: JobResult;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
