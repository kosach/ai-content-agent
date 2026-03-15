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

export interface ContentSession {
  id: string;
  brandProfileId: string;
  status: SessionStatus;
  userIntent?: string;
  targetPlatforms: Platform[];
  targetAudience?: string;
  tone?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface MediaAsset {
  id: string;
  sessionId: string;
  type: MediaType;
  telegramFileId?: string;
  storageUrl: string;
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

export enum MediaType {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
}

export interface DraftPackage {
  id: string;
  sessionId: string;
  version: number;
  status: DraftStatus;
  
  // YouTube Short
  youtubeTitle?: string;
  youtubeDescription?: string;
  youtubeHashtags: string[];
  youtubeThumbnail?: string;
  
  // Facebook post
  facebookText?: string;
  facebookHashtags: string[];
  
  // Media
  videoUrl?: string;
  imageUrls: string[];
  
  // Publishing results
  youtubePostId?: string;
  youtubeUrl?: string;
  facebookPostId?: string;
  facebookUrl?: string;
  
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum DraftStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  REVISED = 'REVISED',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export enum Platform {
  YOUTUBE = 'YOUTUBE',
  FACEBOOK = 'FACEBOOK',
}

export interface BrandProfile {
  id: string;
  userId: string;
  telegramId: string;
  brandName?: string;
  brandVoice?: string;
  targetAudience?: string;
  defaultHashtags: string[];
  preferredPlatforms: Platform[];
  autoPublish: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectedAccount {
  id: string;
  brandProfileId: string;
  platform: Platform;
  platformUserId: string;
  platformUsername?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  isActive: boolean;
  lastVerified: Date;
  createdAt: Date;
  updatedAt: Date;
}
