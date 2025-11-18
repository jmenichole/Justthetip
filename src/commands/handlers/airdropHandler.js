/**
 * JustTheTip - Airdrop Command Handler
 * Handles flexible airdrop creation with custom amounts, expiration, and user limits
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const crypto = require('crypto');

// Import services
const database = require('../../../db/database');
const priceService = require('../../utils/priceService');

// API URL for claim links
const API_URL = process.env.API_BASE_URL || 'https://justthetip-eta.vercel.app';

/**
 * Parse expiration string to milliseconds
 * @param {string} expiresIn - Format: "5s", "30s", "2m", "1h", "24h", "7d", etc.
 * @returns {number} Milliseconds until expiration
 */
function parseExpiration(expiresIn) {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1));
  
  if (isNaN(value) || value <= 0) {
    throw new Error('Invalid expiration value');
  }
  
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error('Invalid expiration unit. Use "s" for seconds, "m" for minutes, "h" for hours, or "d" for days');
  }
}

/**
 * Format milliseconds to human-readable duration
 * @param {number} ms - Milliseconds
 * @returns {string} Human-readable duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
}

/**
 * Handle the /airdrop command
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} context - Command context { sdk, database, priceService, client }
 */
async function handleAirdropCommand(interaction, context) {
  const { database, priceService } = context;
  const senderId = interaction.user.id;
  const senderTag = interaction.user.tag;
  
  // Get command options with defaults
  const usdAmountPerClaim = interaction.options.getNumber('amount');
  const totalClaims = interaction.options.getInteger('total_claims') || null; // Optional, default null
  const expiresIn = interaction.options.getString('expires_in') || '30s'; // Default 30s if not claim-limited
  const customMessage = interaction.options.getString('message') || null;
  const requireServer = interaction.options.getBoolean('require_server') || false;
  
  // Auto-default: If neither totalClaims nor custom expiresIn, use 30s timer
  const useTimerMode = !totalClaims;
  const finalExpiresIn = useTimerMode ? expiresIn : null;
  
  // Defer reply - ephemeral for confirmation, then public announcement
  await interaction.deferReply({ ephemeral: true });
  
  try {
    // Parse expiration if in timer mode
    let expirationMs = null;
    let expiresAt = null;
    
    if (useTimerMode) {
      try {
        expirationMs = parseExpiration(finalExpiresIn);
        expiresAt = Date.now() + expirationMs;
      } catch (error) {
        return interaction.editReply({ 
          content: `❌ ${error.message}`, 
          ephemeral: true 
        });
      }
    }
    
    // Calculate total cost
    let totalUSD, totalSOL, solPerClaim, solPrice;
    
    if (totalClaims) {
      totalUSD = usdAmountPerClaim * totalClaims;
    } else {
      // Time-limited: estimate reasonable max (e.g., 100 claims for safety)
      totalUSD = usdAmountPerClaim * 100;
    }
    
    // Get SOL price and convert amounts
    try {
      solPrice = await priceService.getSolPrice();
      solPerClaim = await priceService.convertUsdToSol(usdAmountPerClaim);
      totalSOL = totalClaims ? (solPerClaim * totalClaims) : (solPerClaim * 100);
    } catch (error) {
      console.error('Error fetching SOL price:', error);
      return interaction.editReply({ 
        content: '❌ Unable to fetch current SOL price. Please try again later.', 
        ephemeral: true 
      });
    }
    
    // Check if user has registered wallet
    const senderWallet = await database.getUserWallet(senderId);
    if (!senderWallet) {
      return interaction.editReply({ 
        content: '❌ Please register your wallet first using `/register-magic`', 
        ephemeral: true 
      });
    }
    
    // Build confirmation message explaining auto-defaults
    let confirmationMsg = `✅ **Airdrop Configuration Confirmed** (Only you can see this)\n\n`;
    confirmationMsg += `**Settings:**\n`;
    confirmationMsg += `• Amount per Claim: $${usdAmountPerClaim.toFixed(2)} USD (~${solPerClaim.toFixed(4)} SOL)\n`;
    
    if (totalClaims) {
      confirmationMsg += `• Mode: Fixed Claims *(${totalClaims} users)*\n`;
      confirmationMsg += `• Timer: None\n`;
    } else {
      confirmationMsg += `• Mode: Timer-based *(until timer expires)*\n`;
      confirmationMsg += `• Timer: ${formatDuration(expirationMs)} ${!interaction.options.getString('expires_in') ? '*(default)* ' : ''}\n`;
    }
    
    confirmationMsg += `• Custom Message: ${customMessage ? `"${customMessage}"` : 'None *(default)*'}\n`;
    confirmationMsg += `• Server-locked: ${requireServer ? 'Yes' : 'No *(default)*'}\n`;
    confirmationMsg += `• Estimated Max Cost: ~${totalSOL.toFixed(4)} SOL\n\n`;
    confirmationMsg += `⚠️ **Note:** ${totalClaims ? 'First ' + totalClaims + ' claimers' : 'Anyone who reacts within ' + formatDuration(expirationMs)} will receive SOL.\n\n`;
    confirmationMsg += `The airdrop will be posted publicly in the channel now...`;
    
    await interaction.editReply({
      content: confirmationMsg,
      ephemeral: true
    });
    const { getSolanaBalance } = require('../../../contracts/sdk');
    let balance;
    try {
      balance = await getSolanaBalance(senderWallet);
    } catch (error) {
      console.error('Error checking balance:', error);
      return interaction.editReply({ 
        content: '❌ Unable to check your wallet balance. Please try again later.', 
        ephemeral: true 
      });
    }
    
    const balanceSOL = balance / 1000000000; // Convert lamports to SOL
    const requiredSOL = totalSOL * 1.05; // Add 5% buffer for transaction fees
    
    if (balanceSOL < requiredSOL) {
      const balanceUSD = await priceService.convertSolToUsd(balanceSOL);
      const requiredUSD = await priceService.convertSolToUsd(requiredSOL);
      
      const limitType = totalClaims ? `${totalClaims} claims` : `estimated claims during ${formatDuration(expirationMs)}`;
      
      return interaction.editReply({
        content: 
          `❌ **Insufficient Balance**\n\n` +
          `**You have:** ${balanceSOL.toFixed(4)} SOL (~$${balanceUSD.toFixed(2)} USD)\n` +
          `**Required:** ${requiredSOL.toFixed(4)} SOL (~$${requiredUSD.toFixed(2)} USD)\n` +
          `_Based on ${limitType} + 5% fee buffer_`,
        ephemeral: true
      });
    }
    
    // Generate unique airdrop ID
    const airdropId = crypto.randomUUID();
    
    // Store airdrop in database
    try {
      await database.createAirdrop({
        id: airdropId,
        creatorId: senderId,
        creatorTag: senderTag,
        creatorWallet: senderWallet,
        serverId: requireServer ? interaction.guildId : null,
        serverName: requireServer ? interaction.guild?.name : null,
        amountSolPerClaim: solPerClaim,
        amountUsdPerClaim: usdAmountPerClaim,
        totalClaims: totalClaims || null, // null = unlimited within time
        remainingClaims: totalClaims || null,
        claimedBy: JSON.stringify([]), // Track who claimed
        customMessage: customMessage,
        createdAt: Date.now(),
        expiresAt: expiresAt, // null if claim-limited
        limitType: totalClaims ? 'claims' : 'time',
        active: true
      });
    } catch (error) {
      console.error('Error creating airdrop:', error);
      return interaction.editReply({ 
        content: '❌ Failed to create airdrop. Please try again later.', 
        ephemeral: true 
      });
    }
    
    // Create public announcement embed
    const limitDescription = totalClaims 
      ? `First **${totalClaims} users** to claim` 
      : `Available for **${formatDuration(expirationMs)}**`;
    
    const announcementEmbed = new EmbedBuilder()
      .setTitle('💝 Share the Love!')
      .setDescription(customMessage || `**${interaction.user.username}** is sharing the love!`)
      .setColor('#FF1493')
      .addFields(
        { name: '💰 Amount', value: `$${usdAmountPerClaim.toFixed(2)}`, inline: true },
        { name: '⏱️ Limit', value: limitDescription, inline: true },
        { name: '\u200b', value: '\u200b', inline: true }
      )
      .setFooter({ text: requireServer ? `🔒 ${interaction.guild?.name} members only • React with 🎁 to claim` : '🌐 Anyone can claim • React with 🎁' })
      .setTimestamp();
    
    // Send announcement in channel
    const message = await interaction.editReply({ 
      embeds: [announcementEmbed],
      fetchReply: true 
    });
    
    // Store message ID for tracking
    await database.updateAirdrop(airdropId, { 
      message_id: message.id,
      channel_id: message.channel.id,
      guild_id: message.guild?.id || null
    });
    
    // Add 🎁 reaction for claiming
    try {
      await message.react('🎁');
    } catch (error) {
      console.error('Failed to add claim reaction:', error);
    }
    
    // Send detailed confirmation to creator via DM
    const limitInfo = totalClaims 
      ? `First **${totalClaims}** users` 
      : `Anyone within **${formatDuration(expirationMs)}**`;
    
    const expirationInfo = totalClaims
      ? 'Ends when all claims are used'
      : `Ends <t:${Math.floor(expiresAt / 1000)}:F>`;
    
    const creatorEmbed = new EmbedBuilder()
      .setTitle('✅ Airdrop Created Successfully!')
      .setDescription(`💝 **Sharing the love!**\n\nUsers can claim by reacting with 🎁 on the message.`)
      .setColor('#FF1493')
      .addFields(
        { name: '💰 Per Claim', value: `$${usdAmountPerClaim.toFixed(2)} (~${solPerClaim.toFixed(4)} SOL)`, inline: true },
        { name: '⏱️ Limit', value: limitInfo, inline: true },
        { name: '📊 Max Cost', value: `~$${totalUSD.toFixed(2)} (~${totalSOL.toFixed(4)} SOL)`, inline: false },
        { name: '⏰ Expiration', value: expirationInfo, inline: false }
      )
      .setFooter({ text: `Airdrop ID: ${airdropId}` })
      .setTimestamp();
    
    try {
      await interaction.user.send({ embeds: [creatorEmbed] });
    } catch (error) {
      console.log(`Could not DM airdrop details to ${interaction.user.tag}`);
    }
    
    const limitLog = totalClaims 
      ? `${totalClaims} claims max` 
      : `${formatDuration(expirationMs)} time limit`;
    
    console.log(
      `💝 Airdrop created: ${airdropId} by ${senderTag} (${senderId})\n` +
      `   Details: $${usdAmountPerClaim} per claim | ${limitLog}`
    );
    
  } catch (error) {
    console.error('Airdrop creation error:', error);
    return interaction.editReply({ 
      content: '❌ An error occurred while creating the airdrop. Please try again later.', 
      ephemeral: true 
    });
  }
}

/**
 * Handle the /my-airdrops command (view and manage active airdrops)
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} context - Command context
 */
async function handleMyAirdropsCommand(interaction, context) {
  const { database, priceService } = context;
  const userId = interaction.user.id;
  
  await interaction.deferReply({ ephemeral: true });
  
  try {
    // Get user's active airdrops
    const airdrops = await database.getUserAirdrops(userId);
    
    if (!airdrops || airdrops.length === 0) {
      return interaction.editReply({
        content: 
          `📭 **No Active Airdrops**\n\n` +
          `You don't have any active airdrops.\n` +
          `Use \`/airdrop\` to create one!`
      });
    }
    
    // Build embed for each airdrop
    const embed = new EmbedBuilder()
      .setTitle('🎁 Your Active Airdrops')
      .setDescription(`You have **${airdrops.length}** active airdrop${airdrops.length !== 1 ? 's' : ''}`)
      .setColor(0x667eea)
      .setTimestamp();
    
    for (const airdrop of airdrops) {
      const claimed = airdrop.totalClaims - airdrop.remainingClaims;
      const claimRate = ((claimed / airdrop.totalClaims) * 100).toFixed(1);
      const expiresIn = airdrop.expiresAt - Date.now();
      const isExpired = expiresIn <= 0;
      
      const status = isExpired ? '⏰ Expired' : 
                     airdrop.remainingClaims === 0 ? '✅ Fully Claimed' : 
                     '🟢 Active';
      
      embed.addFields({
        name: `${status} | $${airdrop.amountUsdPerClaim.toFixed(2)} per claim`,
        value: 
          `**ID:** \`${airdrop.id.slice(0, 8)}...\`\n` +
          `**Claims:** ${claimed}/${airdrop.totalClaims} (${claimRate}%)\n` +
          `**Remaining:** ${airdrop.remainingClaims} claims\n` +
          `**Expires:** ${isExpired ? 'Expired' : `<t:${Math.floor(airdrop.expiresAt / 1000)}:R>`}\n` +
          `**Link:** ${API_URL}/claim.html?id=${airdrop.id}`,
        inline: false
      });
    }
    
    embed.setFooter({ text: `Use /cancel-airdrop to cancel an active airdrop` });
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error fetching user airdrops:', error);
    await interaction.editReply({
      content: '❌ Unable to fetch your airdrops. Please try again later.'
    });
  }
}

module.exports = { 
  handleAirdropCommand,
  handleMyAirdropsCommand 
};
