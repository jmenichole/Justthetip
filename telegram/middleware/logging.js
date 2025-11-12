/**
 * Logging Middleware for Telegram Bot
 * Logs all incoming messages and commands
 * Author: 4eckd
 */

const logger = require('../../src/utils/logger');

async function loggingMiddleware(ctx, next) {
  const start = Date.now();
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || 'Unknown';
  const chatType = ctx.chat?.type;

  let logMessage = `Telegram: User ${userId} (${username})`;

  if (ctx.message?.text) {
    const text = ctx.message.text;
    const command = text.split(' ')[0];
    logMessage += ` - Command: ${command}`;
  } else if (ctx.callbackQuery) {
    logMessage += ` - Callback: ${ctx.callbackQuery.data}`;
  }

  logMessage += ` - Chat: ${chatType}`;

  logger.info(logMessage);

  try {
    await next();

    const duration = Date.now() - start;
    logger.info(`Telegram: Request completed in ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`Telegram: Request failed in ${duration}ms - ${error.message}`);
    throw error;
  }
}

module.exports = loggingMiddleware;
