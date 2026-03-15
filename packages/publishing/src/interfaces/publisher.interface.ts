import { PublishRequest, PublishResult } from '@ai-agent/core';

/**
 * Publisher interface that all platform-specific publishers must implement
 * This ensures isolation and consistent API across all social platforms
 */
export interface IPublisher {
  /**
   * Publish content to the platform
   */
  publish(request: PublishRequest): Promise<PublishResult>;

  /**
   * Validate credentials for this platform
   */
  validateCredentials(): Promise<boolean>;

  /**
   * Get platform-specific content constraints (character limits, media specs, etc.)
   */
  getConstraints(): PlatformConstraints;
}

export interface PlatformConstraints {
  maxTextLength?: number;
  maxMediaCount?: number;
  supportedMediaTypes?: string[];
  maxHashtags?: number;
  maxMentions?: number;
}
