#!/usr/bin/env node

/**
 * JustTheTip Telegram Bot Starter
 * Main entry point for the Telegram bot
 * Author: 4eckd
 */

require('dotenv').config();

const JustTheTipTelegramBot = require('./telegram/bot');
const db = require('./db/database');
const { extendDatabaseWithTelegram } = require('./db/telegramExtensions');
const logger = require('./src/utils/logger');

// Banner
console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║        JustTheTip Telegram Bot v1.0.0              ║
║        Non-Custodial Solana Tipping Bot            ║
║                                                    ║
╚════════════════════════════════════════════════════╝
`);

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const required = ['TELEGRAM_BOT_TOKEN', 'SOLANA_RPC_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Please check your .env file');
    process.exit(1);
  }

  logger.info('✅ Environment variables validated');
}

/**
 * Initialize database
 */
async function initializeDatabase() {
  try {
    logger.info('Initializing database...');

    // Extend database with Telegram support
    extendDatabaseWithTelegram(db);

    logger.info('✅ Database initialized');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Start the bot
 */
async function startBot() {
  try {
    // Validate environment
    validateEnvironment();

    // Initialize database
    await initializeDatabase();

    // Create bot configuration
    const config = {
      token: process.env.TELEGRAM_BOT_TOKEN,
      solanaRpcUrl: process.env.SOLANA_RPC_URL,
      solanaCluster: process.env.SOLANA_CLUSTER || 'devnet',
      webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
      usePolling: process.env.TELEGRAM_USE_POLLING !== 'false', // Default to polling for development
    };

    logger.info('Starting Telegram bot...');
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Solana Cluster: ${config.solanaCluster}`);
    logger.info(`Mode: ${config.usePolling ? 'Polling' : 'Webhook'}`);

    // Create and start bot
    const bot = new JustTheTipTelegramBot(config);
    await bot.start();

    logger.info('✅ Telegram bot is running!');
    logger.info(`Bot: @${bot.bot.botInfo.username}`);
    logger.info('Press Ctrl+C to stop');

  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Start the bot
startBot().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
