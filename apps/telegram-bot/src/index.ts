import { Telegraf } from 'telegraf';
import { config } from '@ai-agent/config';
import { logger } from '@ai-agent/observability';
import { registerHandlers } from './handlers';

async function main() {
  logger.info('Starting Telegram bot...');

  const bot = new Telegraf(config.telegram.botToken);

  // Register all command handlers
  registerHandlers(bot);

  // Error handling
  bot.catch((err, ctx) => {
    logger.error({ err, updateId: ctx.update.update_id }, 'Bot error');
  });

  // Launch bot
  await bot.launch();
  logger.info('Telegram bot started successfully');

  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start Telegram bot');
  process.exit(1);
});
