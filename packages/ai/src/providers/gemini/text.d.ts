import { ITextProvider, TextGenerationParams, TextGenerationResult } from '../interfaces/text-provider.interface';
/**
 * Gemini Text Provider
 *
 * Uses Google Gemini API for text generation
 * Model: gemini-2.0-flash-exp (fast, supports long context)
 */
export declare class GeminiTextProvider implements ITextProvider {
    private modelName;
    constructor(modelName?: string);
    generateText(params: TextGenerationParams): Promise<TextGenerationResult>;
    isAvailable(): Promise<boolean>;
    getName(): string;
}
export declare const geminiTextProvider: GeminiTextProvider;
//# sourceMappingURL=text.d.ts.map