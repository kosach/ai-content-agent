"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHandlers = registerHandlers;
const database_1 = require("@ai-agent/database");
const queue_1 = require("@ai-agent/queue");
const ai_1 = require("@ai-agent/ai");
const core_1 = require("@ai-agent/core");
const observability_1 = require("@ai-agent/observability");
const callback_1 = require("./callback");
const connect_1 = require("./connect");
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
function registerHandlers(bot) {
    // Core commands
    bot.command('start', handleStart);
    bot.command('cancel', handleCancel);
    bot.command('status', handleStatus);
    // OAuth commands
    bot.command('connect_youtube', connect_1.handleConnectYouTube);
    bot.command('connect_facebook', connect_1.handleConnectFacebook);
    bot.command('accounts', connect_1.handleAccounts);
    bot.command('disconnect', connect_1.handleDisconnect);
    // Media handlers
    bot.on('photo', handlePhoto);
    bot.on('video', handleVideo);
    bot.on('text', handleText);
    bot.on('callback_query', callback_1.handleCallbackQuery);
}
async function handleStart(ctx) {
    if (!ctx.from)
        return;
    try {
        // Get or create User + BrandProfile
        const user = await database_1.database.user.upsert({
            where: { telegramId: ctx.from.id.toString() },
            update: {},
            create: {
                telegramId: ctx.from.id.toString(),
                username: ctx.from.username,
                firstName: ctx.from.first_name,
                lastName: ctx.from.last_name,
            },
        });
        await database_1.database.brandProfile.upsert({
            where: { userId: user.id },
            update: {},
            create: {
                userId: user.id,
                brandName: ctx.from.first_name || undefined,
                defaultHashtags: [],
                autoPublish: false,
            },
        });
        await ctx.reply('👋 Welcome to AI Content Agent!\n\n' +
            'I help you create YouTube Shorts and Facebook posts from your videos and photos.\n\n' +
            '📹 Upload a video or 📸 photo to start!\n\n' +
            'Commands:\n' +
            '/cancel - Cancel current session\n' +
            '/status - Check session status');
        observability_1.logger.info({ userId: user.id }, 'User started bot');
    }
    catch (error) {
        observability_1.logger.error({ error, telegramId: ctx.from.id }, 'Failed to start bot');
        await ctx.reply('Sorry, something went wrong. Please try again.');
    }
}
async function handlePhoto(ctx) {
    if (!ctx.from || !ctx.message || !('photo' in ctx.message))
        return;
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    await handleMediaUpload(ctx, {
        type: core_1.MediaType.PHOTO,
        fileId: photo.file_id,
        fileSize: photo.file_size || 0,
        width: photo.width,
        height: photo.height,
    });
}
async function handleVideo(ctx) {
    if (!ctx.from || !ctx.message || !('video' in ctx.message))
        return;
    const video = ctx.message.video;
    await handleMediaUpload(ctx, {
        type: core_1.MediaType.VIDEO,
        fileId: video.file_id,
        fileSize: video.file_size || 0,
        width: video.width,
        height: video.height,
        duration: video.duration,
        thumbnail: video.thumbnail?.file_id,
    });
}
async function handleMediaUpload(ctx, media) {
    if (!ctx.from)
        return;
    try {
        const user = await getOrCreateUser(ctx.from);
        const brandProfile = await getBrandProfile(user.id);
        // Get or create active session
        let session = await database_1.database.contentSession.findFirst({
            where: {
                brandProfileId: brandProfile.id,
                status: {
                    in: [core_1.SessionStatus.COLLECTING_MEDIA, core_1.SessionStatus.ASKING_QUESTIONS],
                },
            },
        });
        if (!session) {
            session = await database_1.database.contentSession.create({
                data: {
                    brandProfileId: brandProfile.id,
                    status: core_1.SessionStatus.COLLECTING_MEDIA,
                },
            });
        }
        // Save media asset
        const mediaAsset = await database_1.database.mediaAsset.create({
            data: {
                sessionId: session.id,
                type: media.type,
                telegramFileId: media.fileId,
                filename: `${media.fileId}.${media.type === core_1.MediaType.VIDEO ? 'mp4' : 'jpg'}`,
                mimeType: media.type === core_1.MediaType.VIDEO ? 'video/mp4' : 'image/jpeg',
                fileSize: media.fileSize,
                width: media.width,
                height: media.height,
                duration: media.duration,
                thumbnail: media.thumbnail,
            },
        });
        // Save user message
        await database_1.database.sessionMessage.create({
            data: {
                sessionId: session.id,
                role: core_1.MessageRole.USER,
                content: `[Uploaded ${media.type}]`,
                metadata: {
                    fileId: media.fileId,
                    telegramMessageId: ctx.message?.message_id,
                },
            },
        });
        // Enqueue ANALYZE_MEDIA job with proper payload
        const jobData = {
            sessionId: session.id,
            brandProfileId: brandProfile.id,
            mediaAssetId: mediaAsset.id,
            mediaType: media.type,
            telegramFileId: media.fileId,
        };
        await queue_1.queueService.enqueue(core_1.JobType.ANALYZE_MEDIA, jobData);
        // Update session status
        await database_1.database.contentSession.update({
            where: { id: session.id },
            data: { status: core_1.SessionStatus.ASKING_QUESTIONS },
        });
        // Get next question from content agent
        const mediaCount = await database_1.database.mediaAsset.count({
            where: { sessionId: session.id },
        });
        const agentResponse = await ai_1.contentAgent.getNextQuestion({
            sessionId: session.id,
            status: session.status,
            mediaCount,
            hasUserIntent: !!session.userIntent,
            hasTone: !!session.tone,
            messages: [],
        });
        // Save agent response
        await database_1.database.sessionMessage.create({
            data: {
                sessionId: session.id,
                role: core_1.MessageRole.AGENT,
                content: agentResponse.message,
            },
        });
        await ctx.reply(agentResponse.message);
        observability_1.logger.info({ sessionId: session.id, mediaType: media.type }, 'Media uploaded');
    }
    catch (error) {
        observability_1.logger.error({ error }, 'Failed to handle media upload');
        await ctx.reply('Failed to process media. Please try again.');
    }
}
async function handleText(ctx) {
    if (!ctx.from || !ctx.message || !('text' in ctx.message))
        return;
    const text = ctx.message.text;
    try {
        const user = await getOrCreateUser(ctx.from);
        const brandProfile = await getBrandProfile(user.id);
        // Get active session
        const session = await database_1.database.contentSession.findFirst({
            where: {
                brandProfileId: brandProfile.id,
                status: {
                    in: [
                        core_1.SessionStatus.ASKING_QUESTIONS,
                        core_1.SessionStatus.AWAITING_APPROVAL,
                    ],
                },
            },
            include: {
                mediaAssets: true,
                messages: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!session) {
            await ctx.reply('No active session. Upload a photo or video to start!');
            return;
        }
        // Save user message
        await database_1.database.sessionMessage.create({
            data: {
                sessionId: session.id,
                role: core_1.MessageRole.USER,
                content: text,
                metadata: { telegramMessageId: ctx.message.message_id },
            },
        });
        // Route based on session status
        if (session.status === core_1.SessionStatus.AWAITING_APPROVAL) {
            // Check if draft is in revision mode
            const draftPackage = await database_1.database.draftPackage.findFirst({
                where: { sessionId: session.id },
                orderBy: { createdAt: 'desc' },
            });
            if (draftPackage?.status === 'NEEDS_REVISION') {
                await handleRevisionRequest(ctx, session, draftPackage, text);
            }
            else {
                await handleApproval(ctx, session, text);
            }
        }
        else {
            await handleConversation(ctx, session, text);
        }
    }
    catch (error) {
        observability_1.logger.error({ error }, 'Failed to handle text message');
        await ctx.reply('Sorry, something went wrong. Please try again.');
    }
}
async function handleConversation(ctx, session, text) {
    // Extract context from user's message
    const extracted = await ai_1.contentAgent.extractContext(text, {
        sessionId: session.id,
        status: session.status,
        mediaCount: session.mediaAssets.length,
        hasUserIntent: !!session.userIntent,
        hasTone: !!session.tone,
        messages: session.messages,
    });
    // Update session
    await database_1.database.contentSession.update({
        where: { id: session.id },
        data: {
            userIntent: extracted.userIntent || session.userIntent,
            tone: extracted.tone || session.tone,
        },
    });
    // Get next question
    const updatedSession = await database_1.database.contentSession.findUnique({
        where: { id: session.id },
        include: { mediaAssets: true },
    });
    const agentResponse = await ai_1.contentAgent.getNextQuestion({
        sessionId: session.id,
        status: session.status,
        mediaCount: updatedSession.mediaAssets.length,
        hasUserIntent: !!updatedSession.userIntent,
        hasTone: !!updatedSession.tone,
        messages: [],
    });
    // Save agent response
    await database_1.database.sessionMessage.create({
        data: {
            sessionId: session.id,
            role: core_1.MessageRole.AGENT,
            content: agentResponse.message,
        },
    });
    await ctx.reply(agentResponse.message);
    // If ready to generate, enqueue job
    if (agentResponse.shouldGenerateDrafts && updatedSession.userIntent && updatedSession.tone) {
        await database_1.database.contentSession.update({
            where: { id: session.id },
            data: { status: core_1.SessionStatus.GENERATING_DRAFTS },
        });
        // Get media analysis
        const mediaAsset = updatedSession.mediaAssets[0];
        const analysis = mediaAsset.analysisResult;
        // Enqueue GENERATE_DRAFTS with proper payload
        const jobData = {
            sessionId: session.id,
            brandProfileId: updatedSession.brandProfileId,
            userIntent: updatedSession.userIntent,
            tone: updatedSession.tone,
            mediaAnalysis: analysis || {
                topics: [],
                mood: 'neutral',
                objects: [],
                suggestedTitle: '',
                contentType: 'general',
                targetAudience: 'general',
            },
        };
        await queue_1.queueService.enqueue(core_1.JobType.GENERATE_DRAFTS, jobData);
    }
}
async function handleApproval(ctx, session, text) {
    const result = await ai_1.contentAgent.handleApproval(text);
    if (result.approved) {
        await ctx.reply('⚠️ Please use the inline buttons above to approve drafts.\n\n' +
            'Click ✅ Approve button to publish.');
    }
    else {
        await ctx.reply('Got it! What would you like me to change?\n\n' +
            'Be specific (e.g., "Make it more casual" or "Change the hashtags")');
        // Save revision request
        const draftPackage = await database_1.database.draftPackage.findFirst({
            where: { sessionId: session.id },
            orderBy: { createdAt: 'desc' },
        });
        if (draftPackage) {
            await database_1.database.draftPackage.update({
                where: { id: draftPackage.id },
                data: {
                    status: 'NEEDS_REVISION',
                    revisionRequest: result.revisionRequest,
                },
            });
        }
    }
}
async function handleRevisionRequest(ctx, session, draftPackage, text) {
    observability_1.logger.info({ sessionId: session.id, draftPackageId: draftPackage.id }, 'Processing revision request');
    try {
        await ctx.reply('🤖 Revising your drafts based on your feedback...');
        // Get original context
        const mediaAsset = await database_1.database.mediaAsset.findFirst({
            where: { sessionId: session.id },
            orderBy: { createdAt: 'asc' },
        });
        const originalContext = {
            userIntent: session.userIntent,
            tone: session.tone,
            topics: mediaAsset?.analysisResult?.topics?.join(', ') || '',
            targetAudience: mediaAsset?.analysisResult?.targetAudience || '',
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
        const { revisedDraft } = await ai_1.contentAgent.processRevision({
            currentDraft,
            revisionRequest: text,
            originalContext,
        });
        // Create new DraftPackage with incremented version
        const newDraftPackage = await database_1.database.draftPackage.create({
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
        observability_1.logger.info({ newDraftPackageId: newDraftPackage.id, version: newDraftPackage.version }, 'Revised draft created');
        // Send new preview (import from media package if needed, or inline)
        const { telegramNotification } = await Promise.resolve().then(() => __importStar(require('@ai-agent/media')));
        await telegramNotification.sendDraftPreview({
            chatId: ctx.from.id.toString(),
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
    }
    catch (error) {
        observability_1.logger.error({ error, sessionId: session.id }, 'Failed to process revision');
        await ctx.reply('⚠️ Failed to revise drafts. Please try again or click ❌ Cancel to start over.');
    }
}
async function handleCancel(ctx) {
    if (!ctx.from)
        return;
    try {
        const user = await getOrCreateUser(ctx.from);
        const brandProfile = await getBrandProfile(user.id);
        const session = await database_1.database.contentSession.findFirst({
            where: {
                brandProfileId: brandProfile.id,
                status: {
                    notIn: [core_1.SessionStatus.PUBLISHED, core_1.SessionStatus.CANCELLED, core_1.SessionStatus.FAILED],
                },
            },
        });
        if (session) {
            await database_1.database.contentSession.update({
                where: { id: session.id },
                data: { status: core_1.SessionStatus.CANCELLED },
            });
            await ctx.reply('✅ Session cancelled. Upload new media to start again!');
        }
        else {
            await ctx.reply('No active session to cancel.');
        }
    }
    catch (error) {
        observability_1.logger.error({ error }, 'Failed to cancel session');
        await ctx.reply('Failed to cancel session.');
    }
}
async function handleStatus(ctx) {
    if (!ctx.from)
        return;
    try {
        const user = await getOrCreateUser(ctx.from);
        const brandProfile = await getBrandProfile(user.id);
        const session = await database_1.database.contentSession.findFirst({
            where: {
                brandProfileId: brandProfile.id,
                status: {
                    notIn: [core_1.SessionStatus.PUBLISHED, core_1.SessionStatus.CANCELLED, core_1.SessionStatus.FAILED],
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
            [core_1.SessionStatus.COLLECTING_MEDIA]: '📤',
            [core_1.SessionStatus.ASKING_QUESTIONS]: '💬',
            [core_1.SessionStatus.GENERATING_DRAFTS]: '🤖',
            [core_1.SessionStatus.AWAITING_APPROVAL]: '👀',
            [core_1.SessionStatus.APPROVED]: '✅',
            [core_1.SessionStatus.PUBLISHING]: '🚀',
            [core_1.SessionStatus.PUBLISHED]: '🎉',
            [core_1.SessionStatus.CANCELLED]: '❌',
            [core_1.SessionStatus.FAILED]: '⚠️',
        };
        await ctx.reply(`${statusEmoji[session.status]} Status: ${session.status}\n\n` +
            `📁 Media: ${session.mediaAssets.length}\n` +
            `📝 Drafts: ${session.draftPackages.length}\n` +
            `🕒 Started: ${session.createdAt.toLocaleString()}`);
    }
    catch (error) {
        observability_1.logger.error({ error }, 'Failed to get status');
        await ctx.reply('Failed to get status.');
    }
}
async function getOrCreateUser(from) {
    return database_1.database.user.upsert({
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
async function getBrandProfile(userId) {
    let profile = await database_1.database.brandProfile.findUnique({
        where: { userId },
    });
    if (!profile) {
        profile = await database_1.database.brandProfile.create({
            data: {
                userId,
                defaultHashtags: [],
                autoPublish: false,
            },
        });
    }
    return profile;
}
//# sourceMappingURL=index.js.map