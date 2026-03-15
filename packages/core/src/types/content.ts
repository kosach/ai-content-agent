export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  CAROUSEL = 'carousel',
}

export enum ContentStatus {
  DRAFT = 'draft',
  ANALYZING = 'analyzing',
  GENERATING = 'generating',
  RENDERING = 'rendering',
  READY = 'ready',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

export interface ContentMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  hashtags?: string[];
  mentions?: string[];
  targetAudience?: string;
  tone?: string;
  style?: string;
}

export interface Content {
  id: string;
  userId: string;
  type: ContentType;
  status: ContentStatus;
  metadata: ContentMetadata;
  generatedText?: string;
  mediaUrls?: string[];
  scheduledFor?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
