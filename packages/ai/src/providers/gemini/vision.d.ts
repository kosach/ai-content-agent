import { IVisionProvider, VisionAnalysisParams, VisionAnalysisResult } from '../interfaces/vision-provider.interface';
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
export declare class GeminiVisionProvider implements IVisionProvider {
    private modelName;
    private readonly SIZE_THRESHOLD_MB;
    constructor(modelName?: string);
    analyzeMedia(params: VisionAnalysisParams): Promise<VisionAnalysisResult>;
    /**
     * Analyze media using inline data (base64)
     * Suitable for small files (<10MB)
     */
    private analyzeViaInlineData;
    /**
     * Analyze media using public URL
     * Suitable for large files (>=10MB)
     *
     * Note: Gemini doesn't directly support external URLs for vision.
     * This approach includes the URL in the prompt and asks for text-based analysis.
     * For true vision analysis of large files, use Gemini File API (future enhancement).
     */
    private analyzeViaUrl;
    /**
     * Parse and validate Gemini response
     */
    private parseResponse;
    /**
     * Determine if we should use URL-based analysis
     */
    private shouldUseUrlAnalysis;
    isAvailable(): Promise<boolean>;
    getName(): string;
    /**
     * Fetch media from URL and convert to base64
     *
     * @param url - Media URL
     * @param maxSize - Maximum size in bytes (optional, throws if exceeded)
     */
    private fetchMediaAsBase64;
}
export declare const geminiVisionProvider: GeminiVisionProvider;
//# sourceMappingURL=vision.d.ts.map