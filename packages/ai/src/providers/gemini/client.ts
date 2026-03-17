import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { logger } from '@ai-agent/observability';

/**
 * Gemini Client Singleton
 * 
 * Manages Google Generative AI SDK initialization and model access
 */
class GeminiClient {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;

  /**
   * Initialize client with API key
   */
  initialize(apiKey: string): void {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    logger.info('Gemini client initialized');
  }

  /**
   * Get a generative model instance
   */
  getModel(modelName: string = 'gemini-2.5-flash'): GenerativeModel {
    if (!this.genAI) {
      throw new Error('Gemini client not initialized. Call initialize() first.');
    }

    return this.genAI.getGenerativeModel({ model: modelName });
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.genAI !== null;
  }

  /**
   * Get API key (for debugging - never log this!)
   */
  getApiKey(): string | null {
    return this.apiKey;
  }
}

// Export singleton instance
export const geminiClient = new GeminiClient();
