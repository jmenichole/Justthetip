/**
 * Enhanced Airdrop Command with Time Duration
 * Supports customizable expiration times (1h, 6h, 12h, 24h, 7d, 30d)
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * 
 * This file is part of JustTheTip.
 * 
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * See LICENSE file in the project root for full license information.
 * 
 * SPDX-License-Identifier: MIT
 * 
 * This software may not be sold commercially without permission.
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class AirdropCommand {
  constructor(database) {
    this.db = database;
  }

  /**
   * Get airdrop command builder
   */
  getCommand() {
    return new SlashCommandBuilder()
      .setName('airdrop')
      .setDescription('Create an airdrop for community members')
      .addStringOption(option =>
        option.setName('currency')
          .setDescription('Currency type')
          .setRequired(true)
          .addChoices(
            { name: 'SOL', value: 'SOL' },
            { name: 'USDC', value: 'USDC' }
          ))
      .addNumberOption(option =>
        option.setName('amount')
          .setDescription('Total amount to distribute')
          .setRequired(true)
          .setMinValue(0.01))
      .addIntegerOption(option =>
        option.setName('recipients')
          .setDescription('Number of recipients')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(100))
      .addStringOption(option =>
        option.setName('duration')
          .setDescription('How long the airdrop lasts (default: 1 hour)')
          .setRequired(false)
          .addChoices(
            { name: '1 Hour (Default)', value: '1h' },
            { name: '6 Hours', value: '6h' },
            { name: '12 Hours', value: '12h' },
            { name: '24 Hours (1 Day)', value: '24h' },
            { name: '7 Days', value: '7d' },
            { name: '30 Days', value: '30d' }
          ))
      .addStringOption(option =>
        option.setName('message')
          .setDescription('Optional message to display')
          .setRequired(false));
  }

  /**
   * Parse duration string to milliseconds
   * @param {string} duration - Duration string (e.g., '1h', '24h', '7d')
   * @returns {number} - Duration in milliseconds
   */
  parseDuration(duration) {
    const durationMap = {
      '1h': 1 * 60 * 60 * 1000,      // 1 hour
      '6h': 6 * 60 * 60 * 1000,      // 6 hours
      '12h': 12 * 60 * 60 * 1000,    // 12 hours
      '24h': 24 * 60 * 60 * 1000,    // 24 hours (1 day)
      '7d': 7 * 24 * 60 * 60 * 1000, // 7 days
      '30d': 30 * 24 * 60 * 60 * 1000 // 30 days
    };
    return durationMap[duration] || durationMap['24h']; // Default to 24h
  }

  /**
   * Format duration for display
   */
  formatDuration(duration) {
    const durationText = {
      '1h': '1 hour',
      '6h': '6 hours',
      '12h': '12 hours',
      '24h': '24 hours (1 day)',
      '7d': '7 days',
      '30d': '30 days'
    };
    return durationText[duration] || duration;
  }

  /**
   * Handle airdrop command
   */
  async execute(interaction) {
    try {
      const currency = interaction.options.getString('currency');
      const totalAmount = interaction.options.getNumber('amount');
      const numRecipients = interaction.options.getInteger('recipients');
      const duration = interaction.options.getString('duration') || '1h'; // Default to 1 hour
      const message = interaction.options.getString('message') || `${totalAmount} ${currency} Airdrop!`;

      const userId = interaction.user.id;
      const username = interaction.user.username;

      // Calculate per-recipient amount
      const amountPerUser = totalAmount / numRecipients;

      // Calculate expiration time (default 1 hour)
      const durationMs = this.parseDuration(duration);
      const expiresAt = Date.now() + durationMs;
      const durationText = this.formatDuration(duration);

      // Generate unique airdrop ID
      const airdropId = `AIRDROP_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Create airdrop data
      const airdropData = {
        airdropId,
        creator: userId,
        creatorName: username,
        currency,
        totalAmount,
        amountPerUser,
        maxRecipients: numRecipients,
        claimedCount: 0,
        message,
        expiresAt,
        duration: durationText,
        active: true,
        messageId: null,
        channelId: interaction.channel.id,
        guildId: interaction.guild.id
      };

      // Save to database
      const created = await this.db.createAirdrop(airdropData);
      
      if (!created && this.db.db) {
        return await interaction.reply({
          content: '❌ Failed to create airdrop. Please try again.',
          ephemeral: true
        });
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#00ff88')
        .setTitle('🎁 ' + message)
        .setDescription(`**${username}** is giving away **${totalAmount} ${currency}** to **${numRecipients}** lucky people!`)
        .addFields(
          { name: '💰 Per Person', value: `${amountPerUser.toFixed(4)} ${currency}`, inline: true },
          { name: '👥 Remaining', value: `${numRecipients}/${numRecipients}`, inline: true },
          { name: '⏰ Duration', value: durationText, inline: true },
          { name: '⌛ Expires', value: `<t:${Math.floor(expiresAt / 1000)}:R>`, inline: false }
        )
        .setFooter({ text: `Airdrop ID: ${airdropId}` })
        .setTimestamp();

      // Create claim button
      const button = new ButtonBuilder()
        .setCustomId(`claim_airdrop_${airdropId}`)
        .setLabel('🎁 Claim Airdrop')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder()
        .addComponents(button);

      // Send airdrop message
      const airdropMessage = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true
      });

      // Update airdrop with message ID
      await this.db.updateAirdrop(airdropId, { messageId: airdropMessage.id });

      // Log airdrop creation to admin channel
      try {
        const { logAirdrop } = require('../utils/transactionLogger');
        await logAirdrop(interaction.client, {
          creatorId: userId,
          totalAmount: totalAmount,
          currency: currency,
          maxRecipients: numRecipients,
          duration: durationText,
          message: message,
          airdropId: airdropId
        });
      } catch (logError) {
        console.error('Failed to log airdrop:', logError);
      }

      // Schedule expiration check
      this.scheduleExpiration(airdropId, durationMs, interaction.channel);

    } catch (error) {
      console.error('Error creating airdrop:', error);
      await interaction.reply({
        content: '❌ Failed to create airdrop: ' + error.message,
        ephemeral: true
      });
    }
  }

  /**
   * Handle claim button interaction
   */
  async handleClaim(interaction) {
    try {
      const airdropId = interaction.customId.replace('claim_airdrop_', '');
      const userId = interaction.user.id;
      const username = interaction.user.username;

      // Get airdrop data
      const airdrop = await this.db.getAirdrop(airdropId);

      if (!airdrop) {
        return await interaction.reply({
          content: '❌ This airdrop no longer exists.',
          ephemeral: true
        });
      }

      // Check if expired
      if (Date.now() > airdrop.expiresAt) {
        return await interaction.reply({
          content: `❌ This airdrop expired ${this.formatTimeAgo(airdrop.expiresAt)}.`,
          ephemeral: true
        });
      }

      // Check if already claimed
      if (airdrop.claimedUsers && airdrop.claimedUsers.includes(userId)) {
        return await interaction.reply({
          content: '❌ You have already claimed this airdrop!',
          ephemeral: true
        });
      }

      // Check if max recipients reached
      const claimedCount = airdrop.claimedUsers ? airdrop.claimedUsers.length : 0;
      if (claimedCount >= airdrop.maxRecipients) {
        return await interaction.reply({
          content: '❌ All airdrop slots have been claimed!',
          ephemeral: true
        });
      }

      // Check if user has registered wallet
      const trustBadgeService = require('../utils/trustBadge');
      let hasWallet = false;
      try {
        await trustBadgeService.requireBadge(userId);
        hasWallet = true;
      } catch (error) {
        // User doesn't have wallet registered - hold airdrop for 24 hours
        hasWallet = false;
      }

      if (!hasWallet) {
        // Mark as pending claim
        await this.db.createPendingAirdrop({
          airdropId,
          userId,
          username,
          amount: airdrop.amountPerUser,
          currency: airdrop.currency,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
        });

        // Send DM to user
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor('#fbbf24')
            .setTitle('🎁 Airdrop Claimed - Wallet Registration Required')
            .setDescription(
              `You've claimed **${airdrop.amountPerUser.toFixed(4)} ${airdrop.currency}** from an airdrop!\n\n` +
              `To receive your airdrop, you need to register your wallet within **24 hours**.\n\n` +
              `**How to register:**\n` +
              `1. Use the \`/register-wallet\` command in any server with JustTheTip\n` +
              `2. Connect your Solana wallet\n` +
              `3. Your airdrop will be automatically credited!\n\n` +
              `⏰ **Your claim expires:** <t:${Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000)}:R>`
            )
            .setFooter({ text: 'JustTheTip - Non-Custodial Tipping Bot' })
            .setTimestamp();

          await interaction.user.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.error('Failed to send DM to user:', dmError);
          // Continue even if DM fails
        }

        return await interaction.reply({
          content: 
            `✅ Airdrop claimed! **${airdrop.amountPerUser.toFixed(4)} ${airdrop.currency}** reserved for you.\n\n` +
            `⚠️ You need to register your wallet within **24 hours** to receive it.\n` +
            `Use \`/register-wallet\` to get started. Check your DMs for more info!`,
          ephemeral: true
        });
      }

      // User has wallet - proceed with normal claim
      const claimed = await this.db.claimAirdrop(airdropId, userId);

      if (!claimed && this.db.db) {
        return await interaction.reply({
          content: '❌ Failed to claim airdrop. Please try again.',
          ephemeral: true
        });
      }

      // Credit user balance (if database connected)
      await this.db.creditBalance(userId, airdrop.amountPerUser, airdrop.currency);

      // Update message
      const newClaimedCount = claimedCount + 1;
      const remaining = airdrop.maxRecipients - newClaimedCount;

      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setFields(
          { name: '💰 Per Person', value: `${airdrop.amountPerUser.toFixed(4)} ${airdrop.currency}`, inline: true },
          { name: '👥 Remaining', value: `${remaining}/${airdrop.maxRecipients}`, inline: true },
          { name: '⏰ Duration', value: airdrop.duration, inline: true },
          { name: '⌛ Expires', value: `<t:${Math.floor(airdrop.expiresAt / 1000)}:R>`, inline: false }
        );

      // Disable button if all claimed
      if (remaining <= 0) {
        updatedEmbed.setColor('#ff4757').setDescription(`**${airdrop.creatorName}**'s airdrop is complete! 🎉`);
        
        const disabledButton = new ButtonBuilder()
          .setCustomId(`claim_airdrop_${airdropId}`)
          .setLabel('🎁 All Claimed!')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const row = new ActionRowBuilder().addComponents(disabledButton);
        
        await interaction.message.edit({
          embeds: [updatedEmbed],
          components: [row]
        });
      } else {
        await interaction.message.edit({
          embeds: [updatedEmbed]
        });
      }

      // Send confirmation
      await interaction.reply({
        content: `✅ You claimed **${airdrop.amountPerUser.toFixed(4)} ${airdrop.currency}**!`,
        ephemeral: true
      });

      // Log airdrop claim to admin channel
      try {
        const { logAirdropClaim } = require('../utils/transactionLogger');
        await logAirdropClaim(interaction.client, {
          userId: userId,
          amount: airdrop.amountPerUser,
          currency: airdrop.currency,
          hasWallet: hasWallet,
          airdropId: airdropId
        });
      } catch (logError) {
        console.error('Failed to log airdrop claim:', logError);
      }

    } catch (error) {
      console.error('Error claiming airdrop:', error);
      await interaction.reply({
        content: '❌ Failed to claim airdrop: ' + error.message,
        ephemeral: true
      });
    }
  }

  /**
   * Schedule airdrop expiration
   */
  scheduleExpiration(airdropId, durationMs, channel) {
    setTimeout(async () => {
      try {
        const airdrop = await this.db.getAirdrop(airdropId);
        if (!airdrop || !airdrop.active) return;

        // Calculate unclaimed amount
        const claimedCount = airdrop.claimedUsers ? airdrop.claimedUsers.length : 0;
        const unclaimedCount = airdrop.maxRecipients - claimedCount;
        const unclaimedAmount = unclaimedCount * airdrop.amountPerUser;

        // Mark as expired
        await this.db.updateAirdrop(airdropId, { active: false });

        // Return unclaimed funds to creator if any
        if (unclaimedAmount > 0) {
          try {
            await this.db.creditBalance(airdrop.creator_id, unclaimedAmount, airdrop.currency);
            console.log(`Returned ${unclaimedAmount} ${airdrop.currency} from expired airdrop ${airdropId} to creator ${airdrop.creator_id}`);
          } catch (creditError) {
            console.error('Error returning unclaimed funds:', creditError);
          }
        }

        // Update message if possible
        if (airdrop.messageId) {
          try {
            const message = await channel.messages.fetch(airdrop.messageId);
            
            let description = `**${airdrop.creatorName}**'s airdrop has expired.`;
            if (unclaimedAmount > 0) {
              description += `\n\n💰 **${unclaimedAmount.toFixed(4)} ${airdrop.currency}** returned to creator (${unclaimedCount} unclaimed slots).`;
            } else {
              description += '\n\n🎉 All slots were claimed!';
            }

            const expiredEmbed = EmbedBuilder.from(message.embeds[0])
              .setColor(unclaimedAmount > 0 ? '#95a5a6' : '#00ff88')
              .setDescription(description);

            const disabledButton = new ButtonBuilder()
              .setCustomId(`claim_airdrop_${airdropId}`)
              .setLabel('🎁 Expired')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(disabledButton);

            await message.edit({
              embeds: [expiredEmbed],
              components: [row]
            });
          } catch (err) {
            console.error('Could not update expired airdrop message:', err);
          }
        }
      } catch (error) {
        console.error('Error handling airdrop expiration:', error);
      }
    }, durationMs);
  }

  /**
   * Format time ago
   */
  formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  }
}

module.exports = AirdropCommand;
