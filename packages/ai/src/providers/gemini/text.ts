import {
  ITextProvider,
  TextGenerationParams,
  TextGenerationResult,
} from '../interfaces/text-provider.interface';
import { geminiClient } from './client';
import { logger } from '@ai-agent/observability';

/**
 * Gemini Text Provider
 * 
 * Uses Google Gemini API for text generation
 * Model: gemini-2.0-flash-exp (fast, supports long context)
 */
export class GeminiTextProvider implements ITextProvider {
  private modelName: string;

  constructor(modelName: string = 'gemini-2.0-flash-exp') {
    this.modelName = modelName;
  }

  async generateText(params: TextGenerationParams): Promise<TextGenerationResult> {
    const {
      prompt,
      systemPrompt,
      temperature = 0.8,
      maxTokens = 2048,
      responseFormat = 'json',
    } = params;

    logger.info({ promptLength: prompt.length, responseFormat }, 'Starting Gemini text generation');

    try {
      const model = geminiClient.getModel(this.modelName);

      // Combine system prompt and user prompt
      const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;

      // Generate content
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: responseFormat === 'json' ? 'application/json' : 'text/plain',
        },
      });

      const response = result.response;
      const text = response.text();

      // Get usage metadata if available
      const usage = response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined;

      logger.info(
        { textLength: text.length, usage },
        'Gemini text generation completed'
      );

      return {
        text,
        usage,
      };
    } catch (error) {
      logger.error({ error }, 'Gemini text generation failed');
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
    return `GeminiText(${this.modelName})`;
  }
}

// Export singleton instance
export const geminiTextProvider = new GeminiTextProvider();
