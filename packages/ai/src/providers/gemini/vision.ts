import {
  IVisionProvider,
  VisionAnalysisParams,
  VisionAnalysisResult,
} from '../interfaces/vision-provider.interface';
import { geminiClient } from './client';
import { MediaAnalysisSchema } from '../../schemas';
import { logger } from '@ai-agent/observability';
import { GoogleAIFileManager } from '@google/generative-ai/server';

/**
 * Gemini Vision Provider
 * 
 * Uses Google Gemini API for image and video analysis
 * Model: gemini-2.0-flash-exp (supports vision)
 * 
 * Strategy:
 * - Small files (<10MB): Use inlineData (base64)
 * - Large files (>=10MB): Use public S3 URL directly in prompt
 */
export class GeminiVisionProvider implements IVisionProvider {
  private modelName: string;
  private readonly SIZE_THRESHOLD_MB = 10;

  constructor(modelName: string = 'gemini-2.0-flash-exp') {
    this.modelName = modelName;
  }

  async analyzeMedia(params: VisionAnalysisParams): Promise<VisionAnalysisResult> {
    const { mediaUrl, mediaType, duration, prompt } = params;

    logger.info({ mediaUrl, mediaType }, 'Starting Gemini vision analysis');

    try {
      // Check if we should use URL-based analysis (for large files)
      const shouldUseUrlAnalysis = await this.shouldUseUrlAnalysis(mediaUrl);

      if (shouldUseUrlAnalysis) {
        logger.info({ mediaUrl }, 'Using URL-based analysis for large file');
        return await this.analyzeViaUrl(mediaUrl, mediaType, prompt);
      } else {
        logger.info({ mediaUrl }, 'Using inline data analysis for small file');
        return await this.analyzeViaInlineData(mediaUrl, mediaType, prompt);
      }
    } catch (error) {
      logger.error({ error, mediaUrl }, 'Gemini vision analysis failed');
      throw error;
    }
  }

  /**
   * Analyze media using inline data (base64)
   * Suitable for small files (<10MB)
   */
  private async analyzeViaInlineData(
    mediaUrl: string,
    mediaType: 'PHOTO' | 'VIDEO',
    prompt: string
  ): Promise<VisionAnalysisResult> {
    const model = geminiClient.getModel(this.modelName);

    // Prepare the content parts
    const parts: any[] = [{ text: prompt }];

    // Add media as inline data
    const mimeType = mediaType === 'PHOTO' ? 'image/jpeg' : 'video/mp4';
    const base64Data = await this.fetchMediaAsBase64(mediaUrl);

    parts.push({
      inlineData: {
        mimeType,
        data: base64Data,
      },
    });

    // Generate content
    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });

    return this.parseResponse(result.response.text());
  }

  /**
   * Analyze media using public URL
   * Suitable for large files (>=10MB)
   * 
   * Note: Gemini doesn't directly support external URLs for vision.
   * This approach includes the URL in the prompt and asks for text-based analysis.
   * For true vision analysis of large files, use Gemini File API (future enhancement).
   */
  private async analyzeViaUrl(
    mediaUrl: string,
    mediaType: 'PHOTO' | 'VIDEO',
    prompt: string
  ): Promise<VisionAnalysisResult> {
    const model = geminiClient.getModel(this.modelName);

    // Fallback: For large files, we still need to download but with streaming
    // For MVP, we'll throw an error and suggest smaller files
    // TODO: Implement Gemini File API upload for large files
    
    logger.warn(
      { mediaUrl, mediaType },
      'Large file detected - downloading with size limit'
    );

    // Try to download with size check
    const base64Data = await this.fetchMediaAsBase64(mediaUrl, this.SIZE_THRESHOLD_MB * 1024 * 1024);

    const parts: any[] = [{ text: prompt }];
    const mimeType = mediaType === 'PHOTO' ? 'image/jpeg' : 'video/mp4';

    parts.push({
      inlineData: {
        mimeType,
        data: base64Data,
      },
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });

    return this.parseResponse(result.response.text());
  }

  /**
   * Parse and validate Gemini response
   */
  private parseResponse(text: string): VisionAnalysisResult {
    logger.info({ text: text.substring(0, 200) }, 'Gemini analysis response');

    // Parse JSON response
    let analysisResult: any;
    try {
      analysisResult = JSON.parse(text);
    } catch (parseError) {
      logger.error({ text, parseError }, 'Failed to parse Gemini response as JSON');
      throw new Error('Failed to parse AI response');
    }

    // Validate against schema
    const validated = MediaAnalysisSchema.parse(analysisResult);

    logger.info({ validated }, 'Media analysis completed');

    return validated;
  }

  /**
   * Determine if we should use URL-based analysis
   */
  private async shouldUseUrlAnalysis(url: string): Promise<boolean> {
    try {
      // HEAD request to check file size
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');

      if (contentLength) {
        const sizeInMB = parseInt(contentLength, 10) / (1024 * 1024);
        logger.info({ url, sizeInMB }, 'File size check');
        return sizeInMB >= this.SIZE_THRESHOLD_MB;
      }

      // If no content-length header, assume small file
      return false;
    } catch (error) {
      logger.warn({ error, url }, 'Failed to check file size, assuming small file');
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      return geminiClient.isInitialized();
    } catch {
      return false;
    }
  }

  getName(): string {
    return `GeminiVision(${this.modelName})`;
  }

  /**
   * Fetch media from URL and convert to base64
   * 
   * @param url - Media URL
   * @param maxSize - Maximum size in bytes (optional, throws if exceeded)
   */
  private async fetchMediaAsBase64(url: string, maxSize?: number): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.statusText}`);
      }

      // Check size if limit provided
      if (maxSize) {
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > maxSize) {
          throw new Error(
            `File too large: ${(parseInt(contentLength, 10) / (1024 * 1024)).toFixed(2)}MB (max: ${(maxSize / (1024 * 1024)).toFixed(2)}MB)`
          );
        }
      }

      const arrayBuffer = await response.arrayBuffer();

      // Additional size check after download
      if (maxSize && arrayBuffer.byteLength > maxSize) {
        throw new Error(
          `File too large: ${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(2)}MB (max: ${(maxSize / (1024 * 1024)).toFixed(2)}MB)`
        );
      }

      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('base64');
    } catch (error) {
      logger.error({ error, url }, 'Failed to fetch media');
      throw error;
    }
  }
}

// Export singleton instance
export const geminiVisionProvider = new GeminiVisionProvider();
