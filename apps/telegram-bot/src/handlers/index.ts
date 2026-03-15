import { Telegraf, Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { database } from '@ai-agent/database';
import { queueService } from '@ai-agent/queue';
import { conversationAgent } from '@ai-agent/ai';
import { 
  SessionStatus, 
  MessageRole, 
  JobType,
  MediaType,
} from '@ai-agent/core';
import { logger } from '@ai-agent/observability';

/**
 * Register all Telegram bot handlers
 * 
 * THIN HANDLER PATTERN:
 * - Save media/message to database
 * - Get conversation agent's response
 * - Enqueue background jobs
 * - Reply to user
 * 
 * NO business logic here - delegate to services!
 */
export function registerHandlers(bot: Telegraf) {
  bot.command('start', handleStart);
  bot.command('cancel', handleCancel);
  bot.command('status', handleStatus);
  
  // Media uploads (photos/videos)
  bot.on('photo', handlePhoto);
  bot.on('video', handleVideo);
  
  // Text messages (conversation)
  bot.on('text', handleText);
}

async function handleStart(ctx: Context) {
  if (!ctx.from) return;

  try {
    // Get or create brand profile
    const brandProfile = await database.brandProfile.upsert({
      where: { telegramId: ctx.from.id.toString() },
      update: {},
      create: {
        userId: ctx.from.id.toString(),
        telegramId: ctx.from.id.toString(),
        brandName: ctx.from.first_name || undefined,
        defaultHashtags: [],
        preferredPlatforms: ['YOUTUBE', 'FACEBOOK'],
        autoPublish: false,
      },
    });

    await ctx.reply(
      '👋 Welcome to AI Content Agent!\n\n' +
      'I help you create:\n' +
      '📹 YouTube Shorts\n' +
      '📱 Facebook posts\n\n' +
      'Just upload a video or photo to get started!\n\n' +
      'Commands:\n' +
      '/cancel - Cancel current session\n' +
      '/status - Check session status'
    );

    logger.info({ brandProfileId: brandProfile.id }, 'User started bot');
  } catch (error) {
    logger.error({ error, userId: ctx.from.id }, 'Failed to start bot');
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

async function handlePhoto(ctx: Context) {
  if (!ctx.from || !ctx.message || !('photo' in ctx.message)) return;

  try {
    const photo = ctx.message.photo[ctx.message.photo.length - 1]; // largest size
    await handleMediaUpload(ctx, {
      type: MediaType.PHOTO,
      fileId: photo.file_id,
      fileSize: photo.file_size || 0,
      width: photo.width,
      height: photo.height,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to handle photo');
    await ctx.reply('Failed to process photo. Please try again.');
  }
}

async function handleVideo(ctx: Context) {
  if (!ctx.from || !ctx.message || !('video' in ctx.message)) return;

  try {
    const video = ctx.message.video;
    await handleMediaUpload(ctx, {
      type: MediaType.VIDEO,
      fileId: video.file_id,
      fileSize: video.file_size || 0,
      width: video.width,
      height: video.height,
      duration: video.duration,
      thumbnail: video.thumbnail?.file_id,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to handle video');
    await ctx.reply('Failed to process video. Please try again.');
  }
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
  }
) {
  if (!ctx.from) return;

  const brandProfile = await getOrCreateBrandProfile(ctx.from.id.toString());

  // Get or create active session
  let session = await database.contentSession.findFirst({
    where: {
      brandProfileId: brandProfile.id,
      status: {
        in: [SessionStatus.COLLECTING_MEDIA, SessionStatus.ASKING_QUESTIONS],
      },
    },
  });

  if (!session) {
    session = await database.contentSession.create({
      data: {
        brandProfileId: brandProfile.id,
        status: SessionStatus.COLLECTING_MEDIA,
        targetPlatforms: ['YOUTUBE', 'FACEBOOK'],
      },
    });
  }

  // Save media asset (storage URL will be set by worker)
  await database.mediaAsset.create({
    data: {
      sessionId: session.id,
      type: media.type,
      telegramFileId: media.fileId,
      storageUrl: '', // Placeholder, will be uploaded by worker
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
      metadata: { fileId: media.fileId },
    },
  });

  // Enqueue media analysis job
  await queueService.enqueue(JobType.ANALYZE_MEDIA, {
    sessionId: session.id,
    brandProfileId: brandProfile.id,
    mediaType: media.type,
    telegramFileId: media.fileId,
  });

  // Update session status
  await database.contentSession.update({
    where: { id: session.id },
    data: { status: SessionStatus.ASKING_QUESTIONS },
  });

  // Get conversation agent's next question
  const mediaCount = await database.mediaAsset.count({
    where: { sessionId: session.id },
  });

  const agentResponse = await conversationAgent.getNextQuestion({
    sessionId: session.id,
    status: session.status,
    messages: [],
    mediaCount,
    hasUserIntent: !!session.userIntent,
    hasTargetPlatforms: session.targetPlatforms.length > 0,
    hasTone: !!session.tone,
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

  logger.info({ sessionId: session.id, mediaType: media.type }, 'Media uploaded');
}

async function handleText(ctx: Context) {
  if (!ctx.from || !ctx.message || !('text' in ctx.message)) return;
  
  const text = ctx.message.text;

  try {
    const brandProfile = await getOrCreateBrandProfile(ctx.from.id.toString());

    // Get active session
    const session = await database.contentSession.findFirst({
      where: {
        brandProfileId: brandProfile.id,
        status: {
          in: [
            SessionStatus.COLLECTING_MEDIA,
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

    if (!session) {
      await ctx.reply(
        'No active session. Upload a photo or video to start creating content!'
      );
      return;
    }

    // Save user message
    await database.sessionMessage.create({
      data: {
        sessionId: session.id,
        role: MessageRole.USER,
        content: text,
      },
    });

    // Handle based on session status
    if (session.status === SessionStatus.AWAITING_APPROVAL) {
      await handleApproval(ctx, session, text);
    } else {
      await handleConversation(ctx, session, text);
    }
  } catch (error) {
    logger.error({ error }, 'Failed to handle text message');
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

async function handleConversation(ctx: Context, session: any, text: string) {
  // Process user's response
  const extracted = await conversationAgent.processUserResponse(text, {
    sessionId: session.id,
    status: session.status,
    messages: session.messages,
    mediaCount: session.mediaAssets.length,
    hasUserIntent: !!session.userIntent,
    hasTargetPlatforms: session.targetPlatforms.length > 0,
    hasTone: !!session.tone,
  });

  // Update session with extracted context
  await database.contentSession.update({
    where: { id: session.id },
    data: {
      userIntent: extracted.userIntent || session.userIntent,
      tone: extracted.tone || session.tone,
      targetPlatforms: extracted.targetPlatforms || session.targetPlatforms,
    },
  });

  // Get next question
  const agentResponse = await conversationAgent.getNextQuestion({
    sessionId: session.id,
    status: session.status,
    messages: session.messages,
    mediaCount: session.mediaAssets.length,
    hasUserIntent: !!(extracted.userIntent || session.userIntent),
    hasTargetPlatforms: (extracted.targetPlatforms || session.targetPlatforms).length > 0,
    hasTone: !!(extracted.tone || session.tone),
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

  // If ready to generate, update status and enqueue job
  if (agentResponse.shouldGenerateDrafts) {
    await database.contentSession.update({
      where: { id: session.id },
      data: { status: SessionStatus.GENERATING_DRAFTS },
    });

    await queueService.enqueue(JobType.GENERATE_DRAFTS, {
      sessionId: session.id,
      brandProfileId: session.brandProfileId,
    });
  }
}

async function handleApproval(ctx: Context, session: any, text: string) {
  const result = await conversationAgent.handleApprovalResponse(text);

  if (result.approved) {
    await database.contentSession.update({
      where: { id: session.id },
      data: { status: SessionStatus.APPROVED },
    });

    await ctx.reply('Great! Publishing your content...');

    // Enqueue publishing jobs
    await queueService.enqueue(JobType.PUBLISH_YOUTUBE, {
      sessionId: session.id,
      brandProfileId: session.brandProfileId,
    });

    await queueService.enqueue(JobType.PUBLISH_FACEBOOK, {
      sessionId: session.id,
      brandProfileId: session.brandProfileId,
    });
  } else {
    await ctx.reply(
      'Got it! I\'ll revise the drafts based on your feedback.\n\n' +
      'What would you like me to change?'
    );

    // TODO: Implement revision flow
  }
}

async function handleCancel(ctx: Context) {
  if (!ctx.from) return;

  const brandProfile = await getOrCreateBrandProfile(ctx.from.id.toString());

  const session = await database.contentSession.findFirst({
    where: {
      brandProfileId: brandProfile.id,
      status: {
        notIn: [SessionStatus.PUBLISHED, SessionStatus.CANCELLED, SessionStatus.FAILED],
      },
    },
  });

  if (session) {
    await database.contentSession.update({
      where: { id: session.id },
      data: { status: SessionStatus.CANCELLED },
    });

    await ctx.reply('Session cancelled. Upload new media to start again!');
  } else {
    await ctx.reply('No active session to cancel.');
  }
}

async function handleStatus(ctx: Context) {
  if (!ctx.from) return;

  const brandProfile = await getOrCreateBrandProfile(ctx.from.id.toString());

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

  const statusEmoji = {
    [SessionStatus.COLLECTING_MEDIA]: '📤',
    [SessionStatus.ASKING_QUESTIONS]: '💬',
    [SessionStatus.GENERATING_DRAFTS]: '🤖',
    [SessionStatus.AWAITING_APPROVAL]: '👀',
    [SessionStatus.APPROVED]: '✅',
    [SessionStatus.PUBLISHING]: '🚀',
  };

  await ctx.reply(
    `${statusEmoji[session.status]} Current Status: ${session.status}\n\n` +
    `📁 Media uploaded: ${session.mediaAssets.length}\n` +
    `📝 Drafts: ${session.draftPackages.length}\n` +
    `🕒 Started: ${session.createdAt.toLocaleString()}`
  );
}

async function getOrCreateBrandProfile(telegramId: string) {
  return database.brandProfile.upsert({
    where: { telegramId },
    update: {},
    create: {
      userId: telegramId,
      telegramId,
      defaultHashtags: [],
      preferredPlatforms: ['YOUTUBE', 'FACEBOOK'],
      autoPublish: false,
    },
  });
}
