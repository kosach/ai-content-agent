import { GenerativeModel } from '@google/generative-ai';
/**
 * Gemini Client Singleton
 *
 * Manages Google Generative AI SDK initialization and model access
 */
declare class GeminiClient {
    private genAI;
    private apiKey;
    /**
     * Initialize client with API key
     */
    initialize(apiKey: string): void;
    /**
     * Get a generative model instance
     */
    getModel(modelName?: string): GenerativeModel;
    /**
     * Check if client is initialized
     */
    isInitialized(): boolean;
    /**
     * Get API key (for debugging - never log this!)
     */
    getApiKey(): string | null;
}
export declare const geminiClient: GeminiClient;
export {};
//# sourceMappingURL=client.d.ts.map