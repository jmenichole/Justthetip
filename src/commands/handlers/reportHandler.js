/**
 * JustTheTip - Report Command Handler
 * Handle automated report generation
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { generateUserReport, generateCommunityReport, generateQuickSummary } = require('../../services/reportService');

/**
 * Handle the /report command
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} context - Command context with database
 */
async function handleReportCommand(interaction, context) {
  const period = interaction.options.getString('period') || 'this_week';
  const reportType = interaction.options.getString('type') || 'personal';
  
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const userId = interaction.user.id;
    const database = context.database;
    
    if (reportType === 'personal') {
      // Get user transactions
      const transactions = await database.getUserTransactions(userId, 100);
      
      if (!transactions || transactions.length === 0) {
        return interaction.editReply({
          content: '📊 No transactions found. Start tipping to see your activity report!',
          ephemeral: true
        });
      }
      
      // Generate report embed
      const reportEmbed = await generateUserReport(userId, transactions, period, context.client);
      
      return interaction.editReply({
        embeds: [reportEmbed],
        ephemeral: true
      });
      
    } else if (reportType === 'community') {
      // Check if user has permission (admin/moderator)
      const member = interaction.member;
      const hasPermission = member && (
        member.permissions.has('Administrator') ||
        member.permissions.has('ModerateMembers')
      );
      
      if (!hasPermission) {
        return interaction.editReply({
          content: '❌ Community reports are only available to moderators and administrators.',
          ephemeral: true
        });
      }
      
      // Get all transactions (this would need a database method)
      // For now, return a message
      return interaction.editReply({
        content: '📊 Community reports are coming soon! Contact support for manual reports.',
        ephemeral: true
      });
    }
    
  } catch (error) {
    console.error('Error generating report:', error);
    return interaction.editReply({
      content: '❌ Failed to generate report. Please try again or contact support.',
      ephemeral: true
    });
  }
}

/**
 * Handle natural language report requests
 * @param {Message} message - Discord message
 * @param {Object} context - Command context
 */
async function handleNaturalLanguageReport(message, context) {
  try {
    const userId = message.author.id;
    const database = context.database;
    
    // Determine period from message
    const content = message.content.toLowerCase();
    let period = 'this_week';
    
    if (content.includes('today')) period = 'today';
    else if (content.includes('yesterday')) period = 'yesterday';
    else if (content.includes('this month')) period = 'this_month';
    else if (content.includes('last month')) period = 'last_month';
    else if (content.includes('last week')) period = 'last_week';
    
    // Get user transactions
    const transactions = await database.getUserTransactions(userId, 100);
    
    if (!transactions || transactions.length === 0) {
      return message.reply('📊 No transactions found to report.');
    }
    
    // Generate report
    const reportEmbed = await generateUserReport(userId, transactions, period, context.client);
    
    return message.reply({ embeds: [reportEmbed] });
    
  } catch (error) {
    console.error('Error handling natural language report:', error);
    return message.reply('❌ Failed to generate report. Please try `/report` command.');
  }
}

module.exports = {
  handleReportCommand,
  handleNaturalLanguageReport
};
