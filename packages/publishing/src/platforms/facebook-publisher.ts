import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
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
 * Facebook Publisher
 * 
 * Publishes videos to Facebook Pages
 * Uses Facebook Graph API
 */
export class FacebookPublisher implements IPublisher {
  private readonly graphApiUrl = 'https://graph.facebook.com/v21.0';

  constructor(
    private appId: string,
    private appSecret: string,
    private redirectUri: string
  ) {}

  async publish(request: PublishRequest, accessToken: string): Promise<PublishResult> {
    logger.info({ filename: request.mediaFile.filename }, 'Publishing to Facebook');

    try {
      // Validate video
      this.validateVideo(request);

      // Get Page ID (assuming access token is for a Page)
      const pageId = await this.getPageId(accessToken);

      // Upload video to Facebook
      logger.info({ pageId }, 'Uploading video to Facebook');

      const uploadResult = await this.uploadVideo(
        pageId,
        accessToken,
        request
      );

      const postId = uploadResult.id;
      const postUrl = `https://www.facebook.com/${postId}`;

      logger.info({ postId, postUrl }, 'Video published successfully to Facebook');

      return {
        success: true,
        platformPostId: postId,
        platformUrl: postUrl,
        metadata: {
          videoId: uploadResult.video_id,
        },
      };
    } catch (error: any) {
      logger.error({ error }, 'Facebook publish failed');
      throw this.handleError(error);
    }
  }

  async validateCredentials(accessToken: string): Promise<boolean> {
    try {
      // Try to fetch user/page info
      const response = await axios.get(`${this.graphApiUrl}/me`, {
        params: { access_token: accessToken },
      });

      return !!response.data.id;
    } catch (error) {
      logger.warn({ error }, 'Facebook credentials validation failed');
      return false;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
    try {
      // Facebook long-lived tokens don't use refresh tokens
      // Instead, exchange short-lived token for long-lived
      const response = await axios.get(`${this.graphApiUrl}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: refreshToken,
        },
      });

      const { access_token, expires_in } = response.data;

      logger.info('Facebook access token refreshed');

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

      return {
        accessToken: access_token,
        expiresAt,
      };
    } catch (error) {
      logger.error({ error }, 'Facebook token refresh failed');
      throw new PublisherError(
        PublisherErrorType.AUTH_INVALID,
        'Failed to refresh Facebook token'
      );
    }
  }

  getConstraints(): PlatformConstraints {
    return {
      maxVideoDuration: 240 * 60, // 240 minutes
      maxVideoSize: 10 * 1024 * 1024 * 1024, // 10GB
      maxDescriptionLength: 63206,
      maxHashtags: 30,
      supportedFormats: [
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-ms-wmv',
      ],
    };
  }

  getName(): string {
    return 'Facebook';
  }

  /**
   * Get Page ID from access token
   * 
   * Note: For MVP, we assume the access token is for a specific Page.
   * In production, you might need to let user select which Page to publish to.
   */
  private async getPageId(accessToken: string): Promise<string> {
    try {
      // If token is for a Page, /me returns Page info
      const response = await axios.get(`${this.graphApiUrl}/me`, {
        params: { access_token: accessToken },
      });

      return response.data.id;
    } catch (error) {
      throw new PublisherError(
        PublisherErrorType.AUTH_INVALID,
        'Failed to get Facebook Page ID. Make sure you\'re using a Page access token.'
      );
    }
  }

  /**
   * Upload video to Facebook Page
   */
  private async uploadVideo(
    pageId: string,
    accessToken: string,
    request: PublishRequest
  ): Promise<{ id: string; video_id: string }> {
    // Prepare description with hashtags
    let description = request.content.description || '';

    if (request.content.hashtags && request.content.hashtags.length > 0) {
      const hashtagString = request.content.hashtags
        .slice(0, this.getConstraints().maxHashtags)
        .map((tag) => `#${tag.replace(/^#/, '')}`)
        .join(' ');

      description += `\n\n${hashtagString}`;
    }

    // Create form data
    const formData = new FormData();
    formData.append('source', request.mediaFile.buffer, {
      filename: request.mediaFile.filename,
      contentType: request.mediaFile.mimeType,
    });
    formData.append('description', description);
    formData.append('access_token', accessToken);

    // Upload video
    const response = await axios.post(
      `${this.graphApiUrl}/${pageId}/videos`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 300000, // 5 minutes timeout
      }
    );

    return response.data;
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
        `Video file too large: ${(mediaFile.buffer.length / (1024 * 1024)).toFixed(2)}MB`
      );
    }

    // Check duration (if provided)
    if (mediaFile.duration && mediaFile.duration > constraints.maxVideoDuration!) {
      throw new PublisherError(
        PublisherErrorType.INVALID_VIDEO,
        `Video too long: ${(mediaFile.duration / 60).toFixed(2)} minutes`
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

    // Check description length
    if (
      request.content.description &&
      request.content.description.length > constraints.maxDescriptionLength!
    ) {
      throw new PublisherError(
        PublisherErrorType.INVALID_METADATA,
        `Description too long: ${request.content.description.length} chars (max: ${constraints.maxDescriptionLength})`
      );
    }
  }

  /**
   * Handle API errors and categorize them
   */
  private handleError(error: any): PublisherError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const response = axiosError.response;

      if (response) {
        const errorData = response.data?.error;
        const message = errorData?.message || 'Unknown Facebook error';
        const code = errorData?.code;

        // Auth errors
        if (code === 190 || response.status === 401) {
          return new PublisherError(
            PublisherErrorType.AUTH_INVALID,
            'Facebook authentication failed. Please reconnect your account.'
          );
        }

        // Rate limit
        if (code === 4 || code === 17 || code === 32 || response.status === 429) {
          return new PublisherError(
            PublisherErrorType.RATE_LIMITED,
            'Facebook rate limit exceeded. Please try again later.',
            true,
            this.getRetryAfterDate(300) // retry after 5 minutes
          );
        }

        // Permission error
        if (code === 200 || code === 10) {
          return new PublisherError(
            PublisherErrorType.AUTH_INSUFFICIENT,
            'Insufficient permissions to publish to Facebook Page.'
          );
        }

        // Video processing error
        if (code === 1500) {
          return new PublisherError(
            PublisherErrorType.INVALID_VIDEO,
            'Facebook video processing failed. Please try a different video format.'
          );
        }

        return new PublisherError(
          PublisherErrorType.PLATFORM_ERROR,
          `Facebook error: ${message}`,
          true
        );
      }
    }

    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return new PublisherError(
        PublisherErrorType.NETWORK_ERROR,
        'Network error while uploading to Facebook.',
        true
      );
    }

    // Unknown error
    return new PublisherError(
      PublisherErrorType.UNKNOWN,
      `Facebook error: ${error.message}`,
      true
    );
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
