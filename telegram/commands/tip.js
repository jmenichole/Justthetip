/**
 * /tip Command Handler
 * Send tips to other users
 * Author: 4eckd
 */

const { Markup } = require('telegraf');
const logger = require('../../src/utils/logger');
const db = require('../../db/database');
const { v4: uuidv4 } = require('uuid');
const tokenRegistry = require('../../src/utils/tokenRegistry');
const priceService = require('../../src/utils/priceService');

async function tipCommand(ctx) {
  const sender = ctx.state.user;
  const telegramId = ctx.from.id.toString();
  const username = ctx.from.username || ctx.from.first_name;

  if (!sender || !sender.wallet) {
    await ctx.reply('❌ Wallet not registered. Use /register first.');
    return;
  }

  try {
    // Parse tip command
    const tipData = await parseTipCommand(ctx);

    if (!tipData) {
      return; // Error already sent in parseTipCommand
    }

    const { recipient, amount, token } = tipData;

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ Invalid amount. Please enter a positive number.');
      return;
    }

    // Validate token
    if (!tokenRegistry.TOKENS[token]) {
      const supportedTokens = Object.keys(tokenRegistry.TOKENS).join(', ');
      await ctx.reply(
        `❌ Unsupported token: ${token}\n\n` +
        `Supported tokens: ${supportedTokens}`
      );
      return;
    }

    // Check recipient is registered
    const recipientUser = await db.getUserByTelegramId(recipient.id.toString());

    if (!recipientUser || !recipientUser.wallet) {
      await ctx.reply(
        `❌ User ${recipient.username || recipient.first_name} has not registered a wallet yet.\n\n` +
        'They need to use /register first.'
      );
      return;
    }

    // Prevent self-tipping
    if (sender.telegram_id === recipientUser.telegram_id) {
      await ctx.reply('❌ You cannot tip yourself!');
      return;
    }

    // Get USD value
    const prices = await priceService.getAllPrices();
    const usdValue = amount * (prices[token] || 0);

    // Create tip record
    const tipId = uuidv4();
    await db.createTelegramTip({
      id: tipId,
      senderTelegramId: telegramId,
      senderUsername: username,
      recipientTelegramId: recipient.id.toString(),
      recipientUsername: recipient.username || recipient.first_name,
      chatId: ctx.chat.id.toString(),
      chatType: ctx.chat.type,
      messageId: ctx.message.message_id,
      replyToMessageId: ctx.message.reply_to_message?.message_id,
      amount,
      currency: token,
      amountUsd: usdValue,
      status: 'pending'
    });

    // Build confirmation message
    let message = `💸 *Send Tip*\n\n`;
    message += `From: ${username}\n`;
    message += `To: ${recipient.username || recipient.first_name}\n`;
    message += `Amount: ${amount} ${token}\n`;
    if (usdValue > 0) {
      message += `Value: ≈ $${usdValue.toFixed(2)} USD\n`;
    }
    message += `\n`;
    message += `*Next Step:*\n`;
    message += `Click "Sign Transaction" to confirm and sign in your wallet.`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Sign Transaction', `sign_${tipId}`),
        Markup.button.callback('❌ Cancel', `cancel_${tipId}`)
      ]
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });

    logger.info(`Tip created: ${tipId} - ${amount} ${token} from ${telegramId} to ${recipient.id}`);

  } catch (error) {
    logger.error('Error in tip command:', error);
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}

/**
 * Parse tip command to extract recipient, amount, and token
 */
async function parseTipCommand(ctx) {
  const text = ctx.message.text;
  const replyTo = ctx.message.reply_to_message;

  // Case 1: Reply to a message - /tip 10 SOL
  if (replyTo) {
    const recipient = replyTo.from;
    const parts = text.split(/\s+/).slice(1); // Remove /tip

    if (parts.length < 2) {
      await ctx.reply(
        '❌ Invalid format.\n\n' +
        'When replying to a message, use:\n' +
        '`/tip <amount> <token>`\n\n' +
        'Example: `/tip 10 SOL`'
      );
      return null;
    }

    const amount = parseFloat(parts[0]);
    const token = parts[1].toUpperCase();

    return { recipient, amount, token };
  }

  // Case 2: Mention user - /tip @username 10 SOL
  const parts = text.split(/\s+/);

  if (parts.length < 4) {
    await ctx.reply(
      '❌ Invalid format.\n\n' +
      'Use one of these formats:\n\n' +
      '1. Reply to a message:\n' +
      '   `/tip <amount> <token>`\n' +
      '   Example: `/tip 10 SOL`\n\n' +
      '2. Mention a user:\n' +
      '   `/tip @username <amount> <token>`\n' +
      '   Example: `/tip @alice 10 SOL`',
      { parse_mode: 'Markdown' }
    );
    return null;
  }

  const mentionText = parts[1];
  const amount = parseFloat(parts[2]);
  const token = parts[3].toUpperCase();

  // Extract username from mention
  const mentionUsername = mentionText.replace('@', '');

  // Try to find user by username in chat
  // Note: This is limited by Telegram API - user must have interacted with bot
  try {
    const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, mentionUsername);
    const recipient = chatMember.user;

    return { recipient, amount, token };
  } catch (error) {
    await ctx.reply(
      `❌ Could not find user ${mentionText}\n\n` +
      'Make sure:\n' +
      '• The username is correct\n' +
      '• The user has interacted with this bot\n\n' +
      'Tip: You can also reply to their message and use `/tip <amount> <token>`'
    );
    return null;
  }
}

module.exports = tipCommand;
