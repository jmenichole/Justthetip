/**
 * Tip Log Command - View transaction history
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

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

/**
 * Get timeframe filter for SQL query
 * @param {string} timeframe - Selected timeframe
 * @returns {Date|null} Start date for filtering
 */
function getTimeframeDate(timeframe) {
  const now = new Date();
  
  switch (timeframe) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week': {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo;
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
    default:
      return null; // No filter
  }
}

/**
 * Format transactions into readable text
 * @param {Array} transactions - Transaction list
 * @param {string} userId - User's Discord ID
 * @returns {string} Formatted transaction log
 */
function formatTransactions(transactions, userId) {
  if (!transactions || transactions.length === 0) {
    return 'No transactions found for the selected timeframe.';
  }

  let output = '```\n';
  output += 'Date/Time           | Type    | Amount      | With User      \n';
  output += '----------------------------------------------------------------\n';

  transactions.forEach(tx => {
    const date = new Date(tx.created_at);
    const dateStr = date.toISOString().slice(0, 16).replace('T', ' ');
    const type = tx.sender_id === userId ? 'SENT' : 'RECEIVED';
    const otherUser = tx.sender_id === userId ? tx.receiver_id : tx.sender_id;
    const amount = `${parseFloat(tx.amount).toFixed(4)} ${tx.currency}`.padEnd(11);
    const userStr = otherUser.slice(0, 14).padEnd(14);
    
    output += `${dateStr} | ${type.padEnd(7)} | ${amount} | ${userStr}\n`;
  });

  output += '```';
  return output;
}

/**
 * Calculate transaction statistics
 * @param {Array} transactions - Transaction list
 * @param {string} userId - User's Discord ID
 * @returns {Object} Statistics
 */
function calculateStats(transactions, userId) {
  const stats = {
    totalSent: 0,
    totalReceived: 0,
    sentCount: 0,
    receivedCount: 0,
    currencies: new Set()
  };

  transactions.forEach(tx => {
    stats.currencies.add(tx.currency);
    
    if (tx.sender_id === userId) {
      stats.totalSent += parseFloat(tx.amount);
      stats.sentCount++;
    } else {
      stats.totalReceived += parseFloat(tx.amount);
      stats.receivedCount++;
    }
  });

  return stats;
}

/**
 * Handle tiplog command
 * @param {Interaction} interaction - Discord interaction
 */
async function handleTiplogCommand(interaction, dependencies = {}) {
  const db = dependencies.sqlite || require('../../db/db');
  const userId = interaction.user.id;

  try {
    // Send DM with timeframe selection
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('tiplog_timeframe')
      .setPlaceholder('Select a timeframe')
      .addOptions([
        {
          label: '📅 All Time',
          description: 'View all your transactions',
          value: 'all'
        },
        {
          label: '📆 This Year',
          description: 'Transactions from this year',
          value: 'year'
        },
        {
          label: '📊 This Month',
          description: 'Transactions from this month',
          value: 'month'
        },
        {
          label: '📈 This Week',
          description: 'Last 7 days',
          value: 'week'
        },
        {
          label: '📌 Today',
          description: 'Today\'s transactions',
          value: 'today'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setTitle('💰 Transaction Log')
      .setDescription('Select a timeframe to view your tip history:')
      .setColor(0x5865F2)
      .setFooter({ text: 'Your transaction history is private and only visible to you' })
      .setTimestamp();

    // Try to send DM
    try {
      await interaction.user.send({
        embeds: [embed],
        components: [row]
      });

      await interaction.reply({
        content: '✅ Check your DMs! I\'ve sent you a message to view your transaction log.',
        ephemeral: true
      });
    } catch (dmError) {
      // If DM fails, send in channel but ephemeral
      await interaction.reply({
        content: '⚠️ I couldn\'t send you a DM. Please enable DMs from server members.\n\n' +
                 'Alternatively, here\'s a quick summary:',
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error handling tiplog command:', error);
    await interaction.reply({
      content: '❌ Error retrieving transaction log. Please try again later.',
      ephemeral: true
    });
  }
}

/**
 * Handle timeframe selection
 * @param {Interaction} interaction - Discord interaction
 */
async function handleTimeframeSelection(interaction, dependencies = {}) {
  const db = dependencies.sqlite || require('../../db/db');
  const userId = interaction.user.id;
  const timeframe = interaction.values[0];

  await interaction.deferUpdate();

  try {
    // Get transactions based on timeframe
    const startDate = getTimeframeDate(timeframe);
    let transactions;

    if (startDate) {
      // Filter by date
      const stmt = db.db.prepare(`
        SELECT * FROM tips 
        WHERE (sender = ? OR receiver = ?) 
        AND created_at >= ?
        ORDER BY created_at DESC
      `);
      transactions = stmt.all(userId, userId, startDate.toISOString());
    } else {
      // Get all transactions
      transactions = db.getUserTransactions(userId, 1000); // Get up to 1000 transactions
    }

    // Calculate statistics
    const stats = calculateStats(transactions, userId);

    // Create summary embed
    const summaryEmbed = new EmbedBuilder()
      .setTitle(`💰 Transaction Summary - ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}`)
      .setColor(0x00ff88)
      .addFields(
        { name: '📤 Sent', value: `${stats.sentCount} transactions\n${stats.totalSent.toFixed(4)} SOL`, inline: true },
        { name: '📥 Received', value: `${stats.receivedCount} transactions\n${stats.totalReceived.toFixed(4)} SOL`, inline: true },
        { name: '📊 Total', value: `${stats.sentCount + stats.receivedCount} transactions`, inline: true }
      )
      .setFooter({ text: `Transaction log for ${interaction.user.tag}` })
      .setTimestamp();

    // Format transaction details
    const transactionLog = formatTransactions(transactions, userId);

    // If log is too long, split into multiple messages
    if (transactionLog.length > 2000) {
      // Send summary first
      await interaction.editReply({
        embeds: [summaryEmbed],
        components: []
      });

      // Split transactions into chunks
      const lines = transactionLog.split('\n');
      const header = lines.slice(0, 3).join('\n');
      const dataLines = lines.slice(3, -1); // Exclude closing ```
      
      let currentChunk = header + '\n';
      
      for (const line of dataLines) {
        if ((currentChunk + line + '\n```').length > 1900) {
          await interaction.followUp({
            content: currentChunk + '```',
            ephemeral: false
          });
          currentChunk = '```\n' + line + '\n';
        } else {
          currentChunk += line + '\n';
        }
      }
      
      if (currentChunk.length > 6) { // More than just ```\n
        await interaction.followUp({
          content: currentChunk + '```',
          ephemeral: false
        });
      }
    } else {
      // Send everything in one message
      await interaction.editReply({
        content: transactionLog,
        embeds: [summaryEmbed],
        components: []
      });
    }
  } catch (error) {
    console.error('Error retrieving transactions:', error);
    await interaction.editReply({
      content: '❌ Error retrieving transactions. Please try again later.',
      embeds: [],
      components: []
    });
  }
}

module.exports = {
  handleTiplogCommand,
  handleTimeframeSelection,
  formatTransactions,
  calculateStats,
  getTimeframeDate
};
