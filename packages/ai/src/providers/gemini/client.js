"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiClient = void 0;
const generative_ai_1 = require("@google/generative-ai");
const observability_1 = require("@ai-agent/observability");
/**
 * Gemini Client Singleton
 *
 * Manages Google Generative AI SDK initialization and model access
 */
class GeminiClient {
    genAI = null;
    apiKey = null;
    /**
     * Initialize client with API key
     */
    initialize(apiKey) {
        if (!apiKey) {
            throw new Error('Gemini API key is required');
        }
        this.apiKey = apiKey;
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        observability_1.logger.info('Gemini client initialized');
    }
    /**
     * Get a generative model instance
     */
    getModel(modelName = 'gemini-2.0-flash-exp') {
        if (!this.genAI) {
            throw new Error('Gemini client not initialized. Call initialize() first.');
        }
        return this.genAI.getGenerativeModel({ model: modelName });
    }
    /**
     * Check if client is initialized
     */
    isInitialized() {
        return this.genAI !== null;
    }
    /**
     * Get API key (for debugging - never log this!)
     */
    getApiKey() {
        return this.apiKey;
    }
}
// Export singleton instance
exports.geminiClient = new GeminiClient();
//# sourceMappingURL=client.js.map