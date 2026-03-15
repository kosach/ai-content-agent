export enum JobType {
  ANALYZE_CONTENT = 'analyze_content',
  GENERATE_CONTENT = 'generate_content',
  RENDER_MEDIA = 'render_media',
  PUBLISH_CONTENT = 'publish_content',
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export interface JobData {
  contentId: string;
  userId: string;
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
