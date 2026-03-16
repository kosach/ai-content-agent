"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const config_1 = require("@ai-agent/config");
const observability_1 = require("@ai-agent/observability");
const ai_1 = require("@ai-agent/ai");
const handlers_1 = require("./handlers");
async function main() {
    observability_1.logger.info('Starting Telegram bot...');
    // Initialize Gemini client
    ai_1.geminiClient.initialize(config_1.config.ai.gemini.apiKey);
    observability_1.logger.info('Gemini client initialized');
    const bot = new telegraf_1.Telegraf(config_1.config.telegram.botToken);
    // Register all command handlers
    (0, handlers_1.registerHandlers)(bot);
    // Error handling
    bot.catch((err, ctx) => {
        observability_1.logger.error({ err, updateId: ctx.update.update_id }, 'Bot error');
    });
    // Launch bot
    await bot.launch();
    observability_1.logger.info('Telegram bot started successfully');
    // Graceful shutdown
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
main().catch((error) => {
    observability_1.logger.fatal({ error }, 'Failed to start Telegram bot');
    process.exit(1);
});
//# sourceMappingURL=index.js.map