"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramNotification = exports.TelegramNotificationService = void 0;
exports.getTelegramNotificationService = getTelegramNotificationService;
const axios_1 = __importDefault(require("axios"));
const observability_1 = require("@ai-agent/observability");
const config_1 = require("@ai-agent/config");
/**
 * Telegram Notification Service
 *
 * Sends notifications and formatted messages to Telegram users
 * Used by workers to notify users about job completion
 */
class TelegramNotificationService {
    botToken;
    baseUrl;
    constructor(botToken) {
        this.botToken = botToken;
        this.baseUrl = `https://api.telegram.org/bot${botToken}`;
    }
    /**
     * Send text message to user
     */
    async sendMessage(params) {
        const { chatId, text, parseMode, replyMarkup } = params;
        observability_1.logger.info({ chatId, textLength: text.length }, 'Sending Telegram message');
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/sendMessage`, {
                chat_id: chatId,
                text,
                parse_mode: parseMode,
                reply_markup: replyMarkup,
            });
            if (!response.data.ok) {
                throw new Error(`Telegram API error: ${response.data.description}`);
            }
            observability_1.logger.info({ chatId, messageId: response.data.result.message_id }, 'Message sent');
        }
        catch (error) {
            observability_1.logger.error({ error, chatId }, 'Failed to send Telegram message');
            throw error;
        }
    }
    /**
     * Send draft preview with approval buttons
     */
    async sendDraftPreview(params) {
        const { chatId, sessionId, draftPackageId, youtubeShort, facebookPost } = params;
        observability_1.logger.info({ chatId, sessionId, draftPackageId }, 'Sending draft preview');
        // Format message
        const message = this.formatDraftPreview(youtubeShort, facebookPost);
        // Inline keyboard with approval buttons
        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '✅ Approve', callback_data: `approve:${draftPackageId}` },
                    { text: '✏️ Revise', callback_data: `revise:${draftPackageId}` },
                ],
                [
                    { text: '❌ Cancel', callback_data: `cancel:${sessionId}` },
                ],
            ],
        };
        await this.sendMessage({
            chatId,
            text: message,
            parseMode: 'Markdown',
            replyMarkup,
        });
    }
    /**
     * Send publish confirmation
     */
    async sendPublishConfirmation(params) {
        const { chatId, youtubeUrl, facebookUrl } = params;
        observability_1.logger.info({ chatId, youtubeUrl, facebookUrl }, 'Sending publish confirmation');
        let message = '🎉 *Successfully published!*\n\n';
        if (youtubeUrl) {
            message += `📹 *YouTube Short:* ${youtubeUrl}\n`;
        }
        if (facebookUrl) {
            message += `📱 *Facebook Post:* ${facebookUrl}\n`;
        }
        message += '\n✨ Great job! Your content is now live.';
        await this.sendMessage({
            chatId,
            text: message,
            parseMode: 'Markdown',
        });
    }
    /**
     * Send error notification
     */
    async sendError(params) {
        const { chatId, errorMessage, context } = params;
        observability_1.logger.info({ chatId, errorMessage, context }, 'Sending error notification');
        let message = '⚠️ *Something went wrong*\n\n';
        if (context) {
            message += `*Context:* ${context}\n`;
        }
        message += `*Error:* ${errorMessage}\n\n`;
        message += 'Please try again or contact support if the issue persists.';
        await this.sendMessage({
            chatId,
            text: message,
            parseMode: 'Markdown',
        });
    }
    /**
     * Format draft preview message
     */
    formatDraftPreview(youtubeShort, facebookPost) {
        let message = '✨ *Your drafts are ready!*\n\n';
        // YouTube Short section
        message += '📹 *YouTube Short*\n';
        message += `*Title:* ${youtubeShort.title}\n\n`;
        message += `*Description:*\n${youtubeShort.description}\n\n`;
        if (youtubeShort.hashtags.length > 0) {
            message += `*Hashtags:* ${youtubeShort.hashtags.map(h => `#${h}`).join(' ')}\n\n`;
        }
        message += '━━━━━━━━━━━━━━━\n\n';
        // Facebook Post section
        message += '📱 *Facebook Post*\n\n';
        message += `${facebookPost.text}\n\n`;
        if (facebookPost.hashtags.length > 0) {
            message += `${facebookPost.hashtags.map(h => `#${h}`).join(' ')}\n\n`;
        }
        message += '━━━━━━━━━━━━━━━\n\n';
        message += '👇 *What would you like to do?*';
        return message;
    }
    /**
     * Send simple notification
     */
    async notify(chatId, text) {
        await this.sendMessage({ chatId, text });
    }
}
exports.TelegramNotificationService = TelegramNotificationService;
/**
 * Export singleton instance
 */
let telegramNotificationService = null;
function getTelegramNotificationService() {
    if (!telegramNotificationService) {
        telegramNotificationService = new TelegramNotificationService(config_1.config.telegram.botToken);
    }
    return telegramNotificationService;
}
exports.telegramNotification = {
    sendMessage: (params) => getTelegramNotificationService().sendMessage(params),
    sendDraftPreview: (params) => getTelegramNotificationService().sendDraftPreview(params),
    sendPublishConfirmation: (params) => getTelegramNotificationService().sendPublishConfirmation(params),
    sendError: (params) => getTelegramNotificationService().sendError(params),
    notify: (chatId, text) => getTelegramNotificationService().notify(chatId, text),
};
//# sourceMappingURL=telegram-notification.service.js.map