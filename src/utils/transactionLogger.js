/**
 * Transaction Logger - Log transactions to admin channel
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

'use strict';

const { EmbedBuilder } = require('discord.js');

// Admin logging configuration
const LOG_CHANNEL_ID = '1414091527969439824';
const LOG_SERVER_ID = '1413961128522023024';

/**
 * Log a transaction to the admin channel
 * @param {Client} client - Discord client
 * @param {Object} transactionData - Transaction details
 */
async function logTransaction(client, transactionData) {
  try {
    // Get the server and channel
    const guild = await client.guilds.fetch(LOG_SERVER_ID);
    if (!guild) {
      console.warn(`Log server ${LOG_SERVER_ID} not found`);
      return;
    }

    const channel = await guild.channels.fetch(LOG_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      console.warn(`Log channel ${LOG_CHANNEL_ID} not found or not text-based`);
      return;
    }

    // Create transaction log embed
    const embed = new EmbedBuilder()
      .setTitle('💸 Transaction Log')
      .setColor(transactionData.status === 'success' ? 0x00ff88 : 0xff6b6b)
      .addFields(
        { 
          name: '📤 Sender', 
          value: `<@${transactionData.senderId}>\nID: ${transactionData.senderId}`, 
          inline: true 
        },
        { 
          name: '📥 Recipient', 
          value: `<@${transactionData.recipientId}>\nID: ${transactionData.recipientId}`, 
          inline: true 
        },
        { 
          name: '💰 Amount', 
          value: `${transactionData.amount} ${transactionData.currency}`, 
          inline: true 
        }
      )
      .setTimestamp();

    // Add optional fields
    if (transactionData.fee) {
      embed.addFields({ 
        name: '💳 Fee', 
        value: `${transactionData.fee} ${transactionData.currency}`, 
        inline: true 
      });
    }

    if (transactionData.netAmount) {
      embed.addFields({ 
        name: '✅ Net Amount', 
        value: `${transactionData.netAmount} ${transactionData.currency}`, 
        inline: true 
      });
    }

    if (transactionData.usdAmount) {
      embed.addFields({ 
        name: '💵 USD Value', 
        value: `$${transactionData.usdAmount}`, 
        inline: true 
      });
    }

    // Status field
    const statusEmoji = transactionData.status === 'success' ? '✅' : '❌';
    embed.addFields({ 
      name: `${statusEmoji} Status`, 
      value: transactionData.status.toUpperCase(), 
      inline: true 
    });

    // Add error message if failed
    if (transactionData.status !== 'success' && transactionData.error) {
      embed.addFields({ 
        name: '⚠️ Error', 
        value: transactionData.error.slice(0, 1024), 
        inline: false 
      });
    }

    // Add transaction signature if available
    if (transactionData.signature) {
      embed.addFields({ 
        name: '🔗 Transaction', 
        value: `[View on Solscan](https://solscan.io/tx/${transactionData.signature})`, 
        inline: false 
      });
    }

    // Set footer with server info if available
    if (transactionData.guildName) {
      embed.setFooter({ text: `Server: ${transactionData.guildName}` });
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error logging transaction to admin channel:', error);
  }
}

/**
 * Log an airdrop creation to the admin channel
 * @param {Client} client - Discord client
 * @param {Object} airdropData - Airdrop details
 */
async function logAirdrop(client, airdropData) {
  try {
    const guild = await client.guilds.fetch(LOG_SERVER_ID);
    if (!guild) return;

    const channel = await guild.channels.fetch(LOG_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle('🎁 Airdrop Created')
      .setColor(0xfbbf24)
      .addFields(
        { name: '👤 Creator', value: `<@${airdropData.creatorId}>`, inline: true },
        { name: '💰 Total Amount', value: `${airdropData.totalAmount} ${airdropData.currency}`, inline: true },
        { name: '👥 Recipients', value: `${airdropData.maxRecipients}`, inline: true },
        { name: '⏰ Duration', value: airdropData.duration, inline: true },
        { name: '🆔 Airdrop ID', value: airdropData.airdropId, inline: false }
      )
      .setTimestamp();

    if (airdropData.message) {
      embed.setDescription(airdropData.message);
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error logging airdrop:', error);
  }
}

/**
 * Log an airdrop claim to the admin channel
 * @param {Client} client - Discord client
 * @param {Object} claimData - Claim details
 */
async function logAirdropClaim(client, claimData) {
  try {
    const guild = await client.guilds.fetch(LOG_SERVER_ID);
    if (!guild) return;

    const channel = await guild.channels.fetch(LOG_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle('🎁 Airdrop Claimed')
      .setColor(claimData.hasWallet ? 0x00ff88 : 0xfbbf24)
      .addFields(
        { name: '👤 Claimer', value: `<@${claimData.userId}>`, inline: true },
        { name: '💰 Amount', value: `${claimData.amount} ${claimData.currency}`, inline: true },
        { name: '🔐 Wallet Status', value: claimData.hasWallet ? '✅ Registered' : '⏳ Pending (24h)', inline: true },
        { name: '🆔 Airdrop ID', value: claimData.airdropId, inline: false }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error logging airdrop claim:', error);
  }
}

module.exports = {
  logTransaction,
  logAirdrop,
  logAirdropClaim,
  LOG_CHANNEL_ID,
  LOG_SERVER_ID
};
