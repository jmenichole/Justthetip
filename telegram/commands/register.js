/**
 * /register Command Handler
 * Wallet registration flow
 * Author: 4eckd
 */

const { Markup } = require('telegraf');
const db = require('../../db/database');
const logger = require('../../src/utils/logger');
const { v4: uuidv4 } = require('uuid');

async function registerCommand(ctx) {
  const telegramId = ctx.from.id.toString();
  const username = ctx.from.username || ctx.from.first_name;

  try {
    // Check if already registered
    const existingUser = await db.getUserByTelegramId(telegramId);

    if (existingUser && existingUser.wallet) {
      await ctx.reply(
        '✅ *Already Registered*\n\n' +
        `Your wallet is already registered!\n\n` +
        `Wallet: \`${existingUser.wallet}\`\n\n` +
        'Use /balance to check your balance.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Generate registration nonce
    const nonce = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store nonce
    await db.createRegistrationNonce({
      nonce,
      telegramId,
      platform: 'telegram',
      expiresAt
    });

    // Generate registration URL
    const registrationUrl = generateRegistrationUrl(nonce, telegramId);

    const message = `
🔐 *Wallet Registration*

To use JustTheTip, you need to register your Solana wallet.

*How it works:*
1. Click the button below to open the registration page
2. Connect your Solana wallet (Phantom, Solflare, etc.)
3. Sign a message to verify ownership
4. Done! Your wallet is registered

*Security:*
• You only sign a verification message
• We never access your private keys
• Registration link expires in 10 minutes

Click the button below to get started:
    `.trim();

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('🔓 Register Wallet', registrationUrl)],
      [Markup.button.callback('❓ Why do I need to register?', 'register_info')]
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });

    logger.info(`Registration link generated for user ${telegramId}`);

  } catch (error) {
    logger.error('Error in register command:', error);
    await ctx.reply('❌ An error occurred during registration. Please try again.');
  }
}

/**
 * Generate registration URL
 */
function generateRegistrationUrl(nonce, telegramId) {
  const baseUrl = process.env.FRONTEND_URL || 'https://jmenichole.github.io/Justthetip';
  return `${baseUrl}/sign.html?nonce=${nonce}&platform=telegram&userId=${telegramId}`;
}

module.exports = registerCommand;
