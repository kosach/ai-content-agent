"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDraftsJob = generateDraftsJob;
const database_1 = require("@ai-agent/database");
const ai_1 = require("@ai-agent/ai");
const media_1 = require("@ai-agent/media");
const observability_1 = require("@ai-agent/observability");
const core_1 = require("@ai-agent/core");
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
async function generateDraftsJob(job) {
    const { sessionId, brandProfileId, userIntent, tone, mediaAnalysis } = job.data;
    observability_1.logger.info({ sessionId, jobId: job.id }, 'Starting draft generation');
    try {
        // 1. Get session from database
        const session = await database_1.database.contentSession.findUnique({
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
        observability_1.logger.info({ sessionId, userIntent, tone }, 'Generating drafts with Gemini');
        // 2. Generate drafts using ContentAgent (Gemini)
        const drafts = await ai_1.contentAgent.generateDrafts({
            mediaAnalysis,
            userIntent,
            tone,
            brandVoice: session.brandProfile.brandVoice || undefined,
            brandHashtags: session.brandProfile.defaultHashtags || undefined,
        });
        observability_1.logger.info({ sessionId, drafts }, 'Drafts generated successfully');
        // 3. Create DraftPackage in database
        const draftPackage = await database_1.database.draftPackage.create({
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
        observability_1.logger.info({ sessionId, draftPackageId: draftPackage.id }, 'DraftPackage created');
        // 4. Update session status
        await database_1.database.contentSession.update({
            where: { id: sessionId },
            data: { status: core_1.SessionStatus.AWAITING_APPROVAL },
        });
        observability_1.logger.info({ sessionId }, 'Session status updated to AWAITING_APPROVAL');
        // 5. Send draft preview to user via Telegram
        const telegramChatId = session.brandProfile.user.telegramId;
        await media_1.telegramNotification.sendDraftPreview({
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
        observability_1.logger.info({ sessionId, telegramChatId }, 'Draft preview sent to user');
        return {
            success: true,
            data: {
                sessionId,
                draftPackageId: draftPackage.id,
                drafts,
            },
        };
    }
    catch (error) {
        observability_1.logger.error({ sessionId, error }, 'Draft generation failed');
        // Mark session as failed
        await database_1.database.contentSession.update({
            where: { id: sessionId },
            data: { status: core_1.SessionStatus.FAILED },
        });
        // Notify user about error
        try {
            const session = await database_1.database.contentSession.findUnique({
                where: { id: sessionId },
                include: {
                    brandProfile: {
                        include: { user: true },
                    },
                },
            });
            if (session) {
                await media_1.telegramNotification.sendError({
                    chatId: session.brandProfile.user.telegramId,
                    errorMessage: 'Failed to generate content drafts',
                    context: 'Draft Generation',
                });
            }
        }
        catch (notificationError) {
            observability_1.logger.error({ notificationError }, 'Failed to send error notification');
        }
        throw error;
    }
}
//# sourceMappingURL=generate-drafts.js.map