import { Job } from 'bullmq';
import { database } from '@ai-agent/database';
import { FacebookPublisher, PublisherError, PublisherErrorType } from '@ai-agent/publishing';
import { telegramNotification } from '@ai-agent/media';
import { logger } from '@ai-agent/observability';
import { config } from '@ai-agent/config';
import { PublishFacebookJobData, SessionStatus } from '@ai-agent/core';

/**
 * Publish to Facebook Job
 * 
 * Similar to YouTube job but publishes to Facebook Page
 */
export async function publishFacebookJob(job: Job<PublishFacebookJobData>) {
  const { sessionId, publishJobId, connectedAccountId, draftPackageId } = job.data;

  logger.info({ sessionId, publishJobId, jobId: job.id }, 'Starting Facebook publish');

  try {
    // Get PublishJob
    const publishJob = await database.publishJob.findUnique({
      where: { id: publishJobId },
    });

    if (!publishJob) {
      throw new Error(`PublishJob not found: ${publishJobId}`);
    }

    // Idempotency check
    if (publishJob.status === 'COMPLETED' && publishJob.platformPostId) {
      logger.info({ publishJobId, postId: publishJob.platformPostId }, 'Post already published, skipping');
      return { success: true, alreadyPublished: true };
    }

    // Update status
    await database.publishJob.update({
      where: { id: publishJobId },
      data: { status: 'UPLOADING' },
    });

    // Get related data
    const [draftPackage, connectedAccount, session] = await Promise.all([
      database.draftPackage.findUnique({ where: { id: draftPackageId } }),
      database.connectedAccount.findUnique({ where: { id: connectedAccountId } }),
      database.contentSession.findUnique({
        where: { id: sessionId },
        include: {
          brandProfile: { include: { user: true } },
          mediaAssets: true,
        },
      }),
    ]);

    if (!draftPackage || !connectedAccount || !session) {
      throw new Error('Related data not found');
    }

    // Get media asset
    const mediaAsset = session.mediaAssets.find((m) => m.type === 'VIDEO');
    if (!mediaAsset || !mediaAsset.storageUrl) {
      throw new Error('No video found in session');
    }

    // Download video
    logger.info({ storageUrl: mediaAsset.storageUrl }, 'Downloading video');
    const videoBuffer = await downloadFromS3(mediaAsset.storageUrl);

    // Get valid token
    const accessToken = await getValidAccessToken(connectedAccount);

    // Publish to Facebook
    const publisher = new FacebookPublisher(
      config.facebook.appId,
      config.facebook.appSecret,
      config.facebook.redirectUri
    );

    logger.info({ videoId: mediaAsset.id }, 'Publishing to Facebook');

    const result = await publisher.publish(
      {
        mediaFile: {
          buffer: videoBuffer,
          mimeType: mediaAsset.mimeType,
          filename: mediaAsset.filename,
          duration: mediaAsset.duration,
        },
        content: {
          description: draftPackage.facebookText,
          hashtags: draftPackage.facebookHashtags,
        },
        idempotencyKey: publishJobId,
      },
      accessToken
    );

    logger.info({ result }, 'Facebook publish successful');

    // Update PublishJob
    await database.publishJob.update({
      where: { id: publishJobId },
      data: {
        status: 'COMPLETED',
        platformPostId: result.platformPostId,
        platformUrl: result.platformUrl,
        publishedAt: new Date(),
      },
    });

    // Check completion and notify
    await checkCompletionAndNotify(sessionId, session.brandProfile.user.telegramId);

    return { success: true, data: result };
  } catch (error: any) {
    logger.error({ sessionId, publishJobId, error }, 'Facebook publish failed');

    if (error instanceof PublisherError) {
      await handlePublisherError(publishJobId, error);
    } else {
      await database.publishJob.update({
        where: { id: publishJobId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });
    }

    throw error;
  }
}

async function downloadFromS3(storageUrl: string): Promise<Buffer> {
  const response = await fetch(storageUrl);
  if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
  return Buffer.from(await response.arrayBuffer());
}

async function getValidAccessToken(connectedAccount: any): Promise<string> {
  const now = new Date();
  if (connectedAccount.expiresAt && connectedAccount.expiresAt < now) {
    const publisher = new FacebookPublisher(
      config.facebook.appId,
      config.facebook.appSecret,
      config.facebook.redirectUri
    );

    const refreshResult = await publisher.refreshAccessToken(connectedAccount.refreshToken);

    await database.connectedAccount.update({
      where: { id: connectedAccount.id },
      data: {
        accessToken: refreshResult.accessToken,
        expiresAt: refreshResult.expiresAt,
      },
    });

    return refreshResult.accessToken;
  }

  return connectedAccount.accessToken;
}

async function handlePublisherError(publishJobId: string, error: PublisherError): Promise<void> {
  await database.publishJob.update({
    where: { id: publishJobId },
    data: {
      status: error.retryable ? 'PENDING' : 'FAILED',
      errorMessage: error.message,
      errorType: error.type,
    },
  });
}

async function checkCompletionAndNotify(sessionId: string, telegramChatId: string): Promise<void> {
  const allJobs = await database.publishJob.findMany({ where: { sessionId } });
  const completed = allJobs.filter((j) => j.status === 'COMPLETED');
  const failed = allJobs.filter((j) => j.status === 'FAILED');

  if (completed.length === allJobs.length) {
    await database.contentSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.PUBLISHED },
    });

    await telegramNotification.sendPublishConfirmation({
      chatId: telegramChatId,
      youtubeUrl: completed.find((j) => j.platform === 'YOUTUBE')?.platformUrl,
      facebookUrl: completed.find((j) => j.platform === 'FACEBOOK')?.platformUrl,
    });
  } else if (completed.length > 0 && failed.length > 0) {
    await database.contentSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.PUBLISHED },
    });

    await telegramNotification.sendMessage({
      chatId: telegramChatId,
      text:
        `✅ ${completed.map((j) => `${j.platform}: ${j.platformUrl}`).join('\n')}\n` +
        `❌ Failed: ${failed.map((j) => j.platform).join(', ')}`,
    });
  }
}
