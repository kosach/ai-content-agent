/**
 * Telegram Notification Service
 *
 * Sends notifications and formatted messages to Telegram users
 * Used by workers to notify users about job completion
 */
export declare class TelegramNotificationService {
    private botToken;
    private baseUrl;
    constructor(botToken: string);
    /**
     * Send text message to user
     */
    sendMessage(params: {
        chatId: string | number;
        text: string;
        parseMode?: 'Markdown' | 'HTML';
        replyMarkup?: any;
    }): Promise<void>;
    /**
     * Send draft preview with approval buttons
     */
    sendDraftPreview(params: {
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
    }): Promise<void>;
    /**
     * Send publish confirmation
     */
    sendPublishConfirmation(params: {
        chatId: string | number;
        youtubeUrl?: string;
        facebookUrl?: string;
    }): Promise<void>;
    /**
     * Send error notification
     */
    sendError(params: {
        chatId: string | number;
        errorMessage: string;
        context?: string;
    }): Promise<void>;
    /**
     * Format draft preview message
     */
    private formatDraftPreview;
    /**
     * Send simple notification
     */
    notify(chatId: string | number, text: string): Promise<void>;
}
export declare function getTelegramNotificationService(): TelegramNotificationService;
export declare const telegramNotification: {
    sendMessage: (params: Parameters<TelegramNotificationService["sendMessage"]>[0]) => Promise<void>;
    sendDraftPreview: (params: Parameters<TelegramNotificationService["sendDraftPreview"]>[0]) => Promise<void>;
    sendPublishConfirmation: (params: Parameters<TelegramNotificationService["sendPublishConfirmation"]>[0]) => Promise<void>;
    sendError: (params: Parameters<TelegramNotificationService["sendError"]>[0]) => Promise<void>;
    notify: (chatId: string | number, text: string) => Promise<void>;
};
//# sourceMappingURL=telegram-notification.service.d.ts.map