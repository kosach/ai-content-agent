"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevisionRequestSchema = exports.DraftGenerationSchema = exports.MediaAnalysisSchema = void 0;
const zod_1 = require("zod");
/**
 * Media Analysis Schema
 * Validates AI analysis output for uploaded media
 */
exports.MediaAnalysisSchema = zod_1.z.object({
    topics: zod_1.z.array(zod_1.z.string()).min(1).max(10),
    mood: zod_1.z.string(),
    objects: zod_1.z.array(zod_1.z.string()),
    suggestedTitle: zod_1.z.string(),
    contentType: zod_1.z.string(),
    targetAudience: zod_1.z.string(),
    keyMoments: zod_1.z
        .array(zod_1.z.object({
        timestamp: zod_1.z.string(),
        description: zod_1.z.string(),
    }))
        .optional(),
    extractedText: zod_1.z.string().optional(),
});
/**
 * Draft Generation Schema
 * Validates generated YouTube Short + Facebook post
 */
exports.DraftGenerationSchema = zod_1.z.object({
    youtubeShort: zod_1.z.object({
        title: zod_1.z.string().max(100),
        description: zod_1.z.string().max(5000),
        hashtags: zod_1.z.array(zod_1.z.string()).max(15),
    }),
    facebookPost: zod_1.z.object({
        text: zod_1.z.string().max(63206),
        hashtags: zod_1.z.array(zod_1.z.string()).max(30),
    }),
});
/**
 * Revision Request Schema
 */
exports.RevisionRequestSchema = zod_1.z.object({
    revisionType: zod_1.z.enum(['tone', 'content', 'hashtags', 'length', 'other']),
    specificRequest: zod_1.z.string(),
    targetPlatform: zod_1.z.enum(['youtube', 'facebook', 'both']).optional(),
});
//# sourceMappingURL=index.js.map