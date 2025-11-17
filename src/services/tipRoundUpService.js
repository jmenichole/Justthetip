/**
 * JustTheTip - Tip Round-Up Service
 * Optional user feature to support bot development
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

/**
 * Tip Round-Up Service
 * Allows users to optionally add a small amount to support the bot
 * COMPLIANCE: This is a SEPARATE transaction, not a percentage of the tip
 */
class TipRoundUpService {
  constructor(database) {
    this.database = database;
    this.supportWallet = process.env.JUSTTHETIP_SUPPORT_WALLET;
  }

  /**
   * Check if user has round-up enabled
   * @param {string} userId - Discord user ID
   * @returns {Promise<boolean>} True if enabled
   */
  async isRoundUpEnabled(userId) {
    const settings = await this.database.getUserSettings(userId);
    return settings?.roundup_enabled !== false; // Default: enabled
  }

  /**
   * Calculate suggested round-up amount based on tip size
   * @param {number} tipAmount - Original tip amount in USD
   * @returns {number} Suggested round-up amount
   */
  calculateRoundUpAmount(tipAmount) {
    if (tipAmount <= 1.00) {
      return 0.05; // $0.05 for small tips
    } else if (tipAmount <= 10.00) {
      return 0.10; // $0.10 for medium tips
    } else if (tipAmount <= 50.00) {
      return 0.25; // $0.25 for large tips
    } else {
      return 0.50; // $0.50 for very large tips
    }
  }

  /**
   * Create round-up confirmation message
   * @param {number} tipAmount - Original tip amount
   * @param {number} roundUpAmount - Suggested round-up
   * @param {string} recipientUsername - Recipient's username
   * @returns {Object} Discord message with buttons
   */
  createRoundUpPrompt(tipAmount, roundUpAmount, recipientUsername) {
    const totalWithRoundUp = tipAmount + roundUpAmount;

    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('💰 Confirm Your Tip')
      .setDescription(`You're about to tip **${recipientUsername}**`)
      .addFields(
        { 
          name: 'Tip Amount', 
          value: `$${tipAmount.toFixed(2)} USD`, 
          inline: true 
        },
        { 
          name: 'Recipient Gets', 
          value: `$${tipAmount.toFixed(2)} USD`, 
          inline: true 
        }
      )
      .setFooter({ text: 'You can disable round-up prompts in settings' });

    // Add round-up suggestion
    embed.addFields({
      name: '💝 Support JustTheTip (Optional)',
      value: `Round up by **$${roundUpAmount.toFixed(2)}** to support bot development?\n` +
             `Total: $${totalWithRoundUp.toFixed(2)} (Recipient still gets $${tipAmount.toFixed(2)})`,
      inline: false
    });

    // Create buttons
    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('tip_with_roundup')
          .setLabel(`Tip $${totalWithRoundUp.toFixed(2)} (includes $${roundUpAmount.toFixed(2)} support)`)
          .setStyle(ButtonStyle.Success)
          .setEmoji('💝'),
        new ButtonBuilder()
          .setCustomId('tip_without_roundup')
          .setLabel(`Tip $${tipAmount.toFixed(2)} only`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji('💸'),
        new ButtonBuilder()
          .setCustomId('tip_cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❌')
      );

    return {
      embeds: [embed],
      components: [buttons],
      ephemeral: true
    };
  }

  /**
   * Process tip with round-up
   * IMPORTANT: Two separate transactions
   * @param {Object} tipData - Tip information
   * @param {boolean} includeRoundUp - Whether to include round-up
   * @returns {Promise<Object>} Transaction results
   */
  async processTipWithRoundUp(tipData, includeRoundUp) {
    const { fromUserId, toUserId, amount, currency } = tipData;
    const results = {
      tip_transaction: null,
      roundup_transaction: null,
      success: false
    };

    try {
      // TRANSACTION 1: Original tip (ALWAYS unchanged)
      // This goes directly from user → recipient, amount NEVER modified
      const tipTransaction = await this.database.createTransaction({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount: amount, // ORIGINAL AMOUNT, UNCHANGED
        currency: currency,
        type: 'tip',
        status: 'pending'
      });

      results.tip_transaction = tipTransaction;

      // TRANSACTION 2: Optional round-up (SEPARATE transaction)
      // This is a donation from user → bot support wallet
      if (includeRoundUp) {
        const roundUpAmount = this.calculateRoundUpAmount(amount);
        
        const roundUpTransaction = await this.database.createTransaction({
          from_user_id: fromUserId,
          to_wallet: this.supportWallet, // Bot support wallet
          amount: roundUpAmount, // SEPARATE amount
          currency: currency,
          type: 'donation', // NOT a tip
          description: 'JustTheTip development support',
          status: 'pending'
        });

        results.roundup_transaction = roundUpTransaction;

        // Track round-up for analytics
        await this.database.trackRoundUp({
          user_id: fromUserId,
          amount: roundUpAmount,
          tip_amount: amount,
          timestamp: new Date()
        });
      }

      results.success = true;
      return results;

    } catch (error) {
      console.error('Error processing tip with round-up:', error);
      throw error;
    }
  }

  /**
   * Create confirmation message after successful tip
   * @param {Object} results - Transaction results
   * @param {boolean} includedRoundUp - Whether round-up was included
   * @returns {Object} Discord embed
   */
  createConfirmationMessage(results, includedRoundUp) {
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Tip Sent Successfully!')
      .addFields(
        { 
          name: 'Tip Transaction', 
          value: `TX: \`${results.tip_transaction.signature}\``,
          inline: false
        }
      );

    if (includedRoundUp && results.roundup_transaction) {
      embed.addFields(
        { 
          name: '💝 Thank You for Supporting JustTheTip!', 
          value: `Your round-up of $${results.roundup_transaction.amount.toFixed(2)} helps keep the bot running.\n` +
                 `TX: \`${results.roundup_transaction.signature}\``,
          inline: false
        }
      );
      embed.setFooter({ text: 'You rock! 🎸' });
    }

    return { embeds: [embed], ephemeral: true };
  }

  /**
   * Toggle round-up prompts for user
   * @param {string} userId - Discord user ID
   * @param {boolean} enabled - Enable or disable
   */
  async setRoundUpEnabled(userId, enabled) {
    await this.database.updateUserSettings(userId, {
      roundup_enabled: enabled
    });
  }

  /**
   * Get round-up statistics for user
   * @param {string} userId - Discord user ID
   * @returns {Promise<Object>} Round-up stats
   */
  async getRoundUpStats(userId) {
    const roundUps = await this.database.getUserRoundUps(userId);

    const stats = {
      total_roundups: roundUps.length,
      total_amount_contributed: roundUps.reduce((sum, ru) => sum + ru.amount, 0),
      average_roundup: 0,
      first_roundup: roundUps[0]?.timestamp,
      last_roundup: roundUps[roundUps.length - 1]?.timestamp
    };

    if (stats.total_roundups > 0) {
      stats.average_roundup = stats.total_amount_contributed / stats.total_roundups;
    }

    return stats;
  }

  /**
   * Generate thank you message for top supporters
   * @param {string} userId - Discord user ID
   * @returns {Object} Discord embed
   */
  async generateThankYouMessage(userId) {
    const stats = await this.getRoundUpStats(userId);

    if (stats.total_amount_contributed >= 10.00) {
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🌟 You\'re a JustTheTip Supporter!')
        .setDescription(`Thank you for contributing **$${stats.total_amount_contributed.toFixed(2)}** to support the bot!`)
        .addFields(
          { name: 'Total Round-Ups', value: stats.total_roundups.toString(), inline: true },
          { name: 'Average Contribution', value: `$${stats.average_roundup.toFixed(2)}`, inline: true }
        )
        .setFooter({ text: 'Your support keeps JustTheTip free for everyone! 💜' });

      return { embeds: [embed] };
    }

    return null;
  }
}

/**
 * COMPLIANCE NOTES:
 * 
 * 1. Round-up is OPTIONAL - User must explicitly choose
 * 2. Round-up is SEPARATE transaction - Not a percentage of the tip
 * 3. Original tip amount NEVER changes - Recipient gets full amount
 * 4. Clear disclosure - User knows where the money goes
 * 5. Can be disabled - User controls their experience
 * 
 * This is NOT money transmission because:
 * - We don't take a cut of the tip
 * - We don't modify the tip amount
 * - User chooses to make a separate donation
 * - Two distinct blockchain transactions
 */

module.exports = TipRoundUpService;
