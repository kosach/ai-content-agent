export enum SessionStatus {
  COLLECTING_MEDIA = 'COLLECTING_MEDIA',
  ASKING_QUESTIONS = 'ASKING_QUESTIONS',
  GENERATING_DRAFTS = 'GENERATING_DRAFTS',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  APPROVED = 'APPROVED',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum MessageRole {
  USER = 'USER',
  AGENT = 'AGENT',
  SYSTEM = 'SYSTEM',
}

export enum MediaType {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
}

export enum DraftStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  NEEDS_REVISION = 'NEEDS_REVISION',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export enum PublishJobStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

export enum Platform {
  YOUTUBE = 'YOUTUBE',
  FACEBOOK = 'FACEBOOK',
}

// User
export interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Brand Profile
export interface BrandProfile {
  id: string;
  userId: string;
  brandName?: string;
  brandVoice?: string;
  targetAudience?: string;
  defaultHashtags: string[];
  autoPublish: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Content Session
export interface ContentSession {
  id: string;
  brandProfileId: string;
  status: SessionStatus;
  userIntent?: string;
  tone?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Session Message
export interface SessionMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Media Asset
export interface MediaAsset {
  id: string;
  sessionId: string;
  type: MediaType;
  telegramFileId: string;
  storageUrl?: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  analyzed: boolean;
  analysisResult?: Record<string, any>;
  createdAt: Date;
}

// Draft Package
export interface DraftPackage {
  id: string;
  sessionId: string;
  
  // YouTube Short
  youtubeTitle?: string;
  youtubeDescription?: string;
  youtubeHashtags: string[];
  
  // Facebook post
  facebookText?: string;
  facebookHashtags: string[];
  
  // Media references
  primaryVideoId?: string;
  primaryImageId?: string;
  
  // Versioning
  version: number;
  status: DraftStatus;
  revisionRequest?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Publish Job
export interface PublishJob {
  id: string;
  sessionId: string;
  draftPackageId: string;
  platform: Platform;
  status: PublishJobStatus;
  
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
  
  attempts: number;
  maxAttempts: number;
  
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

// Connected Account
export interface ConnectedAccount {
  id: string;
  brandProfileId: string;
  platform: Platform;
  platformUserId: string;
  username?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  isActive: boolean;
  lastVerified: Date;
  createdAt: Date;
  updatedAt: Date;
}
