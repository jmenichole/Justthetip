/**
 * /history Command Handler
 * Display transaction history
 * Author: 4eckd
 */

const { Markup } = require('telegraf');
const logger = require('../../src/utils/logger');
const db = require('../../db/database');

async function historyCommand(ctx) {
  const user = ctx.state.user;
  const telegramId = ctx.from.id.toString();

  if (!user || !user.wallet) {
    await ctx.reply('❌ Wallet not registered. Use /register first.');
    return;
  }

  try {
    // Get recent tips
    const sentTips = await db.getTelegramTipsBySender(telegramId, 10);
    const receivedTips = await db.getTelegramTipsByRecipient(telegramId, 10);

    if (sentTips.length === 0 && receivedTips.length === 0) {
      await ctx.reply(
        '📭 *No Transaction History*\n\n' +
        'You haven\'t sent or received any tips yet.\n\n' +
        'Use /tip to send your first tip!',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let message = '📜 *Transaction History*\n\n';

    // Sent tips
    if (sentTips.length > 0) {
      message += '*💸 Sent Tips*\n';
      for (const tip of sentTips.slice(0, 5)) {
        const status = getStatusEmoji(tip.status);
        const date = new Date(tip.created_at).toLocaleDateString();
        message += `${status} ${tip.amount} ${tip.currency} → ${tip.recipient_username}\n`;
        message += `   ${date} • ${tip.status}\n`;
        if (tip.signature) {
          message += `   [View](https://solscan.io/tx/${tip.signature})\n`;
        }
        message += '\n';
      }
    }

    // Received tips
    if (receivedTips.length > 0) {
      message += '*💰 Received Tips*\n';
      for (const tip of receivedTips.slice(0, 5)) {
        const status = getStatusEmoji(tip.status);
        const date = new Date(tip.created_at).toLocaleDateString();
        message += `${status} ${tip.amount} ${tip.currency} ← ${tip.sender_username}\n`;
        message += `   ${date} • ${tip.status}\n`;
        if (tip.signature) {
          message += `   [View](https://solscan.io/tx/${tip.signature})\n`;
        }
        message += '\n';
      }
    }

    message += `\nShowing latest ${Math.min(sentTips.length + receivedTips.length, 10)} transactions.`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🔄 Refresh', 'refresh_history'),
        Markup.button.callback('💰 Balance', 'check_balance')
      ]
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...keyboard
    });

    logger.info(`History command executed for user ${telegramId}`);

  } catch (error) {
    logger.error('Error in history command:', error);
    await ctx.reply('❌ An error occurred fetching history. Please try again.');
  }
}

/**
 * Get status emoji
 */
function getStatusEmoji(status) {
  const emojis = {
    pending: '⏳',
    signed: '✍️',
    confirmed: '✅',
    failed: '❌',
    cancelled: '🚫'
  };
  return emojis[status] || '❓';
}

module.exports = historyCommand;
