/**
 * JustTheTip - Magic Wallet Handler
 * Handles Magic embedded wallet registration and linking
 * 
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 * 
 * This file is part of JustTheTip.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * See LICENSE file in the project root for full license information.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const crypto = require('crypto');

const API_URL = process.env.API_BASE_URL || process.env.FRONTEND_URL || 'https://api.mischief-manager.com';

// Generate registration token for Magic wallet setup (Discord-based)
function generateRegistrationToken(discordId, discordUsername) {
  const payload = {
    discordId,
    discordUsername,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex')
  };
  
  const secret = process.env.REGISTRATION_TOKEN_SECRET || 'default-secret-change-me';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  
  return Buffer.from(JSON.stringify({
    ...payload,
    signature: hmac.digest('hex')
  })).toString('base64url');
}

async function handleRegisterMagicCommand(interaction, context) {
  await interaction.deferReply({ ephemeral: true });
  
  const discordId = interaction.user.id;
  const discordUsername = interaction.user.username;
  const discordAvatar = interaction.user.displayAvatarURL();
  
  try {
    // Check if user already has a registered wallet
    if (context.database) {
      const existingWallet = await context.database.getUserWallet(discordId);
      if (existingWallet) {
        const embed = new EmbedBuilder()
          .setTitle('⚠️ Wallet Already Registered')
          .setDescription(
            `You already have a wallet registered:\n\n` +
            `**Address:** \`${existingWallet.substring(0, 8)}...${existingWallet.substring(existingWallet.length - 6)}\`\n\n` +
            `If you want to register a new Magic wallet, please disconnect your current wallet first using \`/disconnect-wallet\`.`
          )
          .setColor(0xfbbf24)
          .setTimestamp();
          
        return await interaction.editReply({ embeds: [embed] });
      }
    }
    
    // Generate registration token with Discord info (no email needed)
    const registrationToken = generateRegistrationToken(discordId, discordUsername);
    
    // Create Magic registration URL
    const registrationUrl = `${API_URL}/api/magic/register-magic.html?token=${registrationToken}`;
    
    // Create success embed
    const embed = new EmbedBuilder()
      .setTitle('✨ Magic Wallet Registration')
      .setDescription(
        `Create your Solana wallet with Discord - instant and secure!\n\n` +
        `**Discord:** ${discordUsername}\n\n` +
        `**How it works:**\n` +
        `1. Click the "Create Wallet" button below\n` +
        `2. Authorize with Discord (you're already logged in!)\n` +
        `3. Your wallet will be created instantly\n` +
        `4. Start receiving tips immediately!`
      )
      .setColor(0x6851ff) // Magic purple
      .addFields([
        {
          name: '🔐 Security',
          value: 'Enterprise-grade security (SOC 2 Type 2)\nYour private keys are encrypted and never stored on our servers',
          inline: false
        },
        {
          name: '🚀 One-Click Setup', 
          value: 'No email verification needed - authenticate with Discord!\nNo wallet app installation required',
          inline: false
        }
      ])
      .setFooter({ text: '✨ Powered by Magic + Discord • 100% Non-Custodial' })
      .setTimestamp();
    
    // Create button for registration
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('✨ Create Wallet with Discord')
          .setStyle(ButtonStyle.Link)
          .setURL(registrationUrl)
      );
    
    await interaction.editReply({ 
      embeds: [embed],
      components: [actionRow]
    });
    
    console.log(`🎯 Magic registration initiated for ${discordUsername} (${discordId}) via Discord OAuth`);
    
  } catch (error) {
    console.error('Error handling Magic registration command:', error);
    
    await interaction.editReply({
      content: '❌ Failed to generate Magic wallet registration link. Please try again or contact support.',
    });
  }
}

module.exports = {
  handleRegisterMagicCommand
};