import { Job } from 'bullmq';
import { database } from '@ai-agent/database';
import { contentAgent } from '@ai-agent/ai';
import { telegramNotification } from '@ai-agent/media';
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

    // 3. Create DraftPackage in database
    const draftPackage = await database.draftPackage.create({
      data: {
        sessionId,
        youtubeTitle: drafts.youtubeShort.title,
        youtubeDescription: drafts.youtubeShort.description,
        youtubeHashtags: drafts.youtubeShort.hashtags,
        facebookText: drafts.facebookPost.text,
        facebookHashtags: drafts.facebookPost.hashtags,
        status: 'DRAFT',
        version: 1,
      },
    });

    logger.info({ sessionId, draftPackageId: draftPackage.id }, 'DraftPackage created');

    // 4. Update session status
    await database.contentSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.AWAITING_APPROVAL },
    });

    logger.info({ sessionId }, 'Session status updated to AWAITING_APPROVAL');

    // 5. Send draft preview to user via Telegram
    const telegramChatId = session.brandProfile.user.telegramId;

    await telegramNotification.sendDraftPreview({
      chatId: telegramChatId,
      sessionId,
      draftPackageId: draftPackage.id,
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
