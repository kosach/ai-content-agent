"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeMediaJob = analyzeMediaJob;
const database_1 = require("@ai-agent/database");
const storage_1 = require("@ai-agent/storage");
const media_1 = require("@ai-agent/media");
const ai_1 = require("@ai-agent/ai");
const observability_1 = require("@ai-agent/observability");
/**
 * Analyze Media Job
 *
 * Responsibility: ONLY media analysis
 * 1. Download media from Telegram
 * 2. Upload to permanent storage (S3)
 * 3. Analyze content with AI (topics, mood, objects, title)
 * 4. Update MediaAsset with results
 *
 * Does NOT:
 * - Generate drafts (worker-generation)
 * - Ask questions (conversation agent in telegram-bot)
 * - Publish (worker-publish)
 */
async function analyzeMediaJob(job) {
    const { sessionId, mediaAssetId, mediaType, telegramFileId } = job.data;
    observability_1.logger.info({ sessionId, mediaAssetId, jobId: job.id }, 'Starting media analysis');
    try {
        // 1. Get media asset from database
        const mediaAsset = await database_1.database.mediaAsset.findUnique({
            where: { id: mediaAssetId },
        });
        if (!mediaAsset) {
            throw new Error(`Media asset not found: ${mediaAssetId}`);
        }
        // 2. Download from Telegram
        observability_1.logger.info({ telegramFileId }, 'Downloading from Telegram');
        const { buffer, size } = await media_1.telegramFile.downloadWithMetadata(telegramFileId);
        observability_1.logger.info({ telegramFileId, downloadedSize: size }, 'Downloaded from Telegram');
        // 3. Upload to permanent storage (S3)
        const fileExtension = mediaAsset.filename.split('.').pop() || (mediaType === 'VIDEO' ? 'mp4' : 'jpg');
        const s3Key = storage_1.s3Storage.buildMediaKey({
            sessionId,
            assetId: mediaAssetId,
            extension: fileExtension,
        });
        observability_1.logger.info({ s3Key, size }, 'Uploading to S3');
        const storageUrl = await storage_1.s3Storage.uploadMedia({
            buffer,
            key: s3Key,
            contentType: mediaAsset.mimeType,
            metadata: {
                sessionId,
                mediaAssetId,
                telegramFileId,
            },
        });
        observability_1.logger.info({ storageUrl }, 'Uploaded to S3 successfully');
        // 4. Analyze with AI (ContentAgent uses OpenClaw/Gemini)
        observability_1.logger.info({ mediaAssetId, mediaType }, 'Analyzing media with AI');
        const analysis = await ai_1.contentAgent.analyzeMedia({
            mediaType,
            mediaUrl: storageUrl,
            duration: mediaAsset.duration,
        });
        observability_1.logger.info({ mediaAssetId, analysis }, 'Analysis completed');
        // 5. Update media asset
        await database_1.database.mediaAsset.update({
            where: { id: mediaAssetId },
            data: {
                storageUrl,
                analyzed: true,
                analysisResult: analysis,
            },
        });
        return {
            success: true,
            data: {
                mediaAssetId,
                storageUrl,
                analysis,
            },
        };
    }
    catch (error) {
        observability_1.logger.error({ sessionId, mediaAssetId, error }, 'Media analysis failed');
        // Mark as failed
        await database_1.database.mediaAsset.update({
            where: { id: mediaAssetId },
            data: { analyzed: false },
        });
        throw error;
    }
}
//# sourceMappingURL=analyze-media.js.map