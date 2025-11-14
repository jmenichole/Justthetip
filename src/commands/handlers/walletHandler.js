/**
 * JustTheTip - Wallet Registration Handler
 * Handles wallet registration with x402 Trustless Agent
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const crypto = require('crypto');

// Get API URL for wallet registration page
const API_URL = process.env.API_BASE_URL || 'https://api.mischief-manager.com';

/**
 * Handle the /register-wallet command
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} context - Command context
 */
async function handleRegisterWalletCommand(interaction, context) {
  const userId = interaction.user.id;
  const username = interaction.user.username;
  
  // Generate a unique nonce (UUID v4)
  const nonce = crypto.randomUUID();
  
  // Create registration URL with user info and nonce
  const registrationUrl = `${API_URL}/sign.html?user=${encodeURIComponent(userId)}&username=${encodeURIComponent(username)}&nonce=${encodeURIComponent(nonce)}`;
  
  const embed = new EmbedBuilder()
    .setTitle('🔐 Register Your Wallet - x402 Trustless Agent')
    .setDescription(
      `Click the link below to register your Solana wallet.\n\n` +
      `**How x402 Trustless Agent Works:**\n` +
      `1. The link opens a secure verification page\n` +
      `2. Connect your Solana wallet (Phantom, Solflare, etc.)\n` +
      `3. Sign one cryptographic message to prove ownership\n` +
      `4. Sign once, tip forever—no repeated signatures needed!\n\n` +
      `**🔒 Trustless Security:**\n` +
      `• Your private keys never leave your wallet\n` +
      `• One signature proves ownership of all tokens (SOL, USDC, BONK, etc.)\n` +
      `• This link is unique to you and expires in 10 minutes\n` +
      `• 100% non-custodial - you maintain full control\n\n` +
      `**🔗 Registration Link:**\n` +
      `${registrationUrl}\n\n` +
      `_Link expires in 10 minutes_`
    )
    .setColor(0x667eea)
    .setFooter({ text: 'JustTheTip - x402 Trustless Agent Technology' })
    .setTimestamp();
    
  // Create a button that opens the link
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('🔐 Register Wallet')
        .setStyle(ButtonStyle.Link)
        .setURL(registrationUrl)
    );
    
  await interaction.reply({ 
    embeds: [embed], 
    components: [row],
    ephemeral: true 
  });
  
  console.log(`📝 Registration link generated for user ${username} (${userId}) with nonce ${nonce.slice(0, 8)}...`);
}

/**
 * Handle the /disconnect-wallet command
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} context - Command context { database }
 */
async function handleDisconnectWalletCommand(interaction, context) {
  const { database } = context;
  const userId = interaction.user.id;
  
  const walletAddress = await database.getUserWallet(userId);
  
  if (!walletAddress) {
    return interaction.reply({ 
      content: '❌ You don\'t have a wallet registered. Use `/register-wallet` to connect one.', 
      ephemeral: true 
    });
  }
  
  // Remove from database
  try {
    await database.removeUserWallet(userId);
  } catch (dbError) {
    console.warn('⚠️  Could not remove from database:', dbError);
  }
  
  const embed = new EmbedBuilder()
    .setTitle('🔓 Wallet Disconnected')
    .setDescription(
      `Your Solana wallet has been successfully disconnected.\n\n` +
      `**Wallet Address:** \`${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}\`\n\n` +
      `✅ Your wallet registration has been removed\n` +
      `✅ You can no longer receive tips until you re-register\n` +
      `✅ Your private keys remain secure in your wallet\n\n` +
      `To reconnect, use \`/register-wallet\` anytime.`
    )
    .setColor(0x667eea)
    .setFooter({ text: 'JustTheTip - x402 Trustless Agent' })
    .setTimestamp();
    
  await interaction.reply({ embeds: [embed], ephemeral: true });
  
  console.log(`🔓 Wallet disconnected for user ${interaction.user.tag} (${userId}): ${walletAddress}`);
}

module.exports = {
  handleRegisterWalletCommand,
  handleDisconnectWalletCommand
};
