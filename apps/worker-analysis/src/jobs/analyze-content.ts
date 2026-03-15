import { Job } from 'bullmq';
import { aiService } from '@ai-agent/ai';
import { database } from '@ai-agent/database';
import { queueService } from '@ai-agent/queue';
import { JobType, ContentStatus } from '@ai-agent/core';
import { logger } from '@ai-agent/observability';

/**
 * Analyze content job
 * 
 * Responsibility: ONLY analysis
 * - Extract content type, topics, tone, style
 * - Update content record
 * - Enqueue generation job
 * 
 * Does NOT:
 * - Generate content (that's worker-generation)
 * - Render media (that's worker-render)
 * - Publish (that's worker-publish)
 */
export async function analyzeContentJob(job: Job) {
  const { contentId, contentRequest } = job.data;

  logger.info({ contentId, job: job.id }, 'Starting content analysis');

  // Update status
  await database.content.update({
    where: { id: contentId },
    data: { status: ContentStatus.ANALYZING },
  });

  try {
    // Call AI service (business logic in package)
    const analysis = await aiService.analyzeContent(contentRequest);

    logger.info({ contentId, analysis }, 'Analysis completed');

    // Update content with analysis results
    await database.content.update({
      where: { id: contentId },
      data: {
        metadata: analysis,
        status: ContentStatus.GENERATING,
      },
    });

    // Enqueue next job (generation)
    await queueService.enqueue(JobType.GENERATE_CONTENT, {
      contentId,
      analysis,
    });

    return {
      success: true,
      analysis,
    };
  } catch (error) {
    logger.error({ contentId, error }, 'Analysis failed');

    // Update status
    await database.content.update({
      where: { id: contentId },
      data: { status: ContentStatus.FAILED },
    });

    throw error;
  }
}
