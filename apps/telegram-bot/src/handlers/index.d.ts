import { Telegraf } from 'telegraf';
/**
 * Telegram Bot Handlers - MVP Flow
 *
 * Flow:
 * 1. User uploads photo/video → handlePhoto/handleVideo
 * 2. Create/resume session, save media
 * 3. Enqueue ANALYZE_MEDIA job
 * 4. Agent asks clarifying questions
 * 5. User answers → handleText → extract context
 * 6. When ready → Enqueue GENERATE_DRAFTS
 * 7. Present drafts → callback handler (approval) → Enqueue PUBLISH jobs
 *
 * THIN HANDLERS - no business logic, only orchestration!
 */
export declare function registerHandlers(bot: Telegraf): void;
//# sourceMappingURL=index.d.ts.map