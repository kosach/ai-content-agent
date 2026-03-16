"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramFile = exports.TelegramFileService = void 0;
exports.getTelegramFileService = getTelegramFileService;
const axios_1 = __importDefault(require("axios"));
const observability_1 = require("@ai-agent/observability");
const config_1 = require("@ai-agent/config");
/**
 * Telegram File Service
 *
 * Downloads files from Telegram Bot API
 * Handles file size limits and errors
 */
class TelegramFileService {
    botToken;
    baseUrl;
    constructor(botToken) {
        this.botToken = botToken;
        this.baseUrl = `https://api.telegram.org/bot${botToken}`;
    }
    /**
     * Get file info from Telegram
     */
    async getFile(fileId) {
        observability_1.logger.info({ fileId }, 'Getting file info from Telegram');
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/getFile`, {
                params: { file_id: fileId },
            });
            if (!response.data.ok) {
                throw new Error(`Telegram API error: ${response.data.description}`);
            }
            const fileInfo = response.data.result;
            observability_1.logger.info({ fileInfo }, 'File info retrieved');
            return fileInfo;
        }
        catch (error) {
            observability_1.logger.error({ error, fileId }, 'Failed to get file info');
            throw error;
        }
    }
    /**
     * Download file from Telegram as Buffer
     */
    async downloadFile(fileId) {
        observability_1.logger.info({ fileId }, 'Downloading file from Telegram');
        try {
            // Get file info first
            const fileInfo = await this.getFile(fileId);
            if (!fileInfo.file_path) {
                throw new Error('File path not available from Telegram');
            }
            // Check file size (Telegram limit: 20MB for bots)
            if (fileInfo.file_size && fileInfo.file_size > 20 * 1024 * 1024) {
                throw new Error(`File too large: ${fileInfo.file_size} bytes (max 20MB)`);
            }
            // Download file
            const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${fileInfo.file_path}`;
            observability_1.logger.info({ fileUrl: fileInfo.file_path, fileSize: fileInfo.file_size }, 'Downloading from Telegram');
            const response = await axios_1.default.get(fileUrl, {
                responseType: 'arraybuffer',
                timeout: 60000, // 60 seconds timeout
            });
            const buffer = Buffer.from(response.data);
            observability_1.logger.info({ fileId, downloadedSize: buffer.length }, 'File downloaded successfully');
            return buffer;
        }
        catch (error) {
            observability_1.logger.error({ error, fileId }, 'Failed to download file');
            throw error;
        }
    }
    /**
     * Get file URL (does not download, just returns URL)
     */
    async getFileUrl(fileId) {
        const fileInfo = await this.getFile(fileId);
        if (!fileInfo.file_path) {
            throw new Error('File path not available');
        }
        return `https://api.telegram.org/file/bot${this.botToken}/${fileInfo.file_path}`;
    }
    /**
     * Download file and get metadata
     */
    async downloadWithMetadata(fileId) {
        const fileInfo = await this.getFile(fileId);
        const buffer = await this.downloadFile(fileId);
        return {
            buffer,
            size: fileInfo.file_size || buffer.length,
            filePath: fileInfo.file_path || '',
        };
    }
}
exports.TelegramFileService = TelegramFileService;
/**
 * Export singleton instance
 */
let telegramFileService = null;
function getTelegramFileService() {
    if (!telegramFileService) {
        telegramFileService = new TelegramFileService(config_1.config.telegram.botToken);
    }
    return telegramFileService;
}
exports.telegramFile = {
    downloadFile: (fileId) => getTelegramFileService().downloadFile(fileId),
    getFileUrl: (fileId) => getTelegramFileService().getFileUrl(fileId),
    downloadWithMetadata: (fileId) => getTelegramFileService().downloadWithMetadata(fileId),
};
//# sourceMappingURL=telegram-file.service.js.map