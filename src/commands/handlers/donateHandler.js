/**
 * JustTheTip - Donate Command Handler
 * Shows developer wallet address for optional donations
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

// Developer's Solana wallet address for donations
const DEVELOPER_WALLET = process.env.DEVELOPER_WALLET || 'YOUR_SOLANA_WALLET_ADDRESS_HERE';

/**
 * Handle the /donate command
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} context - Command context
 */
async function handleDonateCommand(interaction, _context) {
  try {
    const embed = new EmbedBuilder()
      .setTitle('☕ Support JustTheTip Development')
      .setDescription(
        `**JustTheTip is 100% free with zero transaction fees.**\n\n` +
        `Every tip goes directly from sender to recipient. We never take a cut.\n\n` +
        `If you find this bot useful and want to support continued development, you can send an optional donation to our Solana wallet:`
      )
      .addFields(
        {
          name: '💰 Developer Wallet',
          value: `\`\`\`${DEVELOPER_WALLET}\`\`\``,
          inline: false
        },
        {
          name: '🎯 Why Donate?',
          value: 
            '• Keeps the bot running 24/7\n' +
            '• Supports new feature development\n' +
            '• Covers hosting and infrastructure costs\n' +
            '• Shows appreciation for free, non-custodial service',
          inline: false
        },
        {
          name: '✨ What Makes JustTheTip Special',
          value:
            '• **100% Free** - No transaction fees ever\n' +
            '• **Non-Custodial** - You control your funds\n' +
            '• **x402 Trustless Agent** - Cryptographic proof of ownership\n' +
            '• **Direct P2P** - Transfers happen on-chain',
          inline: false
        }
      )
      .setColor(0xfbbf24)
      .setFooter({ text: '100% Free • No Fees • x402 Trustless Agent • Donations Optional' })
      .setTimestamp();

    // Create buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('📋 Copy Wallet Address')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId('copy_dev_wallet'),
        new ButtonBuilder()
          .setLabel('🔗 View on Solscan')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://solscan.io/account/${DEVELOPER_WALLET}`),
        new ButtonBuilder()
          .setLabel('💜 Support Page')
          .setStyle(ButtonStyle.Link)
          .setURL('https://mischief-manager.com/support')
      );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });

    console.log(`💝 Donate command used by ${interaction.user.tag}`);

  } catch (error) {
    console.error('Donate command error:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Error displaying donation information. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle button interaction for copying wallet address
 * @param {ButtonInteraction} interaction - Button interaction
 */
async function handleCopyWalletButton(interaction) {
  try {
    await interaction.reply({
      content: 
        `📋 **Developer Wallet Address:**\n\`\`\`${DEVELOPER_WALLET}\`\`\`\n` +
        `Copy this address to send a donation. Thank you for your support! 💜`,
      ephemeral: true
    });
  } catch (error) {
    console.error('Copy wallet button error:', error);
  }
}

module.exports = { 
  handleDonateCommand,
  handleCopyWalletButton,
  DEVELOPER_WALLET 
};
