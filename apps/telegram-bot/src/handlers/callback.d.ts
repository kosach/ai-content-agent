import { Context } from 'telegraf';
/**
 * Callback Query Handler
 *
 * Handles inline button clicks from draft preview message
 *
 * Callback data format:
 * - approve:{draftPackageId}
 * - revise:{draftPackageId}
 * - cancel:{sessionId}
 */
export declare function handleCallbackQuery(ctx: Context): Promise<void>;
//# sourceMappingURL=callback.d.ts.map