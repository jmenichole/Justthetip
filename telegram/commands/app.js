const logger = require('../utils/logger');

/**
 * Open the JustTheTip Mini App (Telegram Web App)
 * Usage: /app
 */
async function appCommand(ctx) {
  const telegramId = ctx.from.id.toString();
  const username = ctx.from.username || ctx.from.first_name;

  logger.info(`App command from ${username} (${telegramId})`);

  // Mini App URL - should be configured in environment
  const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL || 'https://your-mini-app-url.com';

  try {
    await ctx.reply(
      `💼 *JustTheTip Wallet*\n\n` +
      `Access your full-featured wallet interface with:\n\n` +
      `✅ Portfolio dashboard with charts\n` +
      `✅ Complete transaction history\n` +
      `✅ Easy tip sending interface\n` +
      `✅ Account settings & preferences\n` +
      `✅ Real-time balance updates\n\n` +
      `Click the button below to open your wallet 👇`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '💼 Open Wallet',
                web_app: { url: miniAppUrl }
              }
            ],
            [
              {
                text: '📚 Learn More',
                url: 'https://jmenichole.github.io/Justthetip/'
              }
            ]
          ]
        }
      }
    );
  } catch (error) {
    logger.error('Error in app command:', error);
    await ctx.reply(
      '❌ Failed to load mini app. Please try again or contact support.',
      { parse_mode: 'Markdown' }
    );
  }
}

module.exports = appCommand;
