/**
 * Tipping Service for Telegram Bot
 * Handles tip transaction logic
 * Author: 4eckd
 */

const logger = require('../../src/utils/logger');
const { PublicKey, Transaction } = require('@solana/web3.js');
const { v4: uuidv4 } = require('uuid');

class TippingService {
  constructor(sdk, db) {
    this.sdk = sdk;
    this.db = db;
  }

  /**
   * Create a tip transaction
   */
  async createTip(senderTelegramId, recipientTelegramId, amount, token) {
    try {
      // Get user wallets
      const sender = await this.db.getUserByTelegramId(senderTelegramId);
      const recipient = await this.db.getUserByTelegramId(recipientTelegramId);

      if (!sender || !sender.wallet) {
        throw new Error('Sender wallet not registered');
      }

      if (!recipient || !recipient.wallet) {
        throw new Error('Recipient wallet not registered');
      }

      // Get user PDAs (using telegram IDs as discord IDs for compatibility)
      const senderDiscordId = `telegram_${senderTelegramId}`;
      const recipientDiscordId = `telegram_${recipientTelegramId}`;

      // Build transaction based on token type
      let transaction;

      if (token === 'SOL') {
        transaction = await this.sdk.buildTipSolTx(
          senderDiscordId,
          recipientDiscordId,
          amount
        );
      } else {
        transaction = await this.sdk.buildTipSplTokenTx(
          senderDiscordId,
          recipientDiscordId,
          amount,
          token
        );
      }

      return {
        transaction,
        senderWallet: sender.wallet,
        recipientWallet: recipient.wallet
      };
    } catch (error) {
      logger.error('Error creating tip transaction:', error);
      throw error;
    }
  }

  /**
   * Process a signed tip transaction
   */
  async processTip(tipId, signedTransaction) {
    try {
      // Get tip details
      const tip = await this.db.getTelegramTipById(tipId);

      if (!tip) {
        throw new Error('Tip not found');
      }

      if (tip.status !== 'pending') {
        throw new Error(`Tip is already ${tip.status}`);
      }

      // Update status to signed
      await this.db.updateTelegramTipStatus(tipId, 'signed');

      // Submit transaction to Solana
      const signature = await this.sdk.submitTransaction(signedTransaction);

      // Update with signature
      await this.db.updateTelegramTip(tipId, {
        signature,
        signedAt: new Date().toISOString()
      });

      // Wait for confirmation
      await this.sdk.confirmTransaction(signature);

      // Update status to confirmed
      await this.db.updateTelegramTipStatus(tipId, 'confirmed', signature);
      await this.db.updateTelegramTip(tipId, {
        confirmedAt: new Date().toISOString()
      });

      logger.info(`Tip ${tipId} confirmed with signature ${signature}`);

      return {
        success: true,
        signature,
        tip
      };
    } catch (error) {
      logger.error('Error processing tip:', error);

      // Update status to failed
      await this.db.updateTelegramTip(tipId, {
        status: 'failed',
        errorMessage: error.message
      });

      throw error;
    }
  }

  /**
   * Cancel a pending tip
   */
  async cancelTip(tipId, userId) {
    try {
      const tip = await this.db.getTelegramTipById(tipId);

      if (!tip) {
        throw new Error('Tip not found');
      }

      if (tip.sender_telegram_id !== userId) {
        throw new Error('Unauthorized: Only the sender can cancel this tip');
      }

      if (tip.status !== 'pending') {
        throw new Error(`Cannot cancel tip with status: ${tip.status}`);
      }

      await this.db.updateTelegramTipStatus(tipId, 'cancelled');

      logger.info(`Tip ${tipId} cancelled by user ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error cancelling tip:', error);
      throw error;
    }
  }

  /**
   * Get tip statistics for a user
   */
  async getUserStats(telegramId) {
    try {
      const sentTips = await this.db.getTelegramTipsBySender(telegramId);
      const receivedTips = await this.db.getTelegramTipsByRecipient(telegramId);

      const stats = {
        totalSent: sentTips.filter(t => t.status === 'confirmed').length,
        totalReceived: receivedTips.filter(t => t.status === 'confirmed').length,
        totalSentAmount: sentTips
          .filter(t => t.status === 'confirmed')
          .reduce((sum, t) => sum + (t.amount_usd || 0), 0),
        totalReceivedAmount: receivedTips
          .filter(t => t.status === 'confirmed')
          .reduce((sum, t) => sum + (t.amount_usd || 0), 0),
        pending: sentTips.filter(t => t.status === 'pending').length
      };

      return stats;
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }
}

module.exports = TippingService;
