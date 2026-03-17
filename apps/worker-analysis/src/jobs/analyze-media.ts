import { Job } from 'bullmq';
import { database } from '@ai-agent/database';
import { s3Storage } from '@ai-agent/storage';
import { telegramFile } from '@ai-agent/media';
import { contentAgent } from '@ai-agent/ai';
import { logger } from '@ai-agent/observability';
import { AnalyzeMediaJobData } from '@ai-agent/core';

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
export async function analyzeMediaJob(job: Job<AnalyzeMediaJobData>) {
  const { sessionId, mediaAssetId, mediaType, telegramFileId } = job.data;

  logger.info({ sessionId, mediaAssetId, jobId: job.id }, 'Starting media analysis');

  try {
    // 1. Get media asset from database
    const mediaAsset = await database.mediaAsset.findUnique({
      where: { id: mediaAssetId },
    });

    if (!mediaAsset) {
      throw new Error(`Media asset not found: ${mediaAssetId}`);
    }

    // 2. Download from Telegram
    logger.info({ telegramFileId }, 'Downloading from Telegram');
    
    const { buffer, size } = await telegramFile.downloadWithMetadata(telegramFileId);
    
    logger.info({ telegramFileId, downloadedSize: size }, 'Downloaded from Telegram');

    // 3. Upload to permanent storage (S3)
    const fileExtension = mediaAsset.filename.split('.').pop() || (mediaType === 'VIDEO' ? 'mp4' : 'jpg');
    
    const s3Key = s3Storage.buildMediaKey({
      sessionId,
      assetId: mediaAssetId,
      extension: fileExtension,
    });

    logger.info({ s3Key, size }, 'Uploading to S3');

    const storageUrl = await s3Storage.uploadMedia({
      buffer,
      key: s3Key,
      contentType: mediaAsset.mimeType,
      metadata: {
        sessionId,
        mediaAssetId,
        telegramFileId,
      },
    });

    logger.info({ storageUrl }, 'Uploaded to S3 successfully');

    // 4. Analyze with AI (ContentAgent uses OpenClaw/Gemini)
    logger.info({ mediaAssetId, mediaType, storageUrl }, 'Analyzing media with AI');

    let analysis;
    try {
      analysis = await contentAgent.analyzeMedia({
        mediaType,
        mediaUrl: storageUrl,
        duration: mediaAsset.duration || undefined,
      });
      logger.info({ mediaAssetId, analysisKeys: Object.keys(analysis) }, 'Analysis completed successfully');
    } catch (analysisError: any) {
      logger.error({ 
        error: analysisError, 
        message: analysisError?.message, 
        stack: analysisError?.stack,
        cause: analysisError?.cause,
        mediaType,
        storageUrl
      }, 'AI analysis API call failed');
      throw new Error(`AI analysis failed: ${analysisError?.message || 'Unknown error'}`);
    }

    // 5. Update media asset
    await database.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        storageUrl,
        analyzed: true,
        analysisResult: analysis as any,
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
  } catch (error: any) {
    logger.error({ 
      sessionId, 
      mediaAssetId, 
      error, 
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    }, 'Media analysis job failed');

    // Mark as failed
    try {
      await database.mediaAsset.update({
        where: { id: mediaAssetId },
        data: { analyzed: false },
      });
    } catch (dbError) {
      logger.error({ dbError }, 'Failed to mark media asset as failed');
    }

    throw error;
  }
}
