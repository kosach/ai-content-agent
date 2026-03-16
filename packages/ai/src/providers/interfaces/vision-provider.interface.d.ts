/**
 * Vision Provider Interface
 *
 * For analyzing images and videos using AI vision models
 */
export interface VisionAnalysisParams {
    mediaUrl: string;
    mediaType: 'PHOTO' | 'VIDEO';
    duration?: number;
    prompt: string;
}
export interface VisionAnalysisResult {
    topics: string[];
    mood: string;
    objects: string[];
    suggestedTitle: string;
    contentType: string;
    targetAudience: string;
    keyMoments?: Array<{
        timestamp: string;
        description: string;
    }>;
    extractedText?: string;
}
export interface IVisionProvider {
    /**
     * Analyze media (photo or video) using vision AI
     */
    analyzeMedia(params: VisionAnalysisParams): Promise<VisionAnalysisResult>;
    /**
     * Check if provider is properly configured and available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Get provider name (for logging/debugging)
     */
    getName(): string;
}
//# sourceMappingURL=vision-provider.interface.d.ts.map