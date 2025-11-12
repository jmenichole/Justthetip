/**
 * /start Command Handler
 * Welcome message and bot introduction
 * Author: 4eckd
 */

const { Markup } = require('telegraf');
const logger = require('../../src/utils/logger');

async function startCommand(ctx) {
  const username = ctx.from.first_name || ctx.from.username || 'there';

  const welcomeMessage = `
🎉 *Welcome to JustTheTip, ${username}!*

I'm a non-custodial Solana tipping bot that lets you send tips directly on Telegram.

✨ *Features:*
• Send SOL, USDC, BONK, and USDT tips
• Non-custodial - you control your wallet
• Fast Solana blockchain transactions
• Secure signature-based authentication

🚀 *Getting Started:*
1. Register your Solana wallet: /register
2. Check your balance: /balance
3. Send a tip: /tip @username 10 SOL

💡 *Need Help?*
Use /help to see all available commands.

🔐 *Security Note:*
JustTheTip never asks for your private keys. All transactions are signed in your own wallet.
  `.trim();

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📝 Register Wallet', 'register_start')],
    [Markup.button.callback('❓ Help', 'help_menu')],
    [Markup.button.url('🌐 Website', 'https://jmenichole.github.io/Justthetip')],
  ]);

  try {
    await ctx.reply(welcomeMessage, {
      parse_mode: 'Markdown',
      ...keyboard
    });

    logger.info(`Start command executed for user ${ctx.from.id}`);
  } catch (error) {
    logger.error('Error in start command:', error);
    await ctx.reply('An error occurred. Please try again.');
  }
}

module.exports = startCommand;
