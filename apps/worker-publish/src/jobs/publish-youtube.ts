import { Job } from 'bullmq';
import { database } from '@ai-agent/database';
import { s3Storage } from '@ai-agent/storage';
import { YouTubePublisher, PublisherError, PublisherErrorType } from '@ai-agent/publishing';
import { telegramNotification } from '@ai-agent/media';
import { logger } from '@ai-agent/observability';
import { config } from '@ai-agent/config';
import { PublishYouTubeJobData, SessionStatus } from '@ai-agent/core';

/**
 * Publish to YouTube Job
 * 
 * Responsibility: Upload video to YouTube as Short
 * 1. Get PublishJob, DraftPackage, MediaAsset, ConnectedAccount
 * 2. Check if already published (idempotency)
 * 3. Download video from S3
 * 4. Call YouTubePublisher.publish()
 * 5. Update PublishJob with result
 * 6. Check if all jobs for session completed
 * 7. Send notification to user
 */
export async function publishYouTubeJob(job: Job<PublishYouTubeJobData>) {
  const { sessionId, publishJobId, connectedAccountId, draftPackageId } = job.data;

  logger.info({ sessionId, publishJobId, jobId: job.id }, 'Starting YouTube publish');

  try {
    // 1. Get PublishJob
    const publishJob = await database.publishJob.findUnique({
      where: { id: publishJobId },
    });

    if (!publishJob) {
      throw new Error(`PublishJob not found: ${publishJobId}`);
    }

    // 2. Idempotency check
    if (publishJob.status === 'COMPLETED' && publishJob.platformPostId) {
      logger.info({ publishJobId, videoId: publishJob.platformPostId }, 'Video already published, skipping');
      return { success: true, alreadyPublished: true };
    }

    // Update status to UPLOADING
    await database.publishJob.update({
      where: { id: publishJobId },
      data: { status: 'UPLOADING' },
    });

    // 3. Get related data
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

    // 4. Get media asset (first video)
    const mediaAsset = session.mediaAssets.find((m) => m.type === 'VIDEO');
    if (!mediaAsset || !mediaAsset.storageUrl) {
      throw new Error('No video found in session');
    }

    // 5. Download video from S3
    logger.info({ storageUrl: mediaAsset.storageUrl }, 'Downloading video from S3');

    const videoBuffer = await downloadFromS3(mediaAsset.storageUrl);

    // 6. Check/refresh token
    const accessToken = await getValidAccessToken(connectedAccount);

    // 7. Publish to YouTube
    const publisher = new YouTubePublisher(
      config.youtube.clientId!,
      config.youtube.clientSecret!,
      config.youtube.redirectUri!
    );

    logger.info({ videoId: mediaAsset.id, title: draftPackage.youtubeTitle }, 'Publishing to YouTube');

    const result = await publisher.publish(
      {
        mediaFile: {
          buffer: videoBuffer,
          mimeType: mediaAsset.mimeType,
          filename: mediaAsset.filename,
          duration: mediaAsset.duration || undefined,
        },
        content: {
          title: draftPackage.youtubeTitle || undefined,
          description: draftPackage.youtubeDescription || undefined,
          hashtags: draftPackage.youtubeHashtags || undefined,
        },
        options: {
          privacy: 'public',
        },
        idempotencyKey: publishJobId,
      },
      accessToken
    );

    logger.info({ result }, 'YouTube publish successful');

    // 8. Update PublishJob
    await database.publishJob.update({
      where: { id: publishJobId },
      data: {
        status: 'COMPLETED',
        platformPostId: result.platformPostId,
        platformUrl: result.platformUrl,
        publishedAt: new Date(),
      },
    });

    // 9. Check if all jobs completed and send notification
    await checkCompletionAndNotify(sessionId, session.brandProfile.user.telegramId);

    return { success: true, data: result };
  } catch (error: any) {
    logger.error({ sessionId, publishJobId, error }, 'YouTube publish failed');

    // Handle specific errors
    if (error instanceof PublisherError) {
      await handlePublisherError(publishJobId, sessionId, error);
    } else {
      // Generic error
      await database.publishJob.update({
        where: { id: publishJobId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          errorStack: error.stack,
        },
      });
    }

    throw error;
  }
}

/**
 * Download video from S3 URL
 */
async function downloadFromS3(storageUrl: string): Promise<Buffer> {
  // Extract key from URL
  const url = new URL(storageUrl);
  const key = url.pathname.substring(1); // Remove leading /

  // For now, use fetch (in production, use S3 SDK)
  const response = await fetch(storageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download from S3: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken(connectedAccount: any): Promise<string> {
  // Check if token expired
  const now = new Date();
  if (connectedAccount.expiresAt && connectedAccount.expiresAt < now) {
    logger.info({ accountId: connectedAccount.id }, 'Access token expired, refreshing');

    // Refresh token using publisher
    const publisher = new YouTubePublisher(
      config.youtube.clientId!,
      config.youtube.clientSecret!,
      config.youtube.redirectUri!
    );

    const refreshResult = await publisher.refreshAccessToken(connectedAccount.refreshToken!);

    // Update database
    await database.connectedAccount.update({
      where: { id: connectedAccount.id },
      data: {
        accessToken: refreshResult.accessToken,
        refreshToken: refreshResult.refreshToken || connectedAccount.refreshToken,
        expiresAt: refreshResult.expiresAt,
      },
    });

    return refreshResult.accessToken;
  }

  return connectedAccount.accessToken;
}

/**
 * Handle publisher-specific errors
 */
async function handlePublisherError(
  publishJobId: string,
  sessionId: string,
  error: PublisherError
): Promise<void> {
  const errorData: any = {
    status: 'FAILED',
    errorMessage: error.message,
    errorType: error.type,
  };

  // If retryable, don't mark as FAILED yet
  if (error.retryable) {
    errorData.status = 'PENDING';
    
    if (error.retryAfter) {
      errorData.retryAfter = error.retryAfter;
    }
  }

  await database.publishJob.update({
    where: { id: publishJobId },
    data: errorData,
  });

  // If quota exceeded, wait until tomorrow
  if (error.type === PublisherErrorType.QUOTA_EXCEEDED) {
    logger.warn({ publishJobId }, 'YouTube quota exceeded, will retry tomorrow');
    // BullMQ will retry with configured delay
  }
}

/**
 * Check if all publish jobs completed and send notification
 */
async function checkCompletionAndNotify(sessionId: string, telegramChatId: string): Promise<void> {
  const allJobs = await database.publishJob.findMany({
    where: { sessionId },
  });

  const completed = allJobs.filter((j) => j.status === 'COMPLETED');
  const failed = allJobs.filter((j) => j.status === 'FAILED');
  const pending = allJobs.filter((j) => j.status === 'PENDING' || j.status === 'UPLOADING');

  // All completed
  if (completed.length === allJobs.length) {
    await database.contentSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.PUBLISHED },
    });

    const youtubeUrl = completed.find((j) => j.platform === 'YOUTUBE')?.platformUrl;
    const facebookUrl = completed.find((j) => j.platform === 'FACEBOOK')?.platformUrl;

    await telegramNotification.sendPublishConfirmation({
      chatId: telegramChatId,
      youtubeUrl: youtubeUrl || undefined,
      facebookUrl: facebookUrl || undefined,
    });

    logger.info({ sessionId }, 'All publish jobs completed, session marked as PUBLISHED');
  }
  // Partial success (at least one succeeded, some failed)
  else if (completed.length > 0 && failed.length > 0 && pending.length === 0) {
    await database.contentSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.PUBLISHED },
    });

    const successPlatforms = completed.map((j) => j.platform).join(', ');
    const failedPlatforms = failed.map((j) => j.platform).join(', ');

    await telegramNotification.sendMessage({
      chatId: telegramChatId,
      text:
        `✅ Published to: ${successPlatforms}\n` +
        `❌ Failed: ${failedPlatforms}\n\n` +
        `${completed.map((j) => `${j.platform}: ${j.platformUrl}`).join('\n')}`,
    });

    logger.info({ sessionId, completed: completed.length, failed: failed.length }, 'Partial publish success');
  }
}
