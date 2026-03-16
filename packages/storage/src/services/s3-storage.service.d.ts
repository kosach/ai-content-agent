/**
 * S3 Storage Service
 *
 * Uploads and manages media files in S3-compatible storage (AWS S3, MinIO, etc.)
 */
export declare class S3StorageService {
    private s3Client;
    private bucket;
    constructor();
    /**
     * Upload media file to S3
     *
     * @param params.buffer - File buffer
     * @param params.key - S3 object key (path)
     * @param params.contentType - MIME type
     * @param params.metadata - Optional metadata
     * @returns S3 URL
     */
    uploadMedia(params: {
        buffer: Buffer;
        key: string;
        contentType: string;
        metadata?: Record<string, string>;
    }): Promise<string>;
    /**
     * Generate signed URL for private objects
     *
     * @param key - S3 object key
     * @param expiresIn - URL expiration in seconds (default: 1 hour)
     * @returns Signed URL
     */
    generateSignedUrl(key: string, expiresIn?: number): Promise<string>;
    /**
     * Delete media from S3
     */
    deleteMedia(key: string): Promise<void>;
    /**
     * Check if object exists in S3
     */
    exists(key: string): Promise<boolean>;
    /**
     * Get public URL for object (if bucket is public)
     */
    getPublicUrl(key: string): string;
    /**
     * Build S3 key for media asset
     *
     * Format: media/{sessionId}/{assetId}.{ext}
     */
    buildMediaKey(params: {
        sessionId: string;
        assetId: string;
        extension: string;
    }): string;
    /**
     * Build S3 key for thumbnail
     */
    buildThumbnailKey(params: {
        sessionId: string;
        assetId: string;
    }): string;
}
/**
 * Export singleton instance
 */
export declare const s3Storage: S3StorageService;
//# sourceMappingURL=s3-storage.service.d.ts.map