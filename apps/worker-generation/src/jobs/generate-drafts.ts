import { Job } from 'bullmq';
import { database } from '@ai-agent/database';
import { contentAgent } from '@ai-agent/ai';
import { telegramNotification } from '@ai-agent/media';
import { s3Storage } from '@ai-agent/storage';
import { logger } from '@ai-agent/observability';
import { GenerateDraftsJobData, SessionStatus } from '@ai-agent/core';

/**
 * Generate Drafts Job
 * 
 * Responsibility: Generate YouTube Short + Facebook post drafts
 * 1. Get session + media analysis from database
 * 2. Call contentAgent.generateDrafts() (Gemini)
 * 3. Create DraftPackage in database
 * 4. Update session status to AWAITING_APPROVAL
 * 5. Send draft preview to user (Telegram)
 */
export async function generateDraftsJob(job: Job<GenerateDraftsJobData>) {
  const { sessionId, brandProfileId, userIntent, tone, mediaAnalysis } = job.data;

  logger.info({ sessionId, jobId: job.id }, 'Starting draft generation');

  try {
    // 1. Get session from database
    const session = await database.contentSession.findUnique({
      where: { id: sessionId },
      include: {
        brandProfile: {
          include: {
            user: true,
          },
        },
        mediaAssets: true,
      },
    });

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    logger.info({ sessionId, userIntent, tone }, 'Generating drafts with Gemini');

    // 2. Generate drafts using ContentAgent (Gemini)
    const drafts = await contentAgent.generateDrafts({
      mediaAnalysis,
      userIntent,
      tone,
      brandVoice: session.brandProfile.brandVoice || undefined,
      brandHashtags: session.brandProfile.defaultHashtags || undefined,
    });

    logger.info({ sessionId, drafts }, 'Drafts generated successfully');

    // 3. Select primary media for publishing
    const primaryVideo = session.mediaAssets.find(m => m.type === 'VIDEO');
    const primaryImage = session.mediaAssets.find(m => m.type === 'PHOTO');
    
    logger.info({ 
      primaryVideoId: primaryVideo?.id, 
      primaryImageId: primaryImage?.id 
    }, 'Selected primary media for draft package');

    // 4. Create DraftPackage in database
    const draftPackage = await database.draftPackage.create({
      data: {
        sessionId,
        youtubeTitle: drafts.youtubeShort.title,
        youtubeDescription: drafts.youtubeShort.description,
        youtubeHashtags: drafts.youtubeShort.hashtags,
        facebookText: drafts.facebookPost.text,
        facebookHashtags: drafts.facebookPost.hashtags,
        primaryVideoId: primaryVideo?.id, // Link to actual video file
        primaryImageId: primaryImage?.id, // Link to thumbnail/cover
        status: 'DRAFT',
        version: 1,
      },
    });

    logger.info({ sessionId, draftPackageId: draftPackage.id }, 'DraftPackage created');

    // 5. Update session status
    await database.contentSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.AWAITING_APPROVAL },
    });

    logger.info({ sessionId }, 'Session status updated to AWAITING_APPROVAL');

    // 6. Generate signed URLs for preview (Telegram can't access localhost:9000)
    let videoPreviewUrl: string | undefined;
    let imagePreviewUrl: string | undefined;
    
    if (primaryVideo?.storageUrl) {
      // Extract S3 key from URL: http://localhost:9000/bucket/key
      const urlParts = primaryVideo.storageUrl.split('/');
      const s3Key = urlParts.slice(4).join('/'); // media/session/file.ext
      videoPreviewUrl = await s3Storage.generateSignedUrl(s3Key, 3600); // 1 hour
      logger.info({ videoPreviewUrl: videoPreviewUrl.substring(0, 100) + '...' }, 'Generated video preview URL');
    }
    
    if (primaryImage?.storageUrl) {
      const urlParts = primaryImage.storageUrl.split('/');
      const s3Key = urlParts.slice(4).join('/');
      imagePreviewUrl = await s3Storage.generateSignedUrl(s3Key, 3600);
    }

    // 7. Send draft preview to user via Telegram
    const telegramChatId = session.brandProfile.user.telegramId;

    await telegramNotification.sendDraftPreview({
      chatId: telegramChatId,
      sessionId,
      draftPackageId: draftPackage.id,
      videoUrl: videoPreviewUrl,
      imageUrl: imagePreviewUrl,
      youtubeShort: {
        title: drafts.youtubeShort.title,
        description: drafts.youtubeShort.description,
        hashtags: drafts.youtubeShort.hashtags,
      },
      facebookPost: {
        text: drafts.facebookPost.text,
        hashtags: drafts.facebookPost.hashtags,
      },
    });

    logger.info({ sessionId, telegramChatId }, 'Draft preview sent to user');

    return {
      success: true,
      data: {
        sessionId,
        draftPackageId: draftPackage.id,
        drafts,
      },
    };
  } catch (error) {
    logger.error({ sessionId, error }, 'Draft generation failed');

    // Mark session as failed
    await database.contentSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.FAILED },
    });

    // Notify user about error
    try {
      const session = await database.contentSession.findUnique({
        where: { id: sessionId },
        include: {
          brandProfile: {
            include: { user: true },
          },
        },
      });

      if (session) {
        await telegramNotification.sendError({
          chatId: session.brandProfile.user.telegramId,
          errorMessage: 'Failed to generate content drafts',
          context: 'Draft Generation',
        });
      }
    } catch (notificationError) {
      logger.error({ notificationError }, 'Failed to send error notification');
    }

    throw error;
  }
}
