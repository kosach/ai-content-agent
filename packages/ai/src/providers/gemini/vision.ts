import {
  IVisionProvider,
  VisionAnalysisParams,
  VisionAnalysisResult,
} from '../interfaces/vision-provider.interface';
import { geminiClient } from './client';
import { MediaAnalysisSchema } from '../../schemas';
import { logger } from '@ai-agent/observability';

/**
 * Gemini Vision Provider
 * 
 * Uses Google Gemini API for image and video analysis
 * Model: gemini-2.0-flash-exp (supports vision)
 */
export class GeminiVisionProvider implements IVisionProvider {
  private modelName: string;

  constructor(modelName: string = 'gemini-2.0-flash-exp') {
    this.modelName = modelName;
  }

  async analyzeMedia(params: VisionAnalysisParams): Promise<VisionAnalysisResult> {
    const { mediaUrl, mediaType, duration, prompt } = params;

    logger.info({ mediaUrl, mediaType }, 'Starting Gemini vision analysis');

    try {
      const model = geminiClient.getModel(this.modelName);

      // Prepare the content parts
      const parts: any[] = [
        { text: prompt },
      ];

      // Add media URL as inline data
      if (mediaType === 'PHOTO') {
        // For photos, use image URL directly
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: await this.fetchMediaAsBase64(mediaUrl),
          },
        });
      } else {
        // For videos, Gemini supports video analysis
        parts.push({
          inlineData: {
            mimeType: 'video/mp4',
            data: await this.fetchMediaAsBase64(mediaUrl),
          },
        });
      }

      // Generate content
      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      });

      const response = result.response;
      const text = response.text();

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
    } catch (error) {
      logger.error({ error, mediaUrl }, 'Gemini vision analysis failed');
      throw error;
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
   * Note: For production, this should be replaced with a more robust
   * solution (streaming, chunking for large files, etc.)
   */
  private async fetchMediaAsBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
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
