/**
 * Notification Service for Telegram Bot
 * Handles sending notifications to users
 * Author: 4eckd
 */

const logger = require('../../src/utils/logger');

class NotificationService {
  constructor(bot) {
    this.bot = bot;
  }

  /**
   * Notify user of received tip
   */
  async notifyTipReceived(recipientTelegramId, tipData) {
    try {
      const { amount, token, senderUsername, amountUsd, signature } = tipData;

      let message = '🎁 *You received a tip!*\n\n';
      message += `Amount: \`${amount} ${token}\`\n`;
      message += `From: ${senderUsername}\n`;

      if (amountUsd) {
        message += `USD Value: $${amountUsd.toFixed(2)}\n`;
      }

      if (signature) {
        message += `\n[View Transaction](https://solscan.io/tx/${signature})`;
      }

      const keyboard = {
        inline_keyboard: [
          [
            { text: '💰 View Balance', callback_data: 'view_balance' },
            { text: '🔄 Tip Back', callback_data: `tip_back_${tipData.senderTelegramId}` }
          ]
        ]
      };

      await this.bot.telegram.sendMessage(
        recipientTelegramId,
        message,
        {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
          reply_markup: keyboard
        }
      );

      logger.info(`Tip received notification sent to ${recipientTelegramId}`);
    } catch (error) {
      logger.error('Error sending tip received notification:', error);
    }
  }

  /**
   * Notify sender that tip was confirmed
   */
  async notifyTipConfirmed(senderTelegramId, tipData) {
    try {
      const { amount, token, recipientUsername, signature } = tipData;

      let message = '✅ *Tip Confirmed!*\n\n';
      message += `Amount: \`${amount} ${token}\`\n`;
      message += `To: ${recipientUsername}\n`;
      message += `Status: Confirmed on Solana\n`;

      if (signature) {
        message += `\n[View on Solscan](https://solscan.io/tx/${signature})`;
      }

      await this.bot.telegram.sendMessage(
        senderTelegramId,
        message,
        {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        }
      );

      logger.info(`Tip confirmed notification sent to ${senderTelegramId}`);
    } catch (error) {
      logger.error('Error sending tip confirmed notification:', error);
    }
  }

  /**
   * Notify user of failed tip
   */
  async notifyTipFailed(senderTelegramId, tipData, errorMessage) {
    try {
      const { amount, token, recipientUsername } = tipData;

      let message = '❌ *Tip Failed*\n\n';
      message += `Amount: \`${amount} ${token}\`\n`;
      message += `To: ${recipientUsername}\n`;
      message += `\nReason: ${errorMessage}\n`;
      message += `\nPlease try again or contact support if the issue persists.`;

      await this.bot.telegram.sendMessage(
        senderTelegramId,
        message,
        { parse_mode: 'Markdown' }
      );

      logger.info(`Tip failed notification sent to ${senderTelegramId}`);
    } catch (error) {
      logger.error('Error sending tip failed notification:', error);
    }
  }

  /**
   * Notify user of wallet registration success
   */
  async notifyRegistrationSuccess(telegramId, walletAddress) {
    try {
      const message = `
✅ *Wallet Registered Successfully!*

Your Solana wallet is now connected to JustTheTip.

Wallet: \`${walletAddress}\`

*What's Next?*
• Check your balance: /balance
• Send a tip: /tip @username 10 SOL
• View your wallet: /wallet

Happy tipping! 🎉
      `.trim();

      await this.bot.telegram.sendMessage(
        telegramId,
        message,
        { parse_mode: 'Markdown' }
      );

      logger.info(`Registration success notification sent to ${telegramId}`);
    } catch (error) {
      logger.error('Error sending registration success notification:', error);
    }
  }

  /**
   * Send custom notification
   */
  async sendNotification(telegramId, message, options = {}) {
    try {
      await this.bot.telegram.sendMessage(
        telegramId,
        message,
        {
          parse_mode: 'Markdown',
          ...options
        }
      );

      logger.info(`Custom notification sent to ${telegramId}`);
    } catch (error) {
      logger.error('Error sending custom notification:', error);
    }
  }
}

module.exports = NotificationService;
