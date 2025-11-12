/**
 * Authentication Middleware for Telegram Bot
 * Verifies user registration before allowing certain commands
 * Author: 4eckd
 */

const db = require('../../db/database');
const logger = require('../../src/utils/logger');

/**
 * Check if user is registered
 */
async function isUserRegistered(telegramId) {
  try {
    const user = await db.getUserByTelegramId(telegramId);
    return user && user.wallet;
  } catch (error) {
    logger.error('Error checking user registration:', error);
    return false;
  }
}

/**
 * Required authentication middleware
 * Blocks command execution if user is not registered
 */
async function required(ctx, next) {
  const telegramId = ctx.from.id.toString();
  const registered = await isUserRegistered(telegramId);

  if (!registered) {
    await ctx.reply(
      '⚠️ *Wallet Not Registered*\n\n' +
      'You need to register your Solana wallet before using this command.\n\n' +
      'Use /register to get started.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Attach user info to context
  ctx.state.user = await db.getUserByTelegramId(telegramId);

  await next();
}

/**
 * Optional authentication middleware
 * Continues execution but attaches user info if registered
 */
async function optional(ctx, next) {
  const telegramId = ctx.from.id.toString();
  const registered = await isUserRegistered(telegramId);

  if (registered) {
    ctx.state.user = await db.getUserByTelegramId(telegramId);
  }

  await next();
}

module.exports = {
  required,
  optional,
  isUserRegistered
};
