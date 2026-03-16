import { Context } from 'telegraf';
import { database } from '@ai-agent/database';
import { queueService } from '@ai-agent/queue';
import { contentAgent } from '@ai-agent/ai';
import { SessionStatus, JobType, PublishYouTubeJobData, PublishFacebookJobData } from '@ai-agent/core';
import { logger } from '@ai-agent/observability';

/**
 * Callback Query Handler
 * 
 * Handles inline button clicks from draft preview message
 * 
 * Callback data format:
 * - approve:{draftPackageId}
 * - revise:{draftPackageId}
 * - cancel:{sessionId}
 */
export async function handleCallbackQuery(ctx: Context) {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  if (!ctx.from) return;

  const callbackData = ctx.callbackQuery.data;
  logger.info({ callbackData, userId: ctx.from.id }, 'Received callback query');

  try {
    // Parse callback data
    const [action, id] = callbackData.split(':');

    switch (action) {
      case 'approve':
        await handleApprove(ctx, id);
        break;
      case 'revise':
        await handleRevise(ctx, id);
        break;
      case 'cancel':
        await handleCancel(ctx, id);
        break;
      default:
        logger.warn({ callbackData }, 'Unknown callback action');
        await ctx.answerCbQuery('Unknown action');
    }
  } catch (error) {
    logger.error({ error, callbackData }, 'Failed to handle callback query');
    await ctx.answerCbQuery('Something went wrong. Please try again.');
    await ctx.reply('⚠️ Failed to process your request. Please try /status or /cancel');
  }
}

/**
 * Handle "Approve" button click
 */
async function handleApprove(ctx: Context, draftPackageId: string) {
  logger.info({ draftPackageId }, 'Handling approve callback');

  // Get draft package
  const draftPackage = await database.draftPackage.findUnique({
    where: { id: draftPackageId },
    include: {
      session: {
        include: {
          brandProfile: {
            include: {
              user: true,
              connectedAccounts: true,
            },
          },
          mediaAssets: true,
        },
      },
    },
  });

  if (!draftPackage) {
    logger.error({ draftPackageId }, 'Draft package not found');
    await ctx.answerCbQuery('Draft not found');
    return;
  }

  const session = draftPackage.session;

  // Check if user owns this session
  if (session.brandProfile.user.telegramId !== ctx.from!.id.toString()) {
    await ctx.answerCbQuery('You do not have permission to approve this draft');
    return;
  }

  // Check if session is in correct state
  if (session.status !== SessionStatus.AWAITING_APPROVAL) {
    await ctx.answerCbQuery(`Session is already ${session.status}`);
    return;
  }

  // Update draft package status
  await database.draftPackage.update({
    where: { id: draftPackageId },
    data: { status: 'APPROVED' },
  });

  // Update session status
  await database.contentSession.update({
    where: { id: session.id },
    data: { status: SessionStatus.APPROVED },
  });

  await ctx.answerCbQuery('✅ Approved!');
  await ctx.reply('✅ Great! Publishing to YouTube and Facebook...');

  // Check for connected accounts
  const youtubeAccount = session.brandProfile.connectedAccounts.find(
    (acc) => acc.platform === 'YOUTUBE'
  );
  const facebookAccount = session.brandProfile.connectedAccounts.find(
    (acc) => acc.platform === 'FACEBOOK'
  );

  if (!youtubeAccount && !facebookAccount) {
    await ctx.reply(
      '⚠️ No connected accounts found.\n\n' +
      'Please connect your YouTube and/or Facebook accounts first:\n' +
      '/connect_youtube\n' +
      '/connect_facebook'
    );
    
    // Update session status to failed
    await database.contentSession.update({
      where: { id: session.id },
      data: { status: SessionStatus.FAILED },
    });
    
    return;
  }

  // Create PublishJobs
  const publishJobs: Array<{ platform: string; jobId: string }> = [];

  if (youtubeAccount) {
    const youtubeJob = await database.publishJob.create({
      data: {
        sessionId: session.id,
        draftPackageId: draftPackage.id,
        platform: 'YOUTUBE',
        status: 'PENDING',
      },
    });

    const jobData: PublishYouTubeJobData = {
      sessionId: session.id,
      brandProfileId: session.brandProfileId,
      draftPackageId: draftPackage.id,
      publishJobId: youtubeJob.id,
      connectedAccountId: youtubeAccount.id,
    };

    const queueJobId = await queueService.enqueue(JobType.PUBLISH_YOUTUBE, jobData);

    publishJobs.push({ platform: 'YouTube', jobId: queueJobId });

    logger.info({ publishJobId: youtubeJob.id, queueJobId }, 'YouTube publish job created');
  }

  if (facebookAccount) {
    const facebookJob = await database.publishJob.create({
      data: {
        sessionId: session.id,
        draftPackageId: draftPackage.id,
        platform: 'FACEBOOK',
        status: 'PENDING',
      },
    });

    const jobData: PublishFacebookJobData = {
      sessionId: session.id,
      brandProfileId: session.brandProfileId,
      draftPackageId: draftPackage.id,
      publishJobId: facebookJob.id,
      connectedAccountId: facebookAccount.id,
    };

    const queueJobId = await queueService.enqueue(JobType.PUBLISH_FACEBOOK, jobData);

    publishJobs.push({ platform: 'Facebook', jobId: queueJobId });

    logger.info({ publishJobId: facebookJob.id, queueJobId }, 'Facebook publish job created');
  }

  // Update session status to PUBLISHING
  await database.contentSession.update({
    where: { id: session.id },
    data: { status: SessionStatus.PUBLISHING },
  });

  const platformsList = publishJobs.map((j) => j.platform).join(' and ');
  await ctx.reply(
    `🚀 Publishing to ${platformsList}...\n\n` +
    'You will be notified when your content is live!'
  );

  logger.info({ sessionId: session.id, publishJobs }, 'Publish jobs enqueued');
}

/**
 * Handle "Revise" button click
 */
async function handleRevise(ctx: Context, draftPackageId: string) {
  logger.info({ draftPackageId }, 'Handling revise callback');

  // Get draft package
  const draftPackage = await database.draftPackage.findUnique({
    where: { id: draftPackageId },
    include: {
      session: {
        include: {
          brandProfile: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!draftPackage) {
    await ctx.answerCbQuery('Draft not found');
    return;
  }

  // Check ownership
  if (draftPackage.session.brandProfile.user.telegramId !== ctx.from!.id.toString()) {
    await ctx.answerCbQuery('You do not have permission to revise this draft');
    return;
  }

  // Update draft package status
  await database.draftPackage.update({
    where: { id: draftPackageId },
    data: { status: 'NEEDS_REVISION' },
  });

  await ctx.answerCbQuery('✏️ Revision mode activated');
  await ctx.reply(
    '✏️ What would you like me to change?\n\n' +
    'Be specific, for example:\n' +
    '• "Make it more casual and friendly"\n' +
    '• "Change the hashtags to focus on fitness"\n' +
    '• "Shorten the YouTube description"\n' +
    '• "Add a stronger call-to-action"\n\n' +
    'Or type /cancel to cancel the session.'
  );

  logger.info({ draftPackageId }, 'Revision mode activated');
}

/**
 * Handle "Cancel" button click
 */
async function handleCancel(ctx: Context, sessionId: string) {
  logger.info({ sessionId }, 'Handling cancel callback');

  // Get session
  const session = await database.contentSession.findUnique({
    where: { id: sessionId },
    include: {
      brandProfile: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!session) {
    await ctx.answerCbQuery('Session not found');
    return;
  }

  // Check ownership
  if (session.brandProfile.user.telegramId !== ctx.from!.id.toString()) {
    await ctx.answerCbQuery('You do not have permission to cancel this session');
    return;
  }

  // Update session status
  await database.contentSession.update({
    where: { id: sessionId },
    data: { status: SessionStatus.CANCELLED },
  });

  await ctx.answerCbQuery('❌ Cancelled');
  await ctx.reply(
    '❌ Session cancelled.\n\n' +
    'Upload a new photo or video to start again!'
  );

  logger.info({ sessionId }, 'Session cancelled');
}
