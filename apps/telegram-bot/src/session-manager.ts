/**
 * Session Manager - Handles media grouping and debouncing
 * 
 * Prevents duplicate sessions and duplicate "What would you like to create?" messages
 * when user sends multiple videos/photos in quick succession.
 */

import { database } from '@ai-agent/database';
import { SessionStatus } from '@ai-agent/core';
import { logger } from '@ai-agent/observability';

// In-memory store for pending question sends
// Key: sessionId, Value: timeout handle
const pendingQuestions = new Map<string, NodeJS.Timeout>();

// Track sessions that already had intent question sent
// Key: sessionId, Value: timestamp of last question
const sentQuestions = new Map<string, number>();

// Debounce window in milliseconds
const DEBOUNCE_MS = 3000; // 3 seconds

/**
 * Get or create active session for user
 * Reuses existing session if it's still in COLLECTING_MEDIA or ASKING_QUESTIONS state
 */
export async function getOrCreateActiveSession(brandProfileId: string): Promise<any> {
  // Look for existing active session
  let session = await database.contentSession.findFirst({
    where: {
      brandProfileId,
      status: {
        in: [SessionStatus.COLLECTING_MEDIA, SessionStatus.ASKING_QUESTIONS],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!session) {
    session = await database.contentSession.create({
      data: {
        brandProfileId,
        status: SessionStatus.COLLECTING_MEDIA,
      },
    });
    logger.info({ sessionId: session.id }, 'Created new session');
  } else {
    logger.info({ sessionId: session.id }, 'Reusing existing session');
  }

  return session;
}

/**
 * Schedule intent question to be sent after debounce window
 * Cancels previous pending question if user sends more media
 */
export function scheduleIntentQuestion(
  sessionId: string,
  sendQuestionFn: () => Promise<void>
): void {
  // Cancel any existing pending question for this session
  const existing = pendingQuestions.get(sessionId);
  if (existing) {
    clearTimeout(existing);
    logger.debug({ sessionId }, 'Cancelled previous pending question');
  }

  // Check if we already sent question for this session recently (within 30 seconds)
  const lastSent = sentQuestions.get(sessionId);
  if (lastSent && Date.now() - lastSent < 30000) {
    logger.debug({ sessionId }, 'Question already sent recently, skipping');
    return;
  }

  // Schedule new question send after debounce
  const timeout = setTimeout(async () => {
    try {
      await sendQuestionFn();
      sentQuestions.set(sessionId, Date.now());
      pendingQuestions.delete(sessionId);
      logger.info({ sessionId }, 'Intent question sent after debounce');
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to send intent question');
      pendingQuestions.delete(sessionId);
    }
  }, DEBOUNCE_MS);

  pendingQuestions.set(sessionId, timeout);
  logger.debug({ sessionId, debounceMs: DEBOUNCE_MS }, 'Scheduled intent question');
}

/**
 * Clear tracking for a session (call when session completes/cancels)
 */
export function clearSessionTracking(sessionId: string): void {
  const timeout = pendingQuestions.get(sessionId);
  if (timeout) {
    clearTimeout(timeout);
    pendingQuestions.delete(sessionId);
  }
  sentQuestions.delete(sessionId);
  logger.debug({ sessionId }, 'Cleared session tracking');
}

/**
 * Check if media belongs to a Telegram media group (album)
 */
export function getMediaGroupId(ctx: any): string | undefined {
  // Telegram groups photos/videos sent together with media_group_id
  return ctx.message?.media_group_id;
}

/**
 * Check if question was already sent for this session
 */
export function wasQuestionSent(sessionId: string): boolean {
  return sentQuestions.has(sessionId);
}
