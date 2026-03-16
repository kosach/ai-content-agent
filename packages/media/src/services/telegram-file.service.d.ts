/**
 * Telegram File Service
 *
 * Downloads files from Telegram Bot API
 * Handles file size limits and errors
 */
export declare class TelegramFileService {
    private botToken;
    private baseUrl;
    constructor(botToken: string);
    /**
     * Get file info from Telegram
     */
    getFile(fileId: string): Promise<{
        file_id: string;
        file_unique_id: string;
        file_size?: number;
        file_path?: string;
    }>;
    /**
     * Download file from Telegram as Buffer
     */
    downloadFile(fileId: string): Promise<Buffer>;
    /**
     * Get file URL (does not download, just returns URL)
     */
    getFileUrl(fileId: string): Promise<string>;
    /**
     * Download file and get metadata
     */
    downloadWithMetadata(fileId: string): Promise<{
        buffer: Buffer;
        size: number;
        filePath: string;
    }>;
}
export declare function getTelegramFileService(): TelegramFileService;
export declare const telegramFile: {
    downloadFile: (fileId: string) => Promise<Buffer<ArrayBufferLike>>;
    getFileUrl: (fileId: string) => Promise<string>;
    downloadWithMetadata: (fileId: string) => Promise<{
        buffer: Buffer;
        size: number;
        filePath: string;
    }>;
};
//# sourceMappingURL=telegram-file.service.d.ts.map