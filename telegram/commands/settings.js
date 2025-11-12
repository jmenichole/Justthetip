/**
 * /settings Command Handler
 * Manage group settings (admin only)
 * Author: 4eckd
 */

const { Markup } = require('telegraf');
const logger = require('../../src/utils/logger');
const db = require('../../db/database');

async function settingsCommand(ctx) {
  const chatId = ctx.chat.id.toString();
  const chatType = ctx.chat.type;
  const userId = ctx.from.id;

  // Only works in groups
  if (chatType === 'private') {
    await ctx.reply('❌ Settings command only works in groups!');
    return;
  }

  try {
    // Check if user is admin
    const chatMember = await ctx.telegram.getChatMember(chatId, userId);
    const isAdmin = ['administrator', 'creator'].includes(chatMember.status);

    if (!isAdmin) {
      await ctx.reply('❌ Only group administrators can change settings.');
      return;
    }

    // Get current settings
    let settings = await db.getTelegramGroupSettings(chatId);

    // Create default settings if not exist
    if (!settings) {
      settings = {
        chat_id: chatId,
        allow_tipping: true,
        min_tip_amount: 0.01,
        allowed_tokens: 'SOL,USDC,BONK,USDT',
        require_registration: true,
        enable_leaderboard: true,
        enable_notifications: true,
        enable_rain: true,
        max_rain_recipients: 50
      };
      await db.createTelegramGroupSettings(settings);
    }

    // Parse subcommand
    const args = ctx.message.text.split(/\s+/).slice(1);
    const subcommand = args[0];

    if (!subcommand) {
      // Show current settings
      await showSettings(ctx, settings);
      return;
    }

    // Handle setting changes
    await handleSettingChange(ctx, chatId, subcommand, args.slice(1), settings);

  } catch (error) {
    logger.error('Error in settings command:', error);
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}

/**
 * Show current settings
 */
async function showSettings(ctx, settings) {
  const message = `
⚙️ **Group Settings**

**Tipping:**
• Enabled: ${settings.allow_tipping ? '✅' : '❌'}
• Min Amount: ${settings.min_tip_amount}
• Allowed Tokens: ${settings.allowed_tokens}
• Require Registration: ${settings.require_registration ? '✅' : '❌'}

**Features:**
• Leaderboard: ${settings.enable_leaderboard ? '✅' : '❌'}
• Notifications: ${settings.enable_notifications ? '✅' : '❌'}
• Rain Command: ${settings.enable_rain ? '✅' : '❌'}
• Max Rain Recipients: ${settings.max_rain_recipients}

**To change settings:**
\`/settings <option> <value>\`

**Examples:**
\`/settings min_tip 0.1\`
\`/settings tokens SOL,USDC\`
\`/settings enable leaderboard\`
\`/settings disable rain\`
  `.trim();

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🔄 Refresh', 'refresh_settings'),
      Markup.button.callback('❓ Help', 'settings_help')
    ]
  ]);

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

/**
 * Handle setting change
 */
async function handleSettingChange(ctx, chatId, subcommand, args, currentSettings) {
  let updated = false;
  let message = '';

  switch (subcommand) {
    case 'min_tip':
      if (args.length < 1) {
        message = '❌ Usage: `/settings min_tip <amount>`';
        break;
      }
      const minAmount = parseFloat(args[0]);
      if (isNaN(minAmount) || minAmount < 0) {
        message = '❌ Invalid amount';
        break;
      }
      await db.updateTelegramGroupSettings(chatId, { min_tip_amount: minAmount });
      message = `✅ Minimum tip amount set to ${minAmount}`;
      updated = true;
      break;

    case 'tokens':
      if (args.length < 1) {
        message = '❌ Usage: `/settings tokens <comma-separated-tokens>`';
        break;
      }
      const tokens = args[0].toUpperCase();
      await db.updateTelegramGroupSettings(chatId, { allowed_tokens: tokens });
      message = `✅ Allowed tokens set to: ${tokens}`;
      updated = true;
      break;

    case 'enable':
      if (args.length < 1) {
        message = '❌ Usage: `/settings enable <feature>`\n' +
                 'Features: tipping, leaderboard, notifications, rain';
        break;
      }
      const enableFeature = args[0].toLowerCase();
      updated = await toggleFeature(chatId, enableFeature, true);
      message = updated
        ? `✅ ${capitalizeFirst(enableFeature)} enabled`
        : `❌ Unknown feature: ${enableFeature}`;
      break;

    case 'disable':
      if (args.length < 1) {
        message = '❌ Usage: `/settings disable <feature>`';
        break;
      }
      const disableFeature = args[0].toLowerCase();
      updated = await toggleFeature(chatId, disableFeature, false);
      message = updated
        ? `✅ ${capitalizeFirst(disableFeature)} disabled`
        : `❌ Unknown feature: ${disableFeature}`;
      break;

    case 'max_rain':
      if (args.length < 1) {
        message = '❌ Usage: `/settings max_rain <count>`';
        break;
      }
      const maxRain = parseInt(args[0]);
      if (isNaN(maxRain) || maxRain < 1 || maxRain > 100) {
        message = '❌ Invalid count (1-100)';
        break;
      }
      await db.updateTelegramGroupSettings(chatId, { max_rain_recipients: maxRain });
      message = `✅ Maximum rain recipients set to ${maxRain}`;
      updated = true;
      break;

    default:
      message = '❌ Unknown setting. Use `/settings` to see available options.';
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });

  if (updated) {
    logger.info(`Group ${chatId} settings updated: ${subcommand} ${args.join(' ')}`);
  }
}

/**
 * Toggle feature on/off
 */
async function toggleFeature(chatId, feature, enabled) {
  const featureMap = {
    'tipping': 'allow_tipping',
    'leaderboard': 'enable_leaderboard',
    'notifications': 'enable_notifications',
    'rain': 'enable_rain'
  };

  const column = featureMap[feature];
  if (!column) {
    return false;
  }

  await db.updateTelegramGroupSettings(chatId, { [column]: enabled });
  return true;
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = settingsCommand;
