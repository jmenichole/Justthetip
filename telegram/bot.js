/**
 * JustTheTip Telegram Bot
 * Main bot implementation with command routing and event handling
 * Author: 4eckd
 *
 * Architecture:
 * - Telegraf framework for modern Telegram Bot API
 * - Command-based routing
 * - Middleware for authentication and rate limiting
 * - Integration with existing Solana smart contracts
 */

const { Telegraf, Markup } = require('telegraf');
const { JustTheTipSDK } = require('../contracts/sdk');
const db = require('../db/database');
const logger = require('../src/utils/logger');

// Import middleware
const authMiddleware = require('./middleware/auth');
const rateLimitMiddleware = require('./middleware/rateLimit');
const loggingMiddleware = require('./middleware/logging');

// Import command handlers
const startCommand = require('./commands/start');
const helpCommand = require('./commands/help');
const registerCommand = require('./commands/register');
const balanceCommand = require('./commands/balance');
const tipCommand = require('./commands/tip');
const walletCommand = require('./commands/wallet');
const historyCommand = require('./commands/history');
const priceCommand = require('./commands/price');
const appCommand = require('./commands/app');
const rainCommand = require('./commands/rain');
const leaderboardCommand = require('./commands/leaderboard');
const settingsCommand = require('./commands/settings');
const { adminCommand, statsCommand, banCommand, unbanCommand } = require('./commands/admin');

// Import services
const NotificationService = require('./services/notificationService');
const TippingService = require('./services/tippingService');

class JustTheTipTelegramBot {
  constructor(config) {
    this.config = {
      token: config.token || process.env.TELEGRAM_BOT_TOKEN,
      solanaRpcUrl: config.solanaRpcUrl || process.env.SOLANA_RPC_URL,
      solanaCluster: config.solanaCluster || process.env.SOLANA_CLUSTER || 'devnet',
      webhookUrl: config.webhookUrl || process.env.TELEGRAM_WEBHOOK_URL,
      usePolling: config.usePolling !== undefined ? config.usePolling : true,
      ...config
    };

    if (!this.config.token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    // Initialize Telegraf bot
    this.bot = new Telegraf(this.config.token);

    // Initialize Solana SDK
    this.sdk = new JustTheTipSDK({
      rpcUrl: this.config.solanaRpcUrl,
      cluster: this.config.solanaCluster
    });

    // Initialize services
    this.notificationService = new NotificationService(this.bot);
    this.tippingService = new TippingService(this.sdk, db);

    // Setup middleware and handlers
    this.setupMiddleware();
    this.setupCommands();
    this.setupCallbacks();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware chain
   */
  setupMiddleware() {
    // Logging middleware (first)
    this.bot.use(loggingMiddleware);

    // Rate limiting
    this.bot.use(rateLimitMiddleware);

    // Authentication (for protected commands)
    // Note: Some commands like /start and /help don't require auth
  }

  /**
   * Setup command handlers
   */
  setupCommands() {
    logger.info('Setting up Telegram command handlers...');

    // Public commands (no auth required)
    this.bot.command('start', startCommand);
    this.bot.command('help', helpCommand);

    // User commands (auth required)
    this.bot.command('register', authMiddleware.optional, registerCommand);
    this.bot.command('wallet', authMiddleware.required, walletCommand);
    this.bot.command('balance', authMiddleware.required, balanceCommand);
    this.bot.command('tip', authMiddleware.required, tipCommand);
    this.bot.command('history', authMiddleware.required, historyCommand);
    this.bot.command('price', priceCommand);
    this.bot.command('app', appCommand);

    // Group commands
    this.bot.command('rain', authMiddleware.required, rainCommand);
    this.bot.command('leaderboard', leaderboardCommand);
    this.bot.command('settings', settingsCommand);

    // Admin commands
    this.bot.command('admin', adminCommand);
    this.bot.command('stats', statsCommand);
    this.bot.command('ban', banCommand);
    this.bot.command('unban', unbanCommand);

    // Text message handler (for reply-based tipping)
    this.bot.on('text', async (ctx) => {
      const text = ctx.message.text;

      // Check if replying to a message and text looks like a tip
      if (ctx.message.reply_to_message && /^\/?tip\s+\d+/.test(text)) {
        await tipCommand(ctx);
      }
    });

    logger.info('Command handlers registered');
  }

  /**
   * Setup callback query handlers (inline buttons)
   */
  setupCallbacks() {
    logger.info('Setting up callback handlers...');

    // Sign transaction callback
    this.bot.action(/^sign_(.+)$/, async (ctx) => {
      const txId = ctx.match[1];
      await this.handleSignTransaction(ctx, txId);
    });

    // Cancel transaction callback
    this.bot.action(/^cancel_(.+)$/, async (ctx) => {
      const txId = ctx.match[1];
      await this.handleCancelTransaction(ctx, txId);
    });

    // Sign rain callback
    this.bot.action(/^sign_rain_(.+)$/, async (ctx) => {
      const rainId = ctx.match[1];
      await this.handleSignRain(ctx, rainId);
    });

    // Cancel rain callback
    this.bot.action(/^cancel_rain_(.+)$/, async (ctx) => {
      const rainId = ctx.match[1];
      await this.handleCancelRain(ctx, rainId);
    });

    // View balance callback
    this.bot.action('view_balance', async (ctx) => {
      await balanceCommand(ctx);
      await ctx.answerCbQuery();
    });

    // Tip back callback
    this.bot.action(/^tip_back_(.+)$/, async (ctx) => {
      const recipientId = ctx.match[1];
      await ctx.reply(`Reply to this message with: /tip <amount> <token>`);
      await ctx.answerCbQuery();
    });

    logger.info('Callback handlers registered');
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    this.bot.catch((err, ctx) => {
      logger.error('Telegram bot error:', err);

      const errorMessage = this.config.solanaCluster === 'mainnet-beta'
        ? 'An error occurred. Please try again later.'
        : `Error: ${err.message}`;

      ctx.reply(errorMessage).catch(e => {
        logger.error('Failed to send error message:', e);
      });
    });

    // Handle process errors
    process.once('SIGINT', () => this.stop('SIGINT'));
    process.once('SIGTERM', () => this.stop('SIGTERM'));
  }

  /**
   * Handle sign transaction callback
   */
  async handleSignTransaction(ctx, txId) {
    try {
      await ctx.answerCbQuery('Opening transaction for signing...');

      // Get transaction from database
      const tip = await db.getTelegramTipById(txId);

      if (!tip) {
        await ctx.reply('❌ Transaction not found or expired.');
        return;
      }

      if (tip.sender_telegram_id !== ctx.from.id.toString()) {
        await ctx.reply('❌ You are not authorized to sign this transaction.');
        return;
      }

      if (tip.status !== 'pending') {
        await ctx.reply(`❌ Transaction is already ${tip.status}.`);
        return;
      }

      // Generate wallet connection link
      const walletUrl = this.generateWalletConnectionUrl(txId);

      await ctx.reply(
        '🔐 *Sign Transaction*\n\n' +
        'Click the button below to open your wallet and sign this transaction.\n\n' +
        `Amount: \`${tip.amount} ${tip.currency}\`\n` +
        `To: ${tip.recipient_username || 'User'}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔓 Open Wallet', url: walletUrl }],
              [{ text: '❌ Cancel', callback_data: `cancel_${txId}` }]
            ]
          }
        }
      );
    } catch (error) {
      logger.error('Error handling sign transaction:', error);
      await ctx.answerCbQuery('Error processing request');
    }
  }

  /**
   * Handle cancel transaction callback
   */
  async handleCancelTransaction(ctx, txId) {
    try {
      await ctx.answerCbQuery('Transaction cancelled');

      // Update transaction status
      await db.updateTelegramTipStatus(txId, 'cancelled');

      await ctx.editMessageText(
        '❌ *Transaction Cancelled*\n\n' +
        'The tip has been cancelled.',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      logger.error('Error handling cancel transaction:', error);
      await ctx.answerCbQuery('Error cancelling transaction');
    }
  }

  /**
   * Handle sign rain callback
   */
  async handleSignRain(ctx, rainId) {
    try {
      await ctx.answerCbQuery('Processing rain...');

      const rain = await db.getTelegramRainById(rainId);

      if (!rain) {
        await ctx.reply('❌ Rain not found or expired.');
        return;
      }

      if (rain.sender_telegram_id !== ctx.from.id.toString()) {
        await ctx.reply('❌ You are not authorized to sign this rain.');
        return;
      }

      // Generate wallet connection link for signing
      const walletUrl = this.generateWalletConnectionUrl(rainId, 'rain');

      await ctx.reply(
        '🌧️ *Sign Rain Transaction*\n\n' +
        `Total: ${rain.total_amount} ${rain.currency}\n` +
        `Recipients: ${rain.recipient_count} users\n` +
        `Per user: ${rain.amount_per_recipient} ${rain.currency}\n\n` +
        'Click below to sign in your wallet.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔓 Open Wallet', url: walletUrl }],
              [{ text: '❌ Cancel', callback_data: `cancel_rain_${rainId}` }]
            ]
          }
        }
      );
    } catch (error) {
      logger.error('Error handling sign rain:', error);
      await ctx.answerCbQuery('Error processing rain');
    }
  }

  /**
   * Handle cancel rain callback
   */
  async handleCancelRain(ctx, rainId) {
    try {
      await ctx.answerCbQuery('Rain cancelled');

      await db.updateTelegramRainStatus(rainId, 'cancelled');

      await ctx.editMessageText(
        '❌ *Rain Cancelled*\n\n' +
        'The rain has been cancelled.',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      logger.error('Error handling cancel rain:', error);
      await ctx.answerCbQuery('Error cancelling rain');
    }
  }

  /**
   * Generate wallet connection URL for signing
   */
  generateWalletConnectionUrl(txId, type = 'tip') {
    const baseUrl = process.env.FRONTEND_URL || 'https://jmenichole.github.io/Justthetip';
    return `${baseUrl}/sign.html?tx=${txId}&platform=telegram&type=${type}`;
  }

  /**
   * Start the bot
   */
  async start() {
    try {
      logger.info('Starting JustTheTip Telegram Bot...');
      logger.info(`Cluster: ${this.config.solanaCluster}`);
      logger.info(`RPC URL: ${this.config.solanaRpcUrl}`);

      if (this.config.usePolling) {
        // Development mode: use polling
        logger.info('Using polling mode (development)');
        await this.bot.launch();
      } else {
        // Production mode: use webhooks
        logger.info(`Setting up webhook: ${this.config.webhookUrl}`);
        await this.bot.telegram.setWebhook(this.config.webhookUrl);
        await this.bot.launch({
          webhook: {
            domain: this.config.webhookUrl,
            port: this.config.webhookPort || 3000
          }
        });
      }

      logger.info('✅ Telegram bot started successfully');
      logger.info(`Bot username: @${this.bot.botInfo.username}`);

      // Set bot commands menu
      await this.setBotCommands();

    } catch (error) {
      logger.error('Failed to start Telegram bot:', error);
      throw error;
    }
  }

  /**
   * Set bot commands menu in Telegram
   */
  async setBotCommands() {
    try {
      await this.bot.telegram.setMyCommands([
        { command: 'start', description: 'Start the bot' },
        { command: 'help', description: 'Show help message' },
        { command: 'register', description: 'Register your wallet' },
        { command: 'app', description: 'Open wallet mini app' },
        { command: 'wallet', description: 'View wallet info' },
        { command: 'balance', description: 'Check your balance' },
        { command: 'tip', description: 'Send a tip' },
        { command: 'rain', description: 'Mass tip (groups only)' },
        { command: 'leaderboard', description: 'View top tippers' },
        { command: 'history', description: 'View transaction history' },
        { command: 'price', description: 'Check token prices' },
        { command: 'settings', description: 'Group settings (admin)' },
        { command: 'stats', description: 'Group statistics' }
      ]);
      logger.info('Bot commands menu set');
    } catch (error) {
      logger.error('Failed to set bot commands:', error);
    }
  }

  /**
   * Stop the bot
   */
  async stop(signal = 'SIGTERM') {
    logger.info(`Received ${signal}, stopping bot...`);
    await this.bot.stop(signal);
    logger.info('Bot stopped');
  }

  /**
   * Get bot instance (for external use, e.g., webhooks)
   */
  getBot() {
    return this.bot;
  }
}

module.exports = JustTheTipTelegramBot;
