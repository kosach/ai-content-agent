"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Storage = exports.S3StorageService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const observability_1 = require("@ai-agent/observability");
const config_1 = require("@ai-agent/config");
/**
 * S3 Storage Service
 *
 * Uploads and manages media files in S3-compatible storage (AWS S3, MinIO, etc.)
 */
class S3StorageService {
    s3Client;
    bucket;
    constructor() {
        this.bucket = config_1.config.s3.bucket;
        // Initialize S3 client
        this.s3Client = new client_s3_1.S3Client({
            endpoint: config_1.config.s3.endpoint,
            region: config_1.config.s3.region,
            credentials: {
                accessKeyId: config_1.config.s3.accessKey,
                secretAccessKey: config_1.config.s3.secretKey,
            },
            // For MinIO or custom S3-compatible storage
            forcePathStyle: !!config_1.config.s3.endpoint,
        });
        observability_1.logger.info({
            bucket: this.bucket,
            region: config_1.config.s3.region,
            endpoint: config_1.config.s3.endpoint || 'AWS S3',
        }, 'S3 Storage Service initialized');
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
    async uploadMedia(params) {
        const { buffer, key, contentType, metadata } = params;
        observability_1.logger.info({
            key,
            contentType,
            size: buffer.length,
        }, 'Uploading to S3');
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                Metadata: metadata,
            });
            await this.s3Client.send(command);
            const url = this.getPublicUrl(key);
            observability_1.logger.info({ key, url }, 'Upload successful');
            return url;
        }
        catch (error) {
            observability_1.logger.error({ error, key }, 'S3 upload failed');
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
    async generateSignedUrl(key, expiresIn = 3600) {
        observability_1.logger.info({ key, expiresIn }, 'Generating signed URL');
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, {
                expiresIn,
            });
            observability_1.logger.info({ key, signedUrl }, 'Signed URL generated');
            return signedUrl;
        }
        catch (error) {
            observability_1.logger.error({ error, key }, 'Failed to generate signed URL');
            throw error;
        }
    }
    /**
     * Delete media from S3
     */
    async deleteMedia(key) {
        observability_1.logger.info({ key }, 'Deleting from S3');
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            await this.s3Client.send(command);
            observability_1.logger.info({ key }, 'Delete successful');
        }
        catch (error) {
            observability_1.logger.error({ error, key }, 'S3 delete failed');
            throw error;
        }
    }
    /**
     * Check if object exists in S3
     */
    async exists(key) {
        try {
            const command = new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            await this.s3Client.send(command);
            return true;
        }
        catch (error) {
            if (error.name === 'NotFound') {
                return false;
            }
            throw error;
        }
    }
    /**
     * Get public URL for object (if bucket is public)
     */
    getPublicUrl(key) {
        if (config_1.config.s3.endpoint) {
            // Custom endpoint (MinIO, DigitalOcean Spaces, etc.)
            return `${config_1.config.s3.endpoint}/${this.bucket}/${key}`;
        }
        else {
            // AWS S3
            return `https://${this.bucket}.s3.${config_1.config.s3.region}.amazonaws.com/${key}`;
        }
    }
    /**
     * Build S3 key for media asset
     *
     * Format: media/{sessionId}/{assetId}.{ext}
     */
    buildMediaKey(params) {
        const { sessionId, assetId, extension } = params;
        return `media/${sessionId}/${assetId}.${extension}`;
    }
    /**
     * Build S3 key for thumbnail
     */
    buildThumbnailKey(params) {
        const { sessionId, assetId } = params;
        return `thumbnails/${sessionId}/${assetId}.jpg`;
    }
}
exports.S3StorageService = S3StorageService;
/**
 * Export singleton instance
 */
exports.s3Storage = new S3StorageService();
//# sourceMappingURL=s3-storage.service.js.map