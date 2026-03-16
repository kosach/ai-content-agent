"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiVisionProvider = exports.GeminiVisionProvider = void 0;
const client_1 = require("./client");
const schemas_1 = require("../../schemas");
const observability_1 = require("@ai-agent/observability");
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
class GeminiVisionProvider {
    modelName;
    SIZE_THRESHOLD_MB = 10;
    constructor(modelName = 'gemini-2.0-flash-exp') {
        this.modelName = modelName;
    }
    async analyzeMedia(params) {
        const { mediaUrl, mediaType, duration, prompt } = params;
        observability_1.logger.info({ mediaUrl, mediaType }, 'Starting Gemini vision analysis');
        try {
            // Check if we should use URL-based analysis (for large files)
            const shouldUseUrlAnalysis = await this.shouldUseUrlAnalysis(mediaUrl);
            if (shouldUseUrlAnalysis) {
                observability_1.logger.info({ mediaUrl }, 'Using URL-based analysis for large file');
                return await this.analyzeViaUrl(mediaUrl, mediaType, prompt);
            }
            else {
                observability_1.logger.info({ mediaUrl }, 'Using inline data analysis for small file');
                return await this.analyzeViaInlineData(mediaUrl, mediaType, prompt);
            }
        }
        catch (error) {
            observability_1.logger.error({ error, mediaUrl }, 'Gemini vision analysis failed');
            throw error;
        }
    }
    /**
     * Analyze media using inline data (base64)
     * Suitable for small files (<10MB)
     */
    async analyzeViaInlineData(mediaUrl, mediaType, prompt) {
        const model = client_1.geminiClient.getModel(this.modelName);
        // Prepare the content parts
        const parts = [{ text: prompt }];
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
    async analyzeViaUrl(mediaUrl, mediaType, prompt) {
        const model = client_1.geminiClient.getModel(this.modelName);
        // Fallback: For large files, we still need to download but with streaming
        // For MVP, we'll throw an error and suggest smaller files
        // TODO: Implement Gemini File API upload for large files
        observability_1.logger.warn({ mediaUrl, mediaType }, 'Large file detected - downloading with size limit');
        // Try to download with size check
        const base64Data = await this.fetchMediaAsBase64(mediaUrl, this.SIZE_THRESHOLD_MB * 1024 * 1024);
        const parts = [{ text: prompt }];
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
    parseResponse(text) {
        observability_1.logger.info({ text: text.substring(0, 200) }, 'Gemini analysis response');
        // Parse JSON response
        let analysisResult;
        try {
            analysisResult = JSON.parse(text);
        }
        catch (parseError) {
            observability_1.logger.error({ text, parseError }, 'Failed to parse Gemini response as JSON');
            throw new Error('Failed to parse AI response');
        }
        // Validate against schema
        const validated = schemas_1.MediaAnalysisSchema.parse(analysisResult);
        observability_1.logger.info({ validated }, 'Media analysis completed');
        return validated;
    }
    /**
     * Determine if we should use URL-based analysis
     */
    async shouldUseUrlAnalysis(url) {
        try {
            // HEAD request to check file size
            const response = await fetch(url, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
                const sizeInMB = parseInt(contentLength, 10) / (1024 * 1024);
                observability_1.logger.info({ url, sizeInMB }, 'File size check');
                return sizeInMB >= this.SIZE_THRESHOLD_MB;
            }
            // If no content-length header, assume small file
            return false;
        }
        catch (error) {
            observability_1.logger.warn({ error, url }, 'Failed to check file size, assuming small file');
            return false;
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
        return `GeminiVision(${this.modelName})`;
    }
    /**
     * Fetch media from URL and convert to base64
     *
     * @param url - Media URL
     * @param maxSize - Maximum size in bytes (optional, throws if exceeded)
     */
    async fetchMediaAsBase64(url, maxSize) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch media: ${response.statusText}`);
            }
            // Check size if limit provided
            if (maxSize) {
                const contentLength = response.headers.get('content-length');
                if (contentLength && parseInt(contentLength, 10) > maxSize) {
                    throw new Error(`File too large: ${(parseInt(contentLength, 10) / (1024 * 1024)).toFixed(2)}MB (max: ${(maxSize / (1024 * 1024)).toFixed(2)}MB)`);
                }
            }
            const arrayBuffer = await response.arrayBuffer();
            // Additional size check after download
            if (maxSize && arrayBuffer.byteLength > maxSize) {
                throw new Error(`File too large: ${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(2)}MB (max: ${(maxSize / (1024 * 1024)).toFixed(2)}MB)`);
            }
            const buffer = Buffer.from(arrayBuffer);
            return buffer.toString('base64');
        }
        catch (error) {
            observability_1.logger.error({ error, url }, 'Failed to fetch media');
            throw error;
        }
    }
}
exports.GeminiVisionProvider = GeminiVisionProvider;
// Export singleton instance
exports.geminiVisionProvider = new GeminiVisionProvider();
//# sourceMappingURL=vision.js.map