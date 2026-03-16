import axios from 'axios';
import { logger } from '@ai-agent/observability';
import { config } from '@ai-agent/config';

/**
 * Telegram Notification Service
 * 
 * Sends notifications and formatted messages to Telegram users
 * Used by workers to notify users about job completion
 */
export class TelegramNotificationService {
  private botToken: string;
  private baseUrl: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Send text message to user
   */
  async sendMessage(params: {
    chatId: string | number;
    text: string;
    parseMode?: 'Markdown' | 'HTML';
    replyMarkup?: any;
  }): Promise<void> {
    const { chatId, text, parseMode, replyMarkup } = params;

    logger.info({ chatId, textLength: text.length }, 'Sending Telegram message');

    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        reply_markup: replyMarkup,
      });

      if (!response.data.ok) {
        throw new Error(`Telegram API error: ${response.data.description}`);
      }

      logger.info({ chatId, messageId: response.data.result.message_id }, 'Message sent');
    } catch (error) {
      logger.error({ error, chatId }, 'Failed to send Telegram message');
      throw error;
    }
  }

  /**
   * Send draft preview with approval buttons
   */
  async sendDraftPreview(params: {
    chatId: string | number;
    sessionId: string;
    draftPackageId: string;
    youtubeShort: {
      title: string;
      description: string;
      hashtags: string[];
    };
    facebookPost: {
      text: string;
      hashtags: string[];
    };
  }): Promise<void> {
    const { chatId, sessionId, draftPackageId, youtubeShort, facebookPost } = params;

    logger.info({ chatId, sessionId, draftPackageId }, 'Sending draft preview');

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
  async sendPublishConfirmation(params: {
    chatId: string | number;
    youtubeUrl?: string;
    facebookUrl?: string;
  }): Promise<void> {
    const { chatId, youtubeUrl, facebookUrl } = params;

    logger.info({ chatId, youtubeUrl, facebookUrl }, 'Sending publish confirmation');

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
  async sendError(params: {
    chatId: string | number;
    errorMessage: string;
    context?: string;
  }): Promise<void> {
    const { chatId, errorMessage, context } = params;

    logger.info({ chatId, errorMessage, context }, 'Sending error notification');

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
  private formatDraftPreview(
    youtubeShort: { title: string; description: string; hashtags: string[] },
    facebookPost: { text: string; hashtags: string[] }
  ): string {
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
  async notify(chatId: string | number, text: string): Promise<void> {
    await this.sendMessage({ chatId, text });
  }
}

/**
 * Export singleton instance
 */
let telegramNotificationService: TelegramNotificationService | null = null;

export function getTelegramNotificationService(): TelegramNotificationService {
  if (!telegramNotificationService) {
    telegramNotificationService = new TelegramNotificationService(config.telegram.botToken);
  }
  return telegramNotificationService;
}

export const telegramNotification = {
  sendMessage: (params: Parameters<TelegramNotificationService['sendMessage']>[0]) =>
    getTelegramNotificationService().sendMessage(params),
  
  sendDraftPreview: (params: Parameters<TelegramNotificationService['sendDraftPreview']>[0]) =>
    getTelegramNotificationService().sendDraftPreview(params),
  
  sendPublishConfirmation: (params: Parameters<TelegramNotificationService['sendPublishConfirmation']>[0]) =>
    getTelegramNotificationService().sendPublishConfirmation(params),
  
  sendError: (params: Parameters<TelegramNotificationService['sendError']>[0]) =>
    getTelegramNotificationService().sendError(params),
  
  notify: (chatId: string | number, text: string) =>
    getTelegramNotificationService().notify(chatId, text),
};
