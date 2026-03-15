export enum Platform {
  TWITTER = 'twitter',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  LINKEDIN = 'linkedin',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
}

export interface PlatformCredentials {
  platform: Platform;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface PublishRequest {
  platform: Platform;
  contentId: string;
  text?: string;
  mediaUrls?: string[];
  scheduledFor?: Date;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
}
