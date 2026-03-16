import { PublishRequest, PublishResult, TokenRefreshResult } from '../types/publish-result';

/**
 * Publisher Interface
 * 
 * All platform publishers must implement this interface
 */
export interface IPublisher {
  /**
   * Publish content to the platform
   * 
   * @param request - Publish request with media and metadata
   * @param accessToken - OAuth access token for the platform
   * @returns PublishResult with platformPostId and URL
   */
  publish(request: PublishRequest, accessToken: string): Promise<PublishResult>;

  /**
   * Validate that credentials are working
   * 
   * @param accessToken - OAuth access token
   * @returns true if valid, false otherwise
   */
  validateCredentials(accessToken: string): Promise<boolean>;

  /**
   * Refresh expired access token
   * 
   * @param refreshToken - OAuth refresh token
   * @returns New access token and expiry
   */
  refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult>;

  /**
   * Get platform-specific constraints
   * 
   * Used for validation before publishing
   */
  getConstraints(): PlatformConstraints;

  /**
   * Get platform name (for logging/debugging)
   */
  getName(): string;
}

/**
 * Platform Constraints
 * 
 * Defines limits for each platform
 */
export interface PlatformConstraints {
  /**
   * Maximum video duration in seconds
   */
  maxVideoDuration?: number;

  /**
   * Maximum video file size in bytes
   */
  maxVideoSize?: number;

  /**
   * Maximum title length
   */
  maxTitleLength?: number;

  /**
   * Maximum description/text length
   */
  maxDescriptionLength?: number;

  /**
   * Maximum number of hashtags
   */
  maxHashtags?: number;

  /**
   * Supported video formats (MIME types)
   */
  supportedFormats?: string[];
}

/**
 * Publisher Error Types
 * 
 * Standardized error categories for better handling
 */
export enum PublisherErrorType {
  // Auth errors
  AUTH_INVALID = 'AUTH_INVALID',           // Token is invalid
  AUTH_EXPIRED = 'AUTH_EXPIRED',           // Token expired (should refresh)
  AUTH_INSUFFICIENT = 'AUTH_INSUFFICIENT', // Missing required permissions

  // Quota/Rate limit errors
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',       // Daily quota exceeded
  RATE_LIMITED = 'RATE_LIMITED',           // Too many requests

  // Validation errors
  INVALID_VIDEO = 'INVALID_VIDEO',         // Video format/duration invalid
  INVALID_METADATA = 'INVALID_METADATA',   // Title/description invalid

  // Platform errors
  PLATFORM_ERROR = 'PLATFORM_ERROR',       // Generic platform error
  NETWORK_ERROR = 'NETWORK_ERROR',         // Network/timeout error

  // Unknown
  UNKNOWN = 'UNKNOWN',
}

/**
 * Publisher Error
 * 
 * Thrown by publishers with categorized error type
 */
export class PublisherError extends Error {
  constructor(
    public type: PublisherErrorType,
    message: string,
    public retryable: boolean = false,
    public retryAfter?: Date
  ) {
    super(message);
    this.name = 'PublisherError';
  }
}
