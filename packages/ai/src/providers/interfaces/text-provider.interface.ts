/**
 * Text Provider Interface
 * 
 * For generating text content using AI language models
 */

export interface TextGenerationParams {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface TextGenerationResult {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ITextProvider {
  /**
   * Generate text using AI language model
   */
  generateText(params: TextGenerationParams): Promise<TextGenerationResult>;

  /**
   * Check if provider is properly configured and available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get provider name (for logging/debugging)
   */
  getName(): string;
}
