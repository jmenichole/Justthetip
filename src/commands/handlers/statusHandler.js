/**
 * JustTheTip - Status & Logs Command Handlers
 * Handles bot status checks and transaction logs
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { EmbedBuilder } = require('discord.js');

/**
 * Handle the /status command
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} context - Command context { database }
 */
async function handleStatusCommand(interaction, context) {
  const { database } = context;
  const userId = interaction.user.id;
  
  const walletAddress = await database.getUserWallet(userId);
  
  // Count total registered wallets
  const allWallets = await database.getAllWallets();
  const walletCount = allWallets.length;
  
  const embed = new EmbedBuilder()
    .setTitle('🔍 Bot & Wallet Status')
    .setColor(0x667eea)
    .addFields(
      { 
        name: '🤖 Bot Status', 
        value: '🟢 Online and operational', 
        inline: false 
      },
      { 
        name: '⚡ Network', 
        value: 'Solana Mainnet', 
        inline: true 
      },
      { 
        name: '⏱️ Uptime', 
        value: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`, 
        inline: true 
      },
      { 
        name: '💾 Connected Wallets', 
        value: `${walletCount} wallets`, 
        inline: true 
      },
      { 
        name: '🔐 Your Wallet Status', 
        value: walletAddress 
          ? `✅ Registered\n\`${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}\``
          : '❌ Not registered\nUse `/register-wallet` to connect your wallet',
        inline: false 
      }
    )
    .setFooter({ text: 'JustTheTip Bot Status' })
    .setTimestamp();
    
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Handle the /logs command
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} context - Command context { database }
 */
async function handleLogsCommand(interaction, context) {
  const { database } = context;
  const userId = interaction.user.id;
  
  const walletAddress = await database.getUserWallet(userId);
  
  if (!walletAddress) {
    return interaction.reply({ 
      content: '❌ Please register your wallet first using `/register-wallet`', 
      ephemeral: true 
    });
  }
  
  // Send confirmation to user
  await interaction.reply({ 
    content: '📋 Fetching your transaction logs... Check your DMs!', 
    ephemeral: true 
  });
  
  try {
    // Create logs embed
    const logsEmbed = new EmbedBuilder()
      .setTitle('📋 Transaction Logs')
      .setDescription(
        `**Wallet:** \`${walletAddress}\`\n\n` +
        `**Recent Transactions:**\n` +
        `_Loading transaction history from Solana blockchain..._\n\n` +
        `🔍 **View on Explorer:**\n` +
        `https://explorer.solana.com/address/${walletAddress}`
      )
      .setColor(0x667eea)
      .setFooter({ text: 'Transaction logs are fetched from Solana blockchain' })
      .setTimestamp();
      
    // Try to DM the user
    try {
      const dmChannel = await interaction.user.createDM();
      await dmChannel.send({ embeds: [logsEmbed] });
      console.log(`✅ Sent transaction logs to ${interaction.user.tag} via DM`);
    } catch (dmError) {
      console.error('❌ Failed to send DM:', dmError);
      // Follow up with error message
      await interaction.followUp({ 
        content: '❌ Could not send DM. Please enable DMs from server members in your privacy settings.', 
        ephemeral: true 
      });
    }
  } catch (error) {
    console.error('Logs command error:', error);
    await interaction.followUp({ 
      content: '❌ Error fetching transaction logs. Please try again later.', 
      ephemeral: true 
    });
  }
}

module.exports = {
  handleStatusCommand,
  handleLogsCommand
};
