import { Telegraf, Context } from 'telegraf';
import { queueService } from '@ai-agent/queue';
import { JobType } from '@ai-agent/core';
import { logger } from '@ai-agent/observability';

/**
 * Register all Telegram bot command handlers
 * 
 * IMPORTANT: Handlers must stay THIN
 * - Validate input
 * - Enqueue job
 * - Respond to user
 * - NO business logic here
 */
export function registerHandlers(bot: Telegraf) {
  // Start command
  bot.command('start', handleStart);
  
  // Create content command
  bot.command('create', handleCreate);
  
  // Text messages
  bot.on('text', handleText);
}

async function handleStart(ctx: Context) {
  await ctx.reply(
    'Welcome to AI Content Agent! 🤖\n\n' +
    'Send me a message describing the content you want to create, ' +
    'and I\'ll generate and publish it to your social platforms.'
  );
}

async function handleCreate(ctx: Context) {
  // Extract message (thin validation only)
  const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  const userRequest = message.replace('/create', '').trim();
  
  if (!userRequest) {
    await ctx.reply('Please provide a description of the content you want to create.');
    return;
  }

  try {
    // Enqueue analysis job (async processing)
    await queueService.enqueue(JobType.ANALYZE_CONTENT, {
      userId: ctx.from?.id.toString(),
      contentRequest: userRequest,
      telegramChatId: ctx.chat?.id,
    });

    // Immediate response (don't wait for processing)
    await ctx.reply(
      '✅ Got it! I\'m analyzing your request and will start creating content...\n\n' +
      'I\'ll notify you when it\'s ready!'
    );

    logger.info({ userId: ctx.from?.id, request: userRequest }, 'Content creation requested');
  } catch (error) {
    logger.error({ error, userId: ctx.from?.id }, 'Failed to enqueue content creation');
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

async function handleText(ctx: Context) {
  // For non-command text, treat as content creation request
  if (ctx.message && 'text' in ctx.message) {
    const userRequest = ctx.message.text;
    
    try {
      await queueService.enqueue(JobType.ANALYZE_CONTENT, {
        userId: ctx.from?.id.toString(),
        contentRequest: userRequest,
        telegramChatId: ctx.chat?.id,
      });

      await ctx.reply(
        '✅ Analyzing your request...\n\n' +
        'I\'ll create content and notify you when ready!'
      );
    } catch (error) {
      logger.error({ error }, 'Failed to process text message');
      await ctx.reply('Sorry, I couldn\'t process that. Please try again.');
    }
  }
}
