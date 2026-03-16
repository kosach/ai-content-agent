import { google, youtube_v3 } from 'googleapis';
import { Readable } from 'stream';
import { logger } from '@ai-agent/observability';
import {
  IPublisher,
  PublishRequest,
  PublishResult,
  TokenRefreshResult,
  PlatformConstraints,
  PublisherError,
  PublisherErrorType,
} from '../interfaces/publisher.interface';

/**
 * YouTube Publisher
 * 
 * Publishes videos to YouTube as Shorts
 * Uses YouTube Data API v3
 */
export class YouTubePublisher implements IPublisher {
  private oauth2Client: any;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  async publish(request: PublishRequest, accessToken: string): Promise<PublishResult> {
    logger.info({ filename: request.mediaFile.filename }, 'Publishing to YouTube');

    try {
      // Set credentials
      this.oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });

      // Validate video
      this.validateVideo(request);

      // Prepare metadata
      const snippet = this.prepareSnippet(request);

      // Convert buffer to stream
      const videoStream = Readable.from(request.mediaFile.buffer);

      // Upload video
      logger.info({ title: snippet.title }, 'Uploading video to YouTube');

      const uploadResponse = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet,
          status: {
            privacyStatus: request.options?.privacy || 'public',
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          mimeType: request.mediaFile.mimeType,
          body: videoStream,
        },
      });

      const videoId = uploadResponse.data.id;
      const videoUrl = `https://www.youtube.com/shorts/${videoId}`;

      logger.info({ videoId, videoUrl }, 'Video uploaded successfully to YouTube');

      return {
        success: true,
        platformPostId: videoId!,
        platformUrl: videoUrl,
        metadata: {
          title: uploadResponse.data.snippet?.title,
          publishedAt: uploadResponse.data.snippet?.publishedAt,
        },
      };
    } catch (error: any) {
      logger.error({ error }, 'YouTube publish failed');
      throw this.handleError(error);
    }
  }

  async validateCredentials(accessToken: string): Promise<boolean> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });

      // Try to fetch channel info
      await youtube.channels.list({
        part: ['snippet'],
        mine: true,
      });

      return true;
    } catch (error) {
      logger.warn({ error }, 'YouTube credentials validation failed');
      return false;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      logger.info('YouTube access token refreshed');

      return {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token,
        expiresAt: new Date(credentials.expiry_date!),
      };
    } catch (error) {
      logger.error({ error }, 'YouTube token refresh failed');
      throw new PublisherError(
        PublisherErrorType.AUTH_INVALID,
        'Failed to refresh YouTube token'
      );
    }
  }

  getConstraints(): PlatformConstraints {
    return {
      maxVideoDuration: 60, // Shorts limit
      maxVideoSize: 256 * 1024 * 1024, // 256MB
      maxTitleLength: 100,
      maxDescriptionLength: 5000,
      maxHashtags: 15,
      supportedFormats: [
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-ms-wmv',
        'video/x-flv',
      ],
    };
  }

  getName(): string {
    return 'YouTube';
  }

  /**
   * Prepare video snippet (metadata)
   */
  private prepareSnippet(request: PublishRequest): youtube_v3.Schema$VideoSnippet {
    const { content } = request;

    // Format description with hashtags
    let description = content.description || '';
    
    if (content.hashtags && content.hashtags.length > 0) {
      const hashtagString = content.hashtags
        .slice(0, this.getConstraints().maxHashtags)
        .map((tag) => `#${tag.replace(/^#/, '')}`)
        .join(' ');
      
      description += `\n\n${hashtagString}`;
    }

    return {
      title: content.title || 'Untitled Short',
      description,
      categoryId: '22', // People & Blogs (default for Shorts)
      tags: content.hashtags,
    };
  }

  /**
   * Validate video before upload
   */
  private validateVideo(request: PublishRequest): void {
    const constraints = this.getConstraints();
    const { mediaFile } = request;

    // Check file size
    if (mediaFile.buffer.length > constraints.maxVideoSize!) {
      throw new PublisherError(
        PublisherErrorType.INVALID_VIDEO,
        `Video file too large: ${(mediaFile.buffer.length / (1024 * 1024)).toFixed(2)}MB (max: 256MB)`
      );
    }

    // Check duration (if provided)
    if (mediaFile.duration && mediaFile.duration > constraints.maxVideoDuration!) {
      throw new PublisherError(
        PublisherErrorType.INVALID_VIDEO,
        `Video too long: ${mediaFile.duration}s (max: 60s for Shorts)`
      );
    }

    // Check format
    if (
      constraints.supportedFormats &&
      !constraints.supportedFormats.includes(mediaFile.mimeType)
    ) {
      throw new PublisherError(
        PublisherErrorType.INVALID_VIDEO,
        `Unsupported video format: ${mediaFile.mimeType}`
      );
    }

    // Check title length
    if (request.content.title && request.content.title.length > constraints.maxTitleLength!) {
      throw new PublisherError(
        PublisherErrorType.INVALID_METADATA,
        `Title too long: ${request.content.title.length} chars (max: ${constraints.maxTitleLength})`
      );
    }
  }

  /**
   * Handle API errors and categorize them
   */
  private handleError(error: any): PublisherError {
    const message = error.message || 'Unknown error';

    // Quota exceeded
    if (error.code === 403 && message.includes('quota')) {
      return new PublisherError(
        PublisherErrorType.QUOTA_EXCEEDED,
        'YouTube API quota exceeded. Please try again tomorrow.',
        true, // retryable
        this.getTomorrowDate() // retry after midnight
      );
    }

    // Auth errors
    if (error.code === 401 || error.code === 403) {
      return new PublisherError(
        PublisherErrorType.AUTH_INVALID,
        'YouTube authentication failed. Please reconnect your account.'
      );
    }

    // Rate limit
    if (error.code === 429) {
      return new PublisherError(
        PublisherErrorType.RATE_LIMITED,
        'Too many requests to YouTube. Please try again later.',
        true,
        this.getRetryAfterDate(60) // retry after 1 minute
      );
    }

    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return new PublisherError(
        PublisherErrorType.NETWORK_ERROR,
        'Network error while uploading to YouTube.',
        true
      );
    }

    // Unknown error
    return new PublisherError(
      PublisherErrorType.PLATFORM_ERROR,
      `YouTube error: ${message}`,
      true // retryable by default
    );
  }

  /**
   * Get tomorrow's date (for quota reset)
   */
  private getTomorrowDate(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Get retry-after date
   */
  private getRetryAfterDate(seconds: number): Date {
    const date = new Date();
    date.setSeconds(date.getSeconds() + seconds);
    return date;
  }
}
