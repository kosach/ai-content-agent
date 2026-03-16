import { z } from 'zod';
/**
 * Media Analysis Schema
 * Validates AI analysis output for uploaded media
 */
export declare const MediaAnalysisSchema: z.ZodObject<{
    topics: z.ZodArray<z.ZodString, "many">;
    mood: z.ZodString;
    objects: z.ZodArray<z.ZodString, "many">;
    suggestedTitle: z.ZodString;
    contentType: z.ZodString;
    targetAudience: z.ZodString;
    keyMoments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        timestamp: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        description: string;
    }, {
        timestamp: string;
        description: string;
    }>, "many">>;
    extractedText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    topics: string[];
    mood: string;
    objects: string[];
    suggestedTitle: string;
    contentType: string;
    targetAudience: string;
    keyMoments?: {
        timestamp: string;
        description: string;
    }[] | undefined;
    extractedText?: string | undefined;
}, {
    topics: string[];
    mood: string;
    objects: string[];
    suggestedTitle: string;
    contentType: string;
    targetAudience: string;
    keyMoments?: {
        timestamp: string;
        description: string;
    }[] | undefined;
    extractedText?: string | undefined;
}>;
export type MediaAnalysis = z.infer<typeof MediaAnalysisSchema>;
/**
 * Draft Generation Schema
 * Validates generated YouTube Short + Facebook post
 */
export declare const DraftGenerationSchema: z.ZodObject<{
    youtubeShort: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        hashtags: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
        hashtags: string[];
    }, {
        title: string;
        description: string;
        hashtags: string[];
    }>;
    facebookPost: z.ZodObject<{
        text: z.ZodString;
        hashtags: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        text: string;
        hashtags: string[];
    }, {
        text: string;
        hashtags: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    youtubeShort: {
        title: string;
        description: string;
        hashtags: string[];
    };
    facebookPost: {
        text: string;
        hashtags: string[];
    };
}, {
    youtubeShort: {
        title: string;
        description: string;
        hashtags: string[];
    };
    facebookPost: {
        text: string;
        hashtags: string[];
    };
}>;
export type DraftGeneration = z.infer<typeof DraftGenerationSchema>;
/**
 * Revision Request Schema
 */
export declare const RevisionRequestSchema: z.ZodObject<{
    revisionType: z.ZodEnum<["tone", "content", "hashtags", "length", "other"]>;
    specificRequest: z.ZodString;
    targetPlatform: z.ZodOptional<z.ZodEnum<["youtube", "facebook", "both"]>>;
}, "strip", z.ZodTypeAny, {
    revisionType: "length" | "content" | "tone" | "hashtags" | "other";
    specificRequest: string;
    targetPlatform?: "both" | "youtube" | "facebook" | undefined;
}, {
    revisionType: "length" | "content" | "tone" | "hashtags" | "other";
    specificRequest: string;
    targetPlatform?: "both" | "youtube" | "facebook" | undefined;
}>;
export type RevisionRequest = z.infer<typeof RevisionRequestSchema>;
//# sourceMappingURL=index.d.ts.map