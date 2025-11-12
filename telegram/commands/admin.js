/**
 * Admin Commands Handler
 * Administrative functions for group management
 * Author: 4eckd
 */

const { Markup } = require('telegraf');
const logger = require('../../src/utils/logger');
const db = require('../../db/database');

/**
 * /admin command - Show admin menu
 */
async function adminCommand(ctx) {
  const chatId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  try {
    // Check if user is admin
    const chatMember = await ctx.telegram.getChatMember(chatId, userId);
    const isAdmin = ['administrator', 'creator'].includes(chatMember.status);

    if (!isAdmin) {
      await ctx.reply('❌ This command is for group administrators only.');
      return;
    }

    const message = `
🛡️ **Admin Panel**

**Available Commands:**

**Group Management:**
/settings - Configure group settings
/stats - View group statistics
/export - Export group data

**User Management:**
/ban @user - Ban user from bot
/unban @user - Unban user
/verify @user - Manually verify user

**Moderation:**
/purge_tips - Clear pending tips
/reset_limits - Reset rate limits

Use commands to manage this group.
    `.trim();

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('⚙️ Settings', 'admin_settings'),
        Markup.button.callback('📊 Stats', 'admin_stats')
      ],
      [
        Markup.button.callback('👥 Users', 'admin_users'),
        Markup.button.callback('🔄 Refresh', 'admin_refresh')
      ]
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });

  } catch (error) {
    logger.error('Error in admin command:', error);
    await ctx.reply('❌ An error occurred.');
  }
}

/**
 * /stats command - Group statistics
 */
async function statsCommand(ctx) {
  const chatId = ctx.chat.id.toString();
  const chatType = ctx.chat.type;

  if (chatType === 'private') {
    await ctx.reply('❌ Stats command only works in groups!');
    return;
  }

  try {
    await ctx.reply('⏳ Generating statistics...');

    const stats = await getGroupStats(chatId);

    const message = `
📊 **Group Statistics**

**Overview:**
• Total Tips: ${stats.total_tips}
• Total Volume: $${stats.total_volume_usd.toFixed(2)} USD
• Active Users: ${stats.active_users}
• Registered Users: ${stats.registered_users}

**Last 24 Hours:**
• Tips: ${stats.tips_24h}
• Volume: $${stats.volume_24h.toFixed(2)} USD

**Last 7 Days:**
• Tips: ${stats.tips_7d}
• Volume: $${stats.volume_7d.toFixed(2)} USD

**Most Popular Token:**
${stats.top_token || 'N/A'}

**Top Tipper:**
${stats.top_tipper || 'N/A'}
    `.trim();

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🔄 Refresh', 'refresh_stats'),
        Markup.button.callback('🏆 Leaderboard', 'show_leaderboard')
      ]
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });

    logger.info(`Stats shown for group ${chatId}`);

  } catch (error) {
    logger.error('Error in stats command:', error);
    await ctx.reply('❌ Failed to load statistics.');
  }
}

/**
 * /ban command - Ban user from bot
 */
async function banCommand(ctx) {
  const chatId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  try {
    // Check if user is admin
    const chatMember = await ctx.telegram.getChatMember(chatId, userId);
    const isAdmin = ['administrator', 'creator'].includes(chatMember.status);

    if (!isAdmin) {
      await ctx.reply('❌ Only administrators can ban users.');
      return;
    }

    // Parse target user
    const args = ctx.message.text.split(/\s+/).slice(1);
    if (args.length < 1) {
      await ctx.reply(
        '❌ Usage: `/ban @username [reason]`\n\n' +
        'Example: `/ban @spammer Excessive tipping requests`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const targetUsername = args[0].replace('@', '');
    const reason = args.slice(1).join(' ') || 'No reason provided';

    // Find user
    const targetUser = await db.getUserByTelegramUsername(targetUsername);
    if (!targetUser) {
      await ctx.reply(`❌ User @${targetUsername} not found in database.`);
      return;
    }

    // Ban user
    await db.banTelegramUser(chatId, targetUser.telegram_id, {
      bannedBy: userId.toString(),
      reason,
      bannedAt: new Date().toISOString()
    });

    await ctx.reply(
      `✅ User @${targetUsername} has been banned from using the bot in this group.\n\n` +
      `Reason: ${reason}`,
      { parse_mode: 'Markdown' }
    );

    logger.info(`User ${targetUser.telegram_id} banned from ${chatId} by ${userId}`);

  } catch (error) {
    logger.error('Error in ban command:', error);
    await ctx.reply('❌ Failed to ban user.');
  }
}

/**
 * /unban command - Unban user
 */
async function unbanCommand(ctx) {
  const chatId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  try {
    // Check if user is admin
    const chatMember = await ctx.telegram.getChatMember(chatId, userId);
    const isAdmin = ['administrator', 'creator'].includes(chatMember.status);

    if (!isAdmin) {
      await ctx.reply('❌ Only administrators can unban users.');
      return;
    }

    // Parse target user
    const args = ctx.message.text.split(/\s+/).slice(1);
    if (args.length < 1) {
      await ctx.reply(
        '❌ Usage: `/unban @username`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const targetUsername = args[0].replace('@', '');

    // Find user
    const targetUser = await db.getUserByTelegramUsername(targetUsername);
    if (!targetUser) {
      await ctx.reply(`❌ User @${targetUsername} not found.`);
      return;
    }

    // Unban user
    await db.unbanTelegramUser(chatId, targetUser.telegram_id);

    await ctx.reply(
      `✅ User @${targetUsername} has been unbanned.`,
      { parse_mode: 'Markdown' }
    );

    logger.info(`User ${targetUser.telegram_id} unbanned from ${chatId} by ${userId}`);

  } catch (error) {
    logger.error('Error in unban command:', error);
    await ctx.reply('❌ Failed to unban user.');
  }
}

/**
 * Get group statistics
 */
async function getGroupStats(chatId) {
  return await db.getTelegramGroupStats(chatId);
}

module.exports = {
  adminCommand,
  statsCommand,
  banCommand,
  unbanCommand
};
