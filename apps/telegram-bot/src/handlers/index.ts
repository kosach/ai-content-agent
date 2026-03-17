import { Telegraf, Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { database } from '@ai-agent/database';
import { queueService } from '@ai-agent/queue';
import { contentAgent } from '@ai-agent/ai';
import { 
  SessionStatus, 
  MessageRole, 
  JobType,
  MediaType,
  AnalyzeMediaJobData,
  GenerateDraftsJobData,
} from '@ai-agent/core';
import { logger } from '@ai-agent/observability';

import { handleCallbackQuery } from './callback';
import { handleConnectYouTube, handleConnectFacebook, handleAccounts, handleDisconnect } from './connect';
import { tc, getUserLanguage } from '../i18n';
import { handleGeneralMessage, isKnownCommand } from '../conversational-ai';
import { 
  getOrCreateActiveSession, 
  scheduleIntentQuestion, 
  clearSessionTracking,
  getMediaGroupId 
} from '../session-manager';

/**
 * Telegram Bot Handlers - MVP Flow
 * 
 * Flow:
 * 1. User uploads photo/video → handlePhoto/handleVideo
 * 2. Create/resume session, save media
 * 3. Enqueue ANALYZE_MEDIA job
 * 4. Agent asks clarifying questions
 * 5. User answers → handleText → extract context
 * 6. When ready → Enqueue GENERATE_DRAFTS
 * 7. Present drafts → callback handler (approval) → Enqueue PUBLISH jobs
 * 
 * THIN HANDLERS - no business logic, only orchestration!
 */
export function registerHandlers(bot: Telegraf) {
  // Core commands
  bot.command('start', handleStart);
  bot.command('cancel', handleCancel);
  bot.command('status', handleStatus);

  // OAuth commands
  bot.command('connect_youtube', handleConnectYouTube);
  bot.command('connect_facebook', handleConnectFacebook);
  bot.command('accounts', handleAccounts);
  bot.command('disconnect', handleDisconnect);
  
  // Media handlers
  bot.on('photo', handlePhoto);
  bot.on('video', handleVideo);
  bot.on('text', handleText);
  bot.on('callback_query', handleCallbackQuery);
}

async function handleStart(ctx: Context) {
  if (!ctx.from) return;

  try {
    // Get or create User + BrandProfile
    const user = await database.user.upsert({
      where: { telegramId: ctx.from.id.toString() },
      update: {},
      create: {
        telegramId: ctx.from.id.toString(),
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
      },
    });

    await database.brandProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        brandName: ctx.from.first_name || undefined,
        defaultHashtags: [],
        autoPublish: false,
      },
    });

    await ctx.reply(
      tc(ctx, 'welcome.title') + '\n\n' +
      tc(ctx, 'welcome.description') + '\n\n' +
      tc(ctx, 'welcome.cta') + '\n\n' +
      tc(ctx, 'welcome.commands') + '\n' +
      tc(ctx, 'command.cancel') + '\n' +
      tc(ctx, 'command.status')
    );

    logger.info({ userId: user.id }, 'User started bot');
  } catch (error) {
    logger.error({ error, telegramId: ctx.from.id }, 'Failed to start bot');
    await ctx.reply(tc(ctx, 'error.generic'));
  }
}

async function handlePhoto(ctx: Context) {
  if (!ctx.from || !ctx.message || !('photo' in ctx.message)) return;

  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const mediaGroupId = getMediaGroupId(ctx);
  
  await handleMediaUpload(ctx, {
    type: MediaType.PHOTO,
    fileId: photo.file_id,
    fileSize: photo.file_size || 0,
    width: photo.width,
    height: photo.height,
    mediaGroupId,
  });
}

async function handleVideo(ctx: Context) {
  if (!ctx.from || !ctx.message || !('video' in ctx.message)) return;

  const video = ctx.message.video;
  const mediaGroupId = getMediaGroupId(ctx);
  
  await handleMediaUpload(ctx, {
    type: MediaType.VIDEO,
    fileId: video.file_id,
    fileSize: video.file_size || 0,
    width: video.width,
    height: video.height,
    duration: video.duration,
    thumbnail: video.thumbnail?.file_id,
    mediaGroupId,
  });
}

async function handleMediaUpload(
  ctx: Context,
  media: {
    type: MediaType;
    fileId: string;
    fileSize: number;
    width?: number;
    height?: number;
    duration?: number;
    thumbnail?: string;
    mediaGroupId?: string;
  }
) {
  if (!ctx.from) return;

  try {
    const user = await getOrCreateUser(ctx.from);
    const brandProfile = await getBrandProfile(user.id);

    // Use session manager to get or create active session
    // This prevents creating duplicate sessions for consecutive media
    const session = await getOrCreateActiveSession(brandProfile.id);

    // Save media asset (mediaGroupId tracked in SessionMessage metadata)
    const mediaAsset = await database.mediaAsset.create({
      data: {
        sessionId: session.id,
        type: media.type,
        telegramFileId: media.fileId,
        filename: `${media.fileId}.${media.type === MediaType.VIDEO ? 'mp4' : 'jpg'}`,
        mimeType: media.type === MediaType.VIDEO ? 'video/mp4' : 'image/jpeg',
        fileSize: media.fileSize,
        width: media.width,
        height: media.height,
        duration: media.duration,
        thumbnail: media.thumbnail,
      },
    });

    // Save user message
    await database.sessionMessage.create({
      data: {
        sessionId: session.id,
        role: MessageRole.USER,
        content: `[Uploaded ${media.type}]`,
        metadata: { 
          fileId: media.fileId,
          telegramMessageId: ctx.message?.message_id,
          mediaGroupId: media.mediaGroupId,
        },
      },
    });

    // Enqueue ANALYZE_MEDIA job
    const jobData: AnalyzeMediaJobData = {
      sessionId: session.id,
      brandProfileId: brandProfile.id,
      mediaAssetId: mediaAsset.id,
      mediaType: media.type,
      telegramFileId: media.fileId,
    };

    await queueService.enqueue(JobType.ANALYZE_MEDIA, jobData);

    // Update session status to ASKING_QUESTIONS (if not already)
    if (session.status === SessionStatus.COLLECTING_MEDIA) {
      await database.contentSession.update({
        where: { id: session.id },
        data: { status: SessionStatus.ASKING_QUESTIONS },
      });
    }

    // Schedule intent question with debounce
    // This prevents duplicate messages when user sends multiple videos
    scheduleIntentQuestion(session.id, async () => {
      // Re-fetch session to get latest state
      const updatedSession = await database.contentSession.findUnique({
        where: { id: session.id },
      });

      if (!updatedSession) return;

      // Get appropriate question based on session state
      let questionKey: string;
      const hasUserIntent = !!updatedSession.userIntent;
      const hasTone = !!updatedSession.tone;
      
      if (!hasUserIntent) {
        questionKey = 'question.mediaReceived';
      } else if (!hasTone) {
        questionKey = 'question.toneOptions';
      } else {
        questionKey = 'question.readyToGenerate';
      }
      
      const message = tc(ctx, questionKey as any);

      // Save agent response
      await database.sessionMessage.create({
        data: {
          sessionId: session.id,
          role: MessageRole.AGENT,
          content: message,
        },
      });

      await ctx.reply(message);
      logger.info({ sessionId: session.id, questionKey }, 'Intent question sent after debounce');

      // If ready to generate, enqueue draft generation job
      if (questionKey === 'question.readyToGenerate') {
        logger.info({ sessionId: session.id }, 'Enqueueing draft generation job');
        
        // Fetch analyzed media for this session
        const analyzedMedia = await database.mediaAsset.findMany({
          where: {
            sessionId: session.id,
            analyzed: true,
          },
        });
        
        if (analyzedMedia.length === 0) {
          logger.warn({ sessionId: session.id }, 'No analyzed media found, skipping draft generation');
          return;
        }
        
        // Combine analysis from all media (use first one for now, TODO: merge multiple)
        const combinedAnalysis = analyzedMedia[0].analysisResult as any;
        
        const draftJobData: GenerateDraftsJobData = {
          sessionId: session.id,
          brandProfileId: updatedSession.brandProfileId,
          userIntent: updatedSession.userIntent || '',
          tone: updatedSession.tone || '',
          mediaAnalysis: combinedAnalysis,
        };
        
        await queueService.enqueue(JobType.GENERATE_DRAFTS, draftJobData);
        logger.info({ sessionId: session.id, analyzedMediaCount: analyzedMedia.length }, 'Draft generation job enqueued');
      }
    });

    logger.info({ 
      sessionId: session.id, 
      mediaType: media.type,
      mediaGroupId: media.mediaGroupId,
    }, 'Media uploaded and question scheduled');
  } catch (error) {
    logger.error({ error }, 'Failed to handle media upload');
    await ctx.reply(tc(ctx, 'error.generic'));
  }
}

async function handleText(ctx: Context) {
  if (!ctx.from || !ctx.message || !('text' in ctx.message)) return;

  const text = ctx.message.text;

  // Skip commands - they're handled separately
  if (isKnownCommand(text)) {
    return;
  }

  try {
    const user = await getOrCreateUser(ctx.from);
    const brandProfile = await getBrandProfile(user.id);

    // Get active session
    const session = await database.contentSession.findFirst({
      where: {
        brandProfileId: brandProfile.id,
        status: {
          in: [
            SessionStatus.ASKING_QUESTIONS,
            SessionStatus.AWAITING_APPROVAL,
          ],
        },
      },
      include: {
        mediaAssets: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    // If no active session, use conversational AI
    if (!session) {
      const lang = getUserLanguage(ctx);
      const response = await handleGeneralMessage(text, lang);
      await ctx.reply(response);
      return;
    }

    // Save user message
    await database.sessionMessage.create({
      data: {
        sessionId: session.id,
        role: MessageRole.USER,
        content: text,
        metadata: { telegramMessageId: ctx.message.message_id },
      },
    });

    // Route based on session status
    if (session.status === SessionStatus.AWAITING_APPROVAL) {
      // Check if draft is in revision mode
      const draftPackage = await database.draftPackage.findFirst({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'desc' },
      });

      if (draftPackage?.status === 'NEEDS_REVISION') {
        await handleRevisionRequest(ctx, session, draftPackage, text);
      } else {
        await handleApproval(ctx, session, text);
      }
    } else {
      await handleConversation(ctx, session, text);
    }
  } catch (error) {
    logger.error({ error }, 'Failed to handle text message');
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

async function handleConversation(ctx: Context, session: any, text: string) {
  // Extract context from user's message
  const extracted = await contentAgent.extractContext(text, {
    sessionId: session.id,
    status: session.status,
    mediaCount: session.mediaAssets.length,
    hasUserIntent: !!session.userIntent,
    hasTone: !!session.tone,
    messages: session.messages,
  });

  // Update session
  await database.contentSession.update({
    where: { id: session.id },
    data: {
      userIntent: extracted.userIntent || session.userIntent,
      tone: extracted.tone || session.tone,
    },
  });

  // Get next question
  const updatedSession = await database.contentSession.findUnique({
    where: { id: session.id },
    include: { mediaAssets: true },
  });

  const agentResponse = await contentAgent.getNextQuestion({
    sessionId: session.id,
    status: session.status,
    mediaCount: updatedSession!.mediaAssets.length,
    hasUserIntent: !!updatedSession!.userIntent,
    hasTone: !!updatedSession!.tone,
    messages: [],
  });

  // Save agent response
  await database.sessionMessage.create({
    data: {
      sessionId: session.id,
      role: MessageRole.AGENT,
      content: agentResponse.message,
    },
  });

  await ctx.reply(agentResponse.message);

  // If ready to generate, enqueue job
  if (agentResponse.shouldGenerateDrafts && updatedSession!.userIntent && updatedSession!.tone) {
    await database.contentSession.update({
      where: { id: session.id },
      data: { status: SessionStatus.GENERATING_DRAFTS },
    });

    // Get media analysis
    const mediaAsset = updatedSession!.mediaAssets[0];
    const analysis = mediaAsset.analysisResult as any;

    // Enqueue GENERATE_DRAFTS with proper payload
    const jobData: GenerateDraftsJobData = {
      sessionId: session.id,
      brandProfileId: updatedSession!.brandProfileId,
      userIntent: updatedSession!.userIntent,
      tone: updatedSession!.tone,
      mediaAnalysis: analysis || {
        topics: [],
        mood: 'neutral',
        objects: [],
        suggestedTitle: '',
        contentType: 'general',
        targetAudience: 'general',
      },
    };

    await queueService.enqueue(JobType.GENERATE_DRAFTS, jobData);
  }
}

async function handleApproval(ctx: Context, session: any, text: string) {
  const result = await contentAgent.handleApproval(text);

  if (result.approved) {
    await ctx.reply(
      '⚠️ Please use the inline buttons above to approve drafts.\n\n' +
      'Click ✅ Approve button to publish.'
    );
  } else {
    await ctx.reply(
      'Got it! What would you like me to change?\n\n' +
      'Be specific (e.g., "Make it more casual" or "Change the hashtags")'
    );

    // Save revision request
    const draftPackage = await database.draftPackage.findFirst({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
    });

    if (draftPackage) {
      await database.draftPackage.update({
        where: { id: draftPackage.id },
        data: {
          status: 'NEEDS_REVISION',
          revisionRequest: result.revisionRequest,
        },
      });
    }
  }
}

async function handleRevisionRequest(ctx: Context, session: any, draftPackage: any, text: string) {
  logger.info({ sessionId: session.id, draftPackageId: draftPackage.id }, 'Processing revision request');

  try {
    await ctx.reply('🤖 Revising your drafts based on your feedback...');

    // Get original context
    const mediaAsset = await database.mediaAsset.findFirst({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
    });

    const originalContext = {
      userIntent: session.userIntent,
      tone: session.tone,
      topics: (mediaAsset?.analysisResult as any)?.topics?.join(', ') || '',
      targetAudience: (mediaAsset?.analysisResult as any)?.targetAudience || '',
    };

    // Call contentAgent.processRevision
    const currentDraft = {
      youtubeShort: {
        title: draftPackage.youtubeTitle,
        description: draftPackage.youtubeDescription,
        hashtags: draftPackage.youtubeHashtags,
      },
      facebookPost: {
        text: draftPackage.facebookText,
        hashtags: draftPackage.facebookHashtags,
      },
    };

    const { revisedDraft } = await contentAgent.processRevision({
      currentDraft,
      revisionRequest: text,
      originalContext,
    });

    // Create new DraftPackage with incremented version
    const newDraftPackage = await database.draftPackage.create({
      data: {
        sessionId: session.id,
        youtubeTitle: revisedDraft.youtubeShort.title,
        youtubeDescription: revisedDraft.youtubeShort.description,
        youtubeHashtags: revisedDraft.youtubeShort.hashtags,
        facebookText: revisedDraft.facebookPost.text,
        facebookHashtags: revisedDraft.facebookPost.hashtags,
        status: 'DRAFT',
        version: draftPackage.version + 1,
        revisionRequest: text,
      },
    });

    logger.info({ newDraftPackageId: newDraftPackage.id, version: newDraftPackage.version }, 'Revised draft created');

    // Send new preview (import from media package if needed, or inline)
    const { telegramNotification } = await import('@ai-agent/media');
    
    await telegramNotification.sendDraftPreview({
      chatId: ctx.from!.id.toString(),
      sessionId: session.id,
      draftPackageId: newDraftPackage.id,
      youtubeShort: {
        title: revisedDraft.youtubeShort.title,
        description: revisedDraft.youtubeShort.description,
        hashtags: revisedDraft.youtubeShort.hashtags,
      },
      facebookPost: {
        text: revisedDraft.facebookPost.text,
        hashtags: revisedDraft.facebookPost.hashtags,
      },
    });

  } catch (error) {
    logger.error({ error, sessionId: session.id }, 'Failed to process revision');
    await ctx.reply(
      '⚠️ Failed to revise drafts. Please try again or click ❌ Cancel to start over.'
    );
  }
}

async function handleCancel(ctx: Context) {
  if (!ctx.from) return;

  try {
    const user = await getOrCreateUser(ctx.from);
    const brandProfile = await getBrandProfile(user.id);

    const session = await database.contentSession.findFirst({
      where: {
        brandProfileId: brandProfile.id,
        status: {
          notIn: [SessionStatus.PUBLISHED, SessionStatus.CANCELLED, SessionStatus.FAILED],
        },
      },
    });

    if (session) {
      // Clear pending question sends
      clearSessionTracking(session.id);
      
      await database.contentSession.update({
        where: { id: session.id },
        data: { status: SessionStatus.CANCELLED },
      });
      logger.info({ sessionId: session.id }, 'Session cancelled by user');
    }

    // Always respond friendly, whether there was a session or not
    await ctx.reply(tc(ctx, 'session.cancelled'));
  } catch (error) {
    logger.error({ error }, 'Failed to cancel session');
    await ctx.reply(tc(ctx, 'error.generic'));
  }
}

async function handleStatus(ctx: Context) {
  if (!ctx.from) return;

  try {
    const user = await getOrCreateUser(ctx.from);
    const brandProfile = await getBrandProfile(user.id);

    const session = await database.contentSession.findFirst({
      where: {
        brandProfileId: brandProfile.id,
        status: {
          notIn: [SessionStatus.PUBLISHED, SessionStatus.CANCELLED, SessionStatus.FAILED],
        },
      },
      include: {
        mediaAssets: true,
        draftPackages: true,
      },
    });

    if (!session) {
      await ctx.reply('No active session. Upload media to start!');
      return;
    }

    const statusEmoji: Record<SessionStatus, string> = {
      [SessionStatus.COLLECTING_MEDIA]: '📤',
      [SessionStatus.ASKING_QUESTIONS]: '💬',
      [SessionStatus.GENERATING_DRAFTS]: '🤖',
      [SessionStatus.AWAITING_APPROVAL]: '👀',
      [SessionStatus.APPROVED]: '✅',
      [SessionStatus.PUBLISHING]: '🚀',
      [SessionStatus.PUBLISHED]: '🎉',
      [SessionStatus.CANCELLED]: '❌',
      [SessionStatus.FAILED]: '⚠️',
    };

    await ctx.reply(
      `${statusEmoji[session.status]} Status: ${session.status}\n\n` +
      `📁 Media: ${session.mediaAssets.length}\n` +
      `📝 Drafts: ${session.draftPackages.length}\n` +
      `🕒 Started: ${session.createdAt.toLocaleString()}`
    );
  } catch (error) {
    logger.error({ error }, 'Failed to get status');
    await ctx.reply('Failed to get status.');
  }
}

async function getOrCreateUser(from: any) {
  return database.user.upsert({
    where: { telegramId: from.id.toString() },
    update: {},
    create: {
      telegramId: from.id.toString(),
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
    },
  });
}

async function getBrandProfile(userId: string) {
  let profile = await database.brandProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    profile = await database.brandProfile.create({
      data: {
        userId,
        defaultHashtags: [],
        autoPublish: false,
      },
    });
  }

  return profile;
}
