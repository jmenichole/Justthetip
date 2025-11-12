/**
 * /rain Command Handler
 * Mass tipping to random active users in a group
 * Author: 4eckd
 */

const { Markup } = require('telegraf');
const logger = require('../../src/utils/logger');
const db = require('../../db/database');
const { v4: uuidv4 } = require('uuid');
const tokenRegistry = require('../../src/utils/tokenRegistry');
const priceService = require('../../src/utils/priceService');

async function rainCommand(ctx) {
  const sender = ctx.state.user;
  const telegramId = ctx.from.id.toString();
  const username = ctx.from.username || ctx.from.first_name;
  const chatId = ctx.chat.id.toString();
  const chatType = ctx.chat.type;

  // Only works in groups
  if (chatType === 'private') {
    await ctx.reply(
      '❌ Rain command only works in groups!\n\n' +
      'Use this command in a group chat to distribute tips to multiple random users.'
    );
    return;
  }

  if (!sender || !sender.wallet) {
    await ctx.reply('❌ Wallet not registered. Use /register first.');
    return;
  }

  try {
    // Parse command: /rain <amount> <token> [recipient_count]
    const parts = ctx.message.text.split(/\s+/);

    if (parts.length < 3) {
      await ctx.reply(
        '❌ Invalid format.\n\n' +
        'Usage: `/rain <amount> <token> [recipients]`\n\n' +
        'Examples:\n' +
        '`/rain 100 BONK 10` - Send 100 BONK to 10 random users\n' +
        '`/rain 5 SOL` - Send 5 SOL to 5 random users (default)',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const amount = parseFloat(parts[1]);
    const token = parts[2].toUpperCase();
    const recipientCount = parts[3] ? parseInt(parts[3]) : 5;

    // Validate inputs
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ Invalid amount. Please enter a positive number.');
      return;
    }

    if (!tokenRegistry.TOKENS[token]) {
      const supportedTokens = Object.keys(tokenRegistry.TOKENS).join(', ');
      await ctx.reply(
        `❌ Unsupported token: ${token}\n\n` +
        `Supported tokens: ${supportedTokens}`
      );
      return;
    }

    if (isNaN(recipientCount) || recipientCount < 1) {
      await ctx.reply('❌ Recipient count must be at least 1.');
      return;
    }

    if (recipientCount > 50) {
      await ctx.reply('❌ Maximum 50 recipients per rain command.');
      return;
    }

    // Check group settings
    const groupSettings = await db.getTelegramGroupSettings(chatId);
    if (groupSettings && !groupSettings.enable_rain) {
      await ctx.reply('❌ Rain command is disabled in this group.');
      return;
    }

    const maxRainRecipients = groupSettings?.max_rain_recipients || 50;
    if (recipientCount > maxRainRecipients) {
      await ctx.reply(`❌ Maximum ${maxRainRecipients} recipients allowed in this group.`);
      return;
    }

    // Get active users from the group (last 24 hours)
    const activeUsers = await getActiveUsers(chatId, telegramId);

    if (activeUsers.length === 0) {
      await ctx.reply(
        '❌ No active users found in this group.\n\n' +
        'Users must have sent messages recently and be registered with JustTheTip.'
      );
      return;
    }

    if (activeUsers.length < recipientCount) {
      await ctx.reply(
        `⚠️ Only ${activeUsers.length} active user(s) available.\n\n` +
        `Reducing recipients to ${activeUsers.length}.`
      );
    }

    // Select random recipients
    const actualRecipients = Math.min(recipientCount, activeUsers.length);
    const recipients = selectRandomUsers(activeUsers, actualRecipients);

    // Calculate amount per recipient
    const amountPerRecipient = amount / actualRecipients;

    // Get USD value
    const prices = await priceService.getAllPrices();
    const totalUsdValue = amount * (prices[token] || 0);
    const usdPerRecipient = totalUsdValue / actualRecipients;

    // Create rain record
    const rainId = uuidv4();
    await db.createTelegramRain({
      id: rainId,
      senderTelegramId: telegramId,
      senderUsername: username,
      chatId,
      totalAmount: amount,
      currency: token,
      recipientCount: actualRecipients,
      amountPerRecipient,
      totalUsdValue,
      recipients: JSON.stringify(recipients.map(r => r.telegram_id)),
      status: 'pending'
    });

    // Build confirmation message
    let message = `🌧️ **Rain Command**\n\n`;
    message += `From: ${username}\n`;
    message += `Total: ${amount} ${token}\n`;
    message += `Recipients: ${actualRecipients} users\n`;
    message += `Per User: ${amountPerRecipient.toFixed(6)} ${token}\n`;
    if (totalUsdValue > 0) {
      message += `Total Value: ≈ $${totalUsdValue.toFixed(2)} USD\n`;
      message += `Per User: ≈ $${usdPerRecipient.toFixed(2)} USD\n`;
    }
    message += `\n`;
    message += `**Recipients:**\n`;
    recipients.forEach((r, i) => {
      message += `${i + 1}. ${r.telegram_username}\n`;
    });
    message += `\n*Next Step:* Click "Sign Transaction" to confirm.`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Sign & Rain', `sign_rain_${rainId}`),
        Markup.button.callback('❌ Cancel', `cancel_rain_${rainId}`)
      ]
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });

    logger.info(`Rain created: ${rainId} - ${amount} ${token} to ${actualRecipients} users`);

  } catch (error) {
    logger.error('Error in rain command:', error);
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}

/**
 * Get active users from group (last 24 hours)
 */
async function getActiveUsers(chatId, excludeUserId) {
  const activeUsers = await db.getActiveTelegramUsers(chatId, '24h');

  // Filter out sender and unregistered users
  return activeUsers.filter(user =>
    user.telegram_id !== excludeUserId &&
    user.wallet // Must have registered wallet
  );
}

/**
 * Select random users from array
 */
function selectRandomUsers(users, count) {
  const shuffled = [...users].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

module.exports = rainCommand;
