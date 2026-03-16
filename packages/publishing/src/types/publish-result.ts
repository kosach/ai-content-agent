/**
 * Publish Result Types
 * 
 * Standardized response from all publishers
 */

export interface PublishResult {
  /**
   * Whether the publish operation succeeded
   */
  success: boolean;

  /**
   * Platform-specific post/video ID
   * YouTube: videoId (e.g., "dQw4w9WgXcQ")
   * Facebook: postId (e.g., "123456789_987654321")
   */
  platformPostId?: string;

  /**
   * Public URL to the published content
   */
  platformUrl?: string;

  /**
   * Whether this was an idempotent operation (already published)
   */
  alreadyPublished?: boolean;

  /**
   * Error message if failed
   */
  error?: string;

  /**
   * Additional metadata from the platform
   */
  metadata?: Record<string, any>;
}

export interface PublishRequest {
  /**
   * Media file to publish
   */
  mediaFile: {
    buffer: Buffer;
    mimeType: string;
    filename: string;
    duration?: number; // For videos
  };

  /**
   * Content metadata
   */
  content: {
    title?: string; // YouTube Short title
    description?: string; // YouTube description or Facebook text
    hashtags?: string[]; // Will be formatted per platform
  };

  /**
   * Publishing options
   */
  options?: {
    privacy?: 'public' | 'unlisted' | 'private'; // YouTube
    isDraft?: boolean; // Publish as draft
    scheduledTime?: Date; // Schedule for later (not MVP)
  };

  /**
   * Idempotency key (for retries)
   * If provided, publisher should check if already published
   */
  idempotencyKey?: string;
}

export interface TokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}
