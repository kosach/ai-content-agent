export const QUEUE_NAMES = {
  ANALYSIS: 'content-analysis',
  GENERATION: 'content-generation',
  RENDERING: 'media-rendering',
  PUBLISHING: 'content-publishing',
} as const;

export const MAX_RETRIES = {
  ANALYSIS: 3,
  GENERATION: 3,
  RENDERING: 2,
  PUBLISHING: 5,
} as const;

export const JOB_TIMEOUT = {
  ANALYSIS: 5 * 60 * 1000, // 5 minutes
  GENERATION: 10 * 60 * 1000, // 10 minutes
  RENDERING: 15 * 60 * 1000, // 15 minutes
  PUBLISHING: 5 * 60 * 1000, // 5 minutes
} as const;
