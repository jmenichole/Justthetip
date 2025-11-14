/**
 * JustTheTip - Support Command Handler
 * Handles support ticket creation and admin notification
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { EmbedBuilder } = require('discord.js');

/**
 * Handle the /support command
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} context - Command context { client }
 */
async function handleSupportCommand(interaction, context) {
  const { client } = context;
  const issue = interaction.options.getString('issue');
  
  if (!issue || issue.trim().length === 0) {
    return await interaction.reply({
      content: '❌ Please describe your issue or question.',
      ephemeral: true
    });
  }
  
  try {
    // Create support ticket embed for user
    const userEmbed = new EmbedBuilder()
      .setTitle('🎫 Support Request Submitted')
      .setColor(0x667eea)
      .setDescription('Your support request has been received. Our team will review it shortly.')
      .addFields(
        { 
          name: '📝 Your Issue', 
          value: issue.slice(0, 1000), // Limit to 1000 chars
          inline: false 
        },
        { 
          name: '⏱️ Expected Response Time', 
          value: 'We typically respond within 24-48 hours.',
          inline: false 
        },
        { 
          name: '💡 Quick Help', 
          value: '• Check `/help` for command documentation\n• Use `/status` to check bot status\n• Use `/logs` to view transaction history',
          inline: false 
        }
      )
      .setFooter({ text: `Ticket from: ${interaction.user.tag}` })
      .setTimestamp();
    
    await interaction.reply({ embeds: [userEmbed], ephemeral: true });
    
    // Send to support channel with mention
    const SUPPORT_CHANNEL_ID = process.env.SUPPORT_CHANNEL_ID || '1437295074856927363';
    const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '1153034319271559328';
    
    try {
      const supportChannel = await client.channels.fetch(SUPPORT_CHANNEL_ID);
      if (supportChannel && supportChannel.isTextBased()) {
        const supportEmbed = new EmbedBuilder()
          .setTitle('🆘 New Support Request')
          .setColor(0xff6b6b)
          .addFields(
            { name: '👤 User', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
            { name: '🆔 User ID', value: interaction.user.id, inline: true },
            { name: '🏠 Server', value: interaction.guild ? interaction.guild.name : 'DM', inline: true },
            { name: '📝 Issue', value: issue.slice(0, 1024), inline: false },
            { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setThumbnail(interaction.user.displayAvatarURL())
          .setFooter({ text: `Support Ticket • User ID: ${interaction.user.id}` })
          .setTimestamp();
        
        // Send with admin mention BEFORE the embed so the admin gets pinged
        await supportChannel.send({
          content: `<@${ADMIN_USER_ID}> **New support request from <@${interaction.user.id}>**`,
          embeds: [supportEmbed]
        });
        
        console.log(`✅ Support request forwarded to channel ${SUPPORT_CHANNEL_ID} with admin ping`);
      } else {
        console.error('❌ Support channel not found or not text-based');
      }
    } catch (channelError) {
      console.error('❌ Failed to send to support channel:', channelError);
      // Don't fail the user's command - they still got confirmation
    }
    
    // Log support request
    console.log(`📋 Support request from ${interaction.user.id} (${interaction.user.tag}): ${issue}`);
    
  } catch (error) {
    console.error('Support command error:', error);
    
    // Try to respond if we haven't already
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Error submitting support request. Please try contacting server administrators directly.',
        ephemeral: true
      });
    }
  }
}

module.exports = { handleSupportCommand };
