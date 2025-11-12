/**
 * /leaderboard Command Handler
 * Display top tippers in a group
 * Author: 4eckd
 */

const { Markup } = require('telegraf');
const logger = require('../../src/utils/logger');
const db = require('../../db/database');

async function leaderboardCommand(ctx) {
  const chatId = ctx.chat.id.toString();
  const chatType = ctx.chat.type;

  // Parse period from command (default: 30 days)
  const args = ctx.message.text.split(/\s+/).slice(1);
  const period = args[0] || '30d';

  // Validate period
  const validPeriods = ['24h', '7d', '30d', 'all'];
  if (!validPeriods.includes(period)) {
    await ctx.reply(
      '❌ Invalid time period.\n\n' +
      'Valid periods: `24h`, `7d`, `30d`, `all`\n\n' +
      'Example: `/leaderboard 7d`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  try {
    // Determine scope (group or global)
    const isGroup = ['group', 'supergroup'].includes(chatType);
    const scope = isGroup ? chatId : 'global';

    await ctx.reply('⏳ Generating leaderboard...');

    // Get leaderboard data
    const leaderboard = await getLeaderboardData(scope, period);

    if (!leaderboard || leaderboard.length === 0) {
      await ctx.reply(
        '📭 *No Leaderboard Data*\n\n' +
        `No tips have been sent ${isGroup ? 'in this group' : 'globally'} in the selected period.\n\n` +
        'Be the first to tip!',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Build leaderboard message
    const periodName = getPeriodName(period);
    let message = `🏆 *Top Tippers ${isGroup ? '(This Group)' : '(Global)'}*\n`;
    message += `Period: ${periodName}\n\n`;

    leaderboard.forEach((user, index) => {
      const medal = getMedal(index);
      const rank = index + 1;

      message += `${medal} **${rank}. ${user.telegram_username || 'Anonymous'}**\n`;
      message += `   💰 $${user.total_usd.toFixed(2)} USD • ${user.tip_count} tips\n`;

      // Show top token
      if (user.top_token) {
        message += `   Top token: ${user.top_token}\n`;
      }

      message += '\n';
    });

    message += `_Showing top ${leaderboard.length} tippers_`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🔄 Refresh', `refresh_leaderboard_${period}`),
        Markup.button.callback('⏰ Change Period', 'change_period')
      ],
      [
        Markup.button.callback('💸 Start Tipping', 'start_tip')
      ]
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });

    logger.info(`Leaderboard shown for ${scope}, period: ${period}`);

  } catch (error) {
    logger.error('Error in leaderboard command:', error);
    await ctx.reply('❌ Failed to load leaderboard. Please try again.');
  }
}

/**
 * Get leaderboard data
 */
async function getLeaderboardData(scope, period) {
  // Convert period to SQL interval
  const interval = periodToInterval(period);

  if (scope === 'global') {
    // Global leaderboard
    return await db.getGlobalLeaderboard(interval, 10);
  } else {
    // Group-specific leaderboard
    return await db.getGroupLeaderboard(scope, interval, 10);
  }
}

/**
 * Convert period to SQL interval
 */
function periodToInterval(period) {
  const intervals = {
    '24h': '-1 day',
    '7d': '-7 days',
    '30d': '-30 days',
    'all': '-10 years' // Effectively all time
  };
  return intervals[period] || '-30 days';
}

/**
 * Get period display name
 */
function getPeriodName(period) {
  const names = {
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    'all': 'All Time'
  };
  return names[period] || 'Last 30 Days';
}

/**
 * Get medal emoji for rank
 */
function getMedal(index) {
  const medals = ['🥇', '🥈', '🥉'];
  return medals[index] || `${index + 1}.`;
}

module.exports = leaderboardCommand;
