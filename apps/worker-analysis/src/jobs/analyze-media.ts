import { Job } from 'bullmq';
import { database } from '@ai-agent/database';
import { storageService } from '@ai-agent/storage';
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
    // TODO: Implement Telegram Bot API file download
    // const telegramBot = new TelegramBot(config.telegram.botToken);
    // const fileBuffer = await telegramBot.downloadFile(telegramFileId);
    
    logger.info({ telegramFileId }, 'Downloading from Telegram (TODO)');

    // 3. Upload to permanent storage
    // TODO: Implement S3 upload
    // const storageUrl = await storageService.uploadMedia({
    //   buffer: fileBuffer,
    //   filename: mediaAsset.filename,
    //   mimeType: mediaAsset.mimeType,
    // });

    // Mock storage URL for now
    const storageUrl = `https://storage.example.com/media/${mediaAssetId}`;

    // 4. Analyze with AI (ContentAgent uses OpenClaw/Gemini)
    logger.info({ mediaAssetId, mediaType }, 'Analyzing media with AI');

    const analysis = await contentAgent.analyzeMedia({
      mediaType,
      mediaUrl: storageUrl,
      duration: mediaAsset.duration,
    });

    logger.info({ mediaAssetId, analysis }, 'Analysis completed');

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
  } catch (error) {
    logger.error({ sessionId, mediaAssetId, error }, 'Media analysis failed');

    // Mark as failed
    await database.mediaAsset.update({
      where: { id: mediaAssetId },
      data: { analyzed: false },
    });

    throw error;
  }
}
