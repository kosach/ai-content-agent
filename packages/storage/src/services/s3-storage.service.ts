import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '@ai-agent/observability';
import { config } from '@ai-agent/config';

/**
 * S3 Storage Service
 * 
 * Uploads and manages media files in S3-compatible storage (AWS S3, MinIO, etc.)
 */
export class S3StorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = config.s3.bucket;

    // Initialize S3 client
    this.s3Client = new S3Client({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKey,
        secretAccessKey: config.s3.secretKey,
      },
      // For MinIO or custom S3-compatible storage
      forcePathStyle: !!config.s3.endpoint,
    });

    logger.info(
      {
        bucket: this.bucket,
        region: config.s3.region,
        endpoint: config.s3.endpoint || 'AWS S3',
      },
      'S3 Storage Service initialized'
    );
  }

  /**
   * Upload media file to S3
   * 
   * @param params.buffer - File buffer
   * @param params.key - S3 object key (path)
   * @param params.contentType - MIME type
   * @param params.metadata - Optional metadata
   * @returns S3 URL
   */
  async uploadMedia(params: {
    buffer: Buffer;
    key: string;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<string> {
    const { buffer, key, contentType, metadata } = params;

    logger.info(
      {
        key,
        contentType,
        size: buffer.length,
      },
      'Uploading to S3'
    );

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
      });

      await this.s3Client.send(command);

      const url = this.getPublicUrl(key);

      logger.info({ key, url }, 'Upload successful');

      return url;
    } catch (error) {
      logger.error({ error, key }, 'S3 upload failed');
      throw error;
    }
  }

  /**
   * Generate signed URL for private objects
   * 
   * @param key - S3 object key
   * @param expiresIn - URL expiration in seconds (default: 1 hour)
   * @returns Signed URL
   */
  async generateSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    logger.info({ key, expiresIn }, 'Generating signed URL');

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      logger.info({ key, signedUrl }, 'Signed URL generated');

      return signedUrl;
    } catch (error) {
      logger.error({ error, key }, 'Failed to generate signed URL');
      throw error;
    }
  }

  /**
   * Delete media from S3
   */
  async deleteMedia(key: string): Promise<void> {
    logger.info({ key }, 'Deleting from S3');

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      logger.info({ key }, 'Delete successful');
    } catch (error) {
      logger.error({ error, key }, 'S3 delete failed');
      throw error;
    }
  }

  /**
   * Check if object exists in S3
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get public URL for object (if bucket is public)
   */
  getPublicUrl(key: string): string {
    if (config.s3.endpoint) {
      // Custom endpoint (MinIO, DigitalOcean Spaces, etc.)
      return `${config.s3.endpoint}/${this.bucket}/${key}`;
    } else {
      // AWS S3
      return `https://${this.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;
    }
  }

  /**
   * Build S3 key for media asset
   * 
   * Format: media/{sessionId}/{assetId}.{ext}
   */
  buildMediaKey(params: {
    sessionId: string;
    assetId: string;
    extension: string;
  }): string {
    const { sessionId, assetId, extension } = params;
    return `media/${sessionId}/${assetId}.${extension}`;
  }

  /**
   * Build S3 key for thumbnail
   */
  buildThumbnailKey(params: {
    sessionId: string;
    assetId: string;
  }): string {
    const { sessionId, assetId } = params;
    return `thumbnails/${sessionId}/${assetId}.jpg`;
  }
}

/**
 * Export singleton instance
 */
export const s3Storage = new S3StorageService();
