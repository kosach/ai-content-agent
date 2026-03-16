"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiTextProvider = exports.GeminiTextProvider = void 0;
const client_1 = require("./client");
const observability_1 = require("@ai-agent/observability");
/**
 * Gemini Text Provider
 *
 * Uses Google Gemini API for text generation
 * Model: gemini-2.0-flash-exp (fast, supports long context)
 */
class GeminiTextProvider {
    modelName;
    constructor(modelName = 'gemini-2.0-flash-exp') {
        this.modelName = modelName;
    }
    async generateText(params) {
        const { prompt, systemPrompt, temperature = 0.8, maxTokens = 2048, responseFormat = 'json', } = params;
        observability_1.logger.info({ promptLength: prompt.length, responseFormat }, 'Starting Gemini text generation');
        try {
            const model = client_1.geminiClient.getModel(this.modelName);
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
            observability_1.logger.info({ textLength: text.length, usage }, 'Gemini text generation completed');
            return {
                text,
                usage,
            };
        }
        catch (error) {
            observability_1.logger.error({ error }, 'Gemini text generation failed');
            throw error;
        }
    }
    async isAvailable() {
        try {
            return client_1.geminiClient.isInitialized();
        }
        catch {
            return false;
        }
    }
    getName() {
        return `GeminiText(${this.modelName})`;
    }
}
exports.GeminiTextProvider = GeminiTextProvider;
// Export singleton instance
exports.geminiTextProvider = new GeminiTextProvider();
//# sourceMappingURL=text.js.map