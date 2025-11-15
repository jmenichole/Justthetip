/**
 * JustTheTip - Help Command Handler
 * Displays user guide and command documentation
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { EmbedBuilder } = require('discord.js');
const { helpMessages } = require('../../../IMPROVED_SLASH_COMMANDS');

/**
 * Handle the /help command
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} context - Command context
 */
async function handleHelpCommand(interaction, _context) {
  const embed = new EmbedBuilder()
    .setTitle('📚 JustTheTip Help Guide')
    .setDescription(helpMessages.userGuide)
    .setColor(0x667eea)
    .setFooter({ text: 'JustTheTip - Powered by Solana' });
    
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { handleHelpCommand };
