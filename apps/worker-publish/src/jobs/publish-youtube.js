"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishYouTubeJob = publishYouTubeJob;
const database_1 = require("@ai-agent/database");
const publishing_1 = require("@ai-agent/publishing");
const media_1 = require("@ai-agent/media");
const observability_1 = require("@ai-agent/observability");
const config_1 = require("@ai-agent/config");
const core_1 = require("@ai-agent/core");
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
async function publishYouTubeJob(job) {
    const { sessionId, publishJobId, connectedAccountId, draftPackageId } = job.data;
    observability_1.logger.info({ sessionId, publishJobId, jobId: job.id }, 'Starting YouTube publish');
    try {
        // 1. Get PublishJob
        const publishJob = await database_1.database.publishJob.findUnique({
            where: { id: publishJobId },
        });
        if (!publishJob) {
            throw new Error(`PublishJob not found: ${publishJobId}`);
        }
        // 2. Idempotency check
        if (publishJob.status === 'COMPLETED' && publishJob.platformPostId) {
            observability_1.logger.info({ publishJobId, videoId: publishJob.platformPostId }, 'Video already published, skipping');
            return { success: true, alreadyPublished: true };
        }
        // Update status to UPLOADING
        await database_1.database.publishJob.update({
            where: { id: publishJobId },
            data: { status: 'UPLOADING' },
        });
        // 3. Get related data
        const [draftPackage, connectedAccount, session] = await Promise.all([
            database_1.database.draftPackage.findUnique({ where: { id: draftPackageId } }),
            database_1.database.connectedAccount.findUnique({ where: { id: connectedAccountId } }),
            database_1.database.contentSession.findUnique({
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
        observability_1.logger.info({ storageUrl: mediaAsset.storageUrl }, 'Downloading video from S3');
        const videoBuffer = await downloadFromS3(mediaAsset.storageUrl);
        // 6. Check/refresh token
        const accessToken = await getValidAccessToken(connectedAccount);
        // 7. Publish to YouTube
        const publisher = new publishing_1.YouTubePublisher(config_1.config.youtube.clientId, config_1.config.youtube.clientSecret, config_1.config.youtube.redirectUri);
        observability_1.logger.info({ videoId: mediaAsset.id, title: draftPackage.youtubeTitle }, 'Publishing to YouTube');
        const result = await publisher.publish({
            mediaFile: {
                buffer: videoBuffer,
                mimeType: mediaAsset.mimeType,
                filename: mediaAsset.filename,
                duration: mediaAsset.duration,
            },
            content: {
                title: draftPackage.youtubeTitle,
                description: draftPackage.youtubeDescription,
                hashtags: draftPackage.youtubeHashtags,
            },
            options: {
                privacy: 'public',
            },
            idempotencyKey: publishJobId,
        }, accessToken);
        observability_1.logger.info({ result }, 'YouTube publish successful');
        // 8. Update PublishJob
        await database_1.database.publishJob.update({
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
    }
    catch (error) {
        observability_1.logger.error({ sessionId, publishJobId, error }, 'YouTube publish failed');
        // Handle specific errors
        if (error instanceof publishing_1.PublisherError) {
            await handlePublisherError(publishJobId, sessionId, error);
        }
        else {
            // Generic error
            await database_1.database.publishJob.update({
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
async function downloadFromS3(storageUrl) {
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
async function getValidAccessToken(connectedAccount) {
    // Check if token expired
    const now = new Date();
    if (connectedAccount.expiresAt && connectedAccount.expiresAt < now) {
        observability_1.logger.info({ accountId: connectedAccount.id }, 'Access token expired, refreshing');
        // Refresh token using publisher
        const publisher = new publishing_1.YouTubePublisher(config_1.config.youtube.clientId, config_1.config.youtube.clientSecret, config_1.config.youtube.redirectUri);
        const refreshResult = await publisher.refreshAccessToken(connectedAccount.refreshToken);
        // Update database
        await database_1.database.connectedAccount.update({
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
async function handlePublisherError(publishJobId, sessionId, error) {
    const errorData = {
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
    await database_1.database.publishJob.update({
        where: { id: publishJobId },
        data: errorData,
    });
    // If quota exceeded, wait until tomorrow
    if (error.type === publishing_1.PublisherErrorType.QUOTA_EXCEEDED) {
        observability_1.logger.warn({ publishJobId }, 'YouTube quota exceeded, will retry tomorrow');
        // BullMQ will retry with configured delay
    }
}
/**
 * Check if all publish jobs completed and send notification
 */
async function checkCompletionAndNotify(sessionId, telegramChatId) {
    const allJobs = await database_1.database.publishJob.findMany({
        where: { sessionId },
    });
    const completed = allJobs.filter((j) => j.status === 'COMPLETED');
    const failed = allJobs.filter((j) => j.status === 'FAILED');
    const pending = allJobs.filter((j) => j.status === 'PENDING' || j.status === 'UPLOADING');
    // All completed
    if (completed.length === allJobs.length) {
        await database_1.database.contentSession.update({
            where: { id: sessionId },
            data: { status: core_1.SessionStatus.PUBLISHED },
        });
        const youtubeUrl = completed.find((j) => j.platform === 'YOUTUBE')?.platformUrl;
        const facebookUrl = completed.find((j) => j.platform === 'FACEBOOK')?.platformUrl;
        await media_1.telegramNotification.sendPublishConfirmation({
            chatId: telegramChatId,
            youtubeUrl,
            facebookUrl,
        });
        observability_1.logger.info({ sessionId }, 'All publish jobs completed, session marked as PUBLISHED');
    }
    // Partial success (at least one succeeded, some failed)
    else if (completed.length > 0 && failed.length > 0 && pending.length === 0) {
        await database_1.database.contentSession.update({
            where: { id: sessionId },
            data: { status: core_1.SessionStatus.PUBLISHED },
        });
        const successPlatforms = completed.map((j) => j.platform).join(', ');
        const failedPlatforms = failed.map((j) => j.platform).join(', ');
        await media_1.telegramNotification.sendMessage({
            chatId: telegramChatId,
            text: `✅ Published to: ${successPlatforms}\n` +
                `❌ Failed: ${failedPlatforms}\n\n` +
                `${completed.map((j) => `${j.platform}: ${j.platformUrl}`).join('\n')}`,
        });
        observability_1.logger.info({ sessionId, completed: completed.length, failed: failed.length }, 'Partial publish success');
    }
}
//# sourceMappingURL=publish-youtube.js.map