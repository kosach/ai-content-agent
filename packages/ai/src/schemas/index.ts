import { z } from 'zod';

/**
 * Media Analysis Schema
 * Validates AI analysis output for uploaded media
 */
export const MediaAnalysisSchema = z.object({
  topics: z.array(z.string()).min(1).max(10),
  mood: z.string(),
  objects: z.array(z.string()),
  suggestedTitle: z.string(),
  contentType: z.string(),
  targetAudience: z.string(),
  keyMoments: z
    .array(
      z.object({
        timestamp: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  extractedText: z.string().optional(),
});

export type MediaAnalysis = z.infer<typeof MediaAnalysisSchema>;

/**
 * Draft Generation Schema
 * Validates generated YouTube Short + Facebook post
 */
export const DraftGenerationSchema = z.object({
  youtubeShort: z.object({
    title: z.string().max(100),
    description: z.string().max(5000),
    hashtags: z.array(z.string()).max(15),
  }),
  facebookPost: z.object({
    text: z.string().max(63206),
    hashtags: z.array(z.string()).max(30),
  }),
});

export type DraftGeneration = z.infer<typeof DraftGenerationSchema>;

/**
 * Revision Request Schema
 */
export const RevisionRequestSchema = z.object({
  revisionType: z.enum(['tone', 'content', 'hashtags', 'length', 'other']),
  specificRequest: z.string(),
  targetPlatform: z.enum(['youtube', 'facebook', 'both']).optional(),
});

export type RevisionRequest = z.infer<typeof RevisionRequestSchema>;
