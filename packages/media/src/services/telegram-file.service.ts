import axios from 'axios';
import { logger } from '@ai-agent/observability';
import { config } from '@ai-agent/config';

/**
 * Telegram File Service
 * 
 * Downloads files from Telegram Bot API
 * Handles file size limits and errors
 */
export class TelegramFileService {
  private botToken: string;
  private baseUrl: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Get file info from Telegram
   */
  async getFile(fileId: string): Promise<{
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path?: string;
  }> {
    logger.info({ fileId }, 'Getting file info from Telegram');

    try {
      const response = await axios.get(`${this.baseUrl}/getFile`, {
        params: { file_id: fileId },
      });

      if (!response.data.ok) {
        throw new Error(`Telegram API error: ${response.data.description}`);
      }

      const fileInfo = response.data.result;
      logger.info({ fileInfo }, 'File info retrieved');

      return fileInfo;
    } catch (error) {
      logger.error({ error, fileId }, 'Failed to get file info');
      throw error;
    }
  }

  /**
   * Download file from Telegram as Buffer
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    logger.info({ fileId }, 'Downloading file from Telegram');

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
      
      logger.info({ fileUrl: fileInfo.file_path, fileSize: fileInfo.file_size }, 'Downloading from Telegram');

      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60 seconds timeout
      });

      const buffer = Buffer.from(response.data);

      logger.info({ fileId, downloadedSize: buffer.length }, 'File downloaded successfully');

      return buffer;
    } catch (error) {
      logger.error({ error, fileId }, 'Failed to download file');
      throw error;
    }
  }

  /**
   * Get file URL (does not download, just returns URL)
   */
  async getFileUrl(fileId: string): Promise<string> {
    const fileInfo = await this.getFile(fileId);

    if (!fileInfo.file_path) {
      throw new Error('File path not available');
    }

    return `https://api.telegram.org/file/bot${this.botToken}/${fileInfo.file_path}`;
  }

  /**
   * Download file and get metadata
   */
  async downloadWithMetadata(fileId: string): Promise<{
    buffer: Buffer;
    size: number;
    filePath: string;
  }> {
    const fileInfo = await this.getFile(fileId);
    const buffer = await this.downloadFile(fileId);

    return {
      buffer,
      size: fileInfo.file_size || buffer.length,
      filePath: fileInfo.file_path || '',
    };
  }
}

/**
 * Export singleton instance
 */
let telegramFileService: TelegramFileService | null = null;

export function getTelegramFileService(): TelegramFileService {
  if (!telegramFileService) {
    telegramFileService = new TelegramFileService(config.telegram.botToken);
  }
  return telegramFileService;
}

export const telegramFile = {
  downloadFile: (fileId: string) => getTelegramFileService().downloadFile(fileId),
  getFileUrl: (fileId: string) => getTelegramFileService().getFileUrl(fileId),
  downloadWithMetadata: (fileId: string) => getTelegramFileService().downloadWithMetadata(fileId),
};
