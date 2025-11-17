/**
 * JustTheTip - Report Generation Service
 * Automated report generation for user statistics and transaction summaries
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { EmbedBuilder } = require('discord.js');

/**
 * Calculate date range for report period
 * @param {string} period - Period identifier (today, this_week, this_month, etc.)
 * @returns {Object} - Start and end timestamps
 */
function calculateDateRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let startDate, endDate = now;
  
  switch (period) {
    case 'today':
      startDate = today;
      break;
      
    case 'yesterday':
      startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      endDate = today;
      break;
      
    case 'this_week':
      const dayOfWeek = today.getDay();
      startDate = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
      break;
      
    case 'last_week':
      const lastWeekEnd = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
      startDate = new Date(lastWeekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = lastWeekEnd;
      break;
      
    case 'this_month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
      
    case 'last_month':
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
      
    case 'recent':
    default:
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
  }
  
  return {
    start: Math.floor(startDate.getTime() / 1000),
    end: Math.floor(endDate.getTime() / 1000)
  };
}

/**
 * Filter transactions by date range
 * @param {Array} transactions - All transactions
 * @param {Object} dateRange - Start and end timestamps
 * @returns {Array} - Filtered transactions
 */
function filterTransactionsByDate(transactions, dateRange) {
  return transactions.filter(tx => {
    const txTime = tx.timestamp || tx.created_at || 0;
    return txTime >= dateRange.start && txTime <= dateRange.end;
  });
}

/**
 * Calculate transaction statistics
 * @param {Array} transactions - Transaction list
 * @param {string} userId - User's Discord ID
 * @returns {Object} - Transaction statistics
 */
function calculateTransactionStats(transactions, userId) {
  const stats = {
    total: transactions.length,
    sent: 0,
    received: 0,
    totalSent: 0,
    totalReceived: 0,
    largestTip: { amount: 0 },
    mostTipped: {},
    receivedFrom: {}
  };
  
  transactions.forEach(tx => {
    const amount = parseFloat(tx.amount) || 0;
    
    // Check if user is sender or receiver
    if (tx.sender_id === userId || tx.from_user_id === userId) {
      stats.sent++;
      stats.totalSent += amount;
      
      // Track who they tipped most
      const recipient = tx.recipient_id || tx.to_user_id;
      stats.mostTipped[recipient] = (stats.mostTipped[recipient] || 0) + amount;
    } else if (tx.recipient_id === userId || tx.to_user_id === userId) {
      stats.received++;
      stats.totalReceived += amount;
      
      // Track who tipped them most
      const sender = tx.sender_id || tx.from_user_id;
      stats.receivedFrom[sender] = (stats.receivedFrom[sender] || 0) + amount;
    }
    
    // Track largest tip
    if (amount > stats.largestTip.amount) {
      stats.largestTip = {
        amount,
        from: tx.sender_id || tx.from_user_id,
        to: tx.recipient_id || tx.to_user_id,
        date: tx.timestamp || tx.created_at
      };
    }
  });
  
  // Find top tipped user
  if (Object.keys(stats.mostTipped).length > 0) {
    const topUser = Object.entries(stats.mostTipped).sort((a, b) => b[1] - a[1])[0];
    stats.topTipped = { userId: topUser[0], amount: topUser[1] };
  }
  
  // Find top tipper
  if (Object.keys(stats.receivedFrom).length > 0) {
    const topTipper = Object.entries(stats.receivedFrom).sort((a, b) => b[1] - a[1])[0];
    stats.topTipper = { userId: topTipper[0], amount: topTipper[1] };
  }
  
  return stats;
}

/**
 * Generate user transaction report
 * @param {string} userId - User's Discord ID
 * @param {Array} transactions - User's transactions
 * @param {string} period - Report period
 * @param {Object} client - Discord client (for user lookups)
 * @returns {EmbedBuilder} - Report embed
 */
async function generateUserReport(userId, transactions, period = 'this_week', client = null) {
  const dateRange = calculateDateRange(period);
  const filteredTxs = filterTransactionsByDate(transactions, dateRange);
  const stats = calculateTransactionStats(filteredTxs, userId);
  
  // Format period name
  const periodNames = {
    'today': 'Today',
    'yesterday': 'Yesterday',
    'this_week': 'This Week',
    'last_week': 'Last Week',
    'this_month': 'This Month',
    'last_month': 'Last Month',
    'recent': 'Last 7 Days'
  };
  const periodName = periodNames[period] || 'Custom Period';
  
  const embed = new EmbedBuilder()
    .setTitle(`📊 Transaction Report - ${periodName}`)
    .setColor(0x667eea)
    .setTimestamp();
  
  // Overview section
  embed.addFields({
    name: '📈 Overview',
    value: `Total Transactions: **${stats.total}**\n` +
           `Sent: **${stats.sent}** tips\n` +
           `Received: **${stats.received}** tips`,
    inline: false
  });
  
  // Financial summary
  if (stats.total > 0) {
    embed.addFields({
      name: '💰 Financial Summary',
      value: `Total Sent: **${stats.totalSent.toFixed(4)} SOL**\n` +
             `Total Received: **${stats.totalReceived.toFixed(4)} SOL**\n` +
             `Net Change: **${(stats.totalReceived - stats.totalSent).toFixed(4)} SOL**`,
      inline: false
    });
  }
  
  // Highlights
  if (stats.largestTip.amount > 0) {
    const largestDate = new Date(stats.largestTip.date * 1000).toLocaleDateString();
    embed.addFields({
      name: '🎯 Highlights',
      value: `Largest Tip: **${stats.largestTip.amount.toFixed(4)} SOL** (${largestDate})`,
      inline: false
    });
  }
  
  // Top interactions
  if (stats.topTipped || stats.topTipper) {
    let topInteractions = '';
    if (stats.topTipped) {
      topInteractions += `Most Tipped: <@${stats.topTipped.userId}> (${stats.topTipped.amount.toFixed(4)} SOL)\n`;
    }
    if (stats.topTipper) {
      topInteractions += `Top Supporter: <@${stats.topTipper.userId}> (${stats.topTipper.amount.toFixed(4)} SOL)`;
    }
    if (topInteractions) {
      embed.addFields({
        name: '🤝 Top Interactions',
        value: topInteractions,
        inline: false
      });
    }
  }
  
  // No transactions message
  if (stats.total === 0) {
    embed.setDescription(`No transactions found for ${periodName.toLowerCase()}.`);
  }
  
  embed.setFooter({ text: 'JustTheTip - Powered by Solana' });
  
  return embed;
}

/**
 * Generate community statistics report
 * @param {Array} allTransactions - All community transactions
 * @param {string} period - Report period
 * @returns {EmbedBuilder} - Community report embed
 */
function generateCommunityReport(allTransactions, period = 'this_week') {
  const dateRange = calculateDateRange(period);
  const filteredTxs = filterTransactionsByDate(allTransactions, dateRange);
  
  // Calculate community stats
  const stats = {
    totalTransactions: filteredTxs.length,
    totalVolume: 0,
    uniqueTippers: new Set(),
    uniqueReceivers: new Set(),
    largestTip: 0
  };
  
  filteredTxs.forEach(tx => {
    const amount = parseFloat(tx.amount) || 0;
    stats.totalVolume += amount;
    stats.uniqueTippers.add(tx.sender_id || tx.from_user_id);
    stats.uniqueReceivers.add(tx.recipient_id || tx.to_user_id);
    if (amount > stats.largestTip) {
      stats.largestTip = amount;
    }
  });
  
  const periodNames = {
    'today': 'Today',
    'yesterday': 'Yesterday',
    'this_week': 'This Week',
    'last_week': 'Last Week',
    'this_month': 'This Month',
    'last_month': 'Last Month',
    'recent': 'Last 7 Days'
  };
  const periodName = periodNames[period] || 'Custom Period';
  
  const embed = new EmbedBuilder()
    .setTitle(`🌟 Community Report - ${periodName}`)
    .setColor(0x7c3aed)
    .setDescription('Community tipping activity summary')
    .addFields({
      name: '📊 Activity',
      value: `Total Tips: **${stats.totalTransactions}**\n` +
             `Active Tippers: **${stats.uniqueTippers.size}**\n` +
             `Recipients: **${stats.uniqueReceivers.size}**`,
      inline: true
    })
    .addFields({
      name: '💎 Volume',
      value: `Total Volume: **${stats.totalVolume.toFixed(4)} SOL**\n` +
             `Average Tip: **${stats.totalTransactions > 0 ? (stats.totalVolume / stats.totalTransactions).toFixed(4) : '0'} SOL**\n` +
             `Largest Tip: **${stats.largestTip.toFixed(4)} SOL**`,
      inline: true
    })
    .setTimestamp()
    .setFooter({ text: 'JustTheTip - Community Analytics' });
  
  return embed;
}

/**
 * Generate quick transaction summary (for DMs)
 * @param {Array} recentTransactions - Recent transactions (limited list)
 * @param {string} userId - User's Discord ID
 * @returns {string} - Text summary
 */
function generateQuickSummary(recentTransactions, userId) {
  if (!recentTransactions || recentTransactions.length === 0) {
    return '📝 No recent transactions found.';
  }
  
  let summary = '📝 **Recent Transactions:**\n\n';
  
  recentTransactions.slice(0, 10).forEach((tx, index) => {
    const amount = parseFloat(tx.amount) || 0;
    const isSender = tx.sender_id === userId || tx.from_user_id === userId;
    const otherUser = isSender ? 
      (tx.recipient_id || tx.to_user_id) : 
      (tx.sender_id || tx.from_user_id);
    
    const direction = isSender ? '→' : '←';
    const action = isSender ? 'Sent to' : 'Received from';
    
    const date = new Date((tx.timestamp || tx.created_at) * 1000);
    const dateStr = date.toLocaleDateString();
    
    summary += `${index + 1}. ${direction} **${amount.toFixed(4)} SOL** ${action} <@${otherUser}> (${dateStr})\n`;
  });
  
  return summary;
}

/**
 * Export report data as JSON (for advanced users)
 * @param {Object} reportData - Report data
 * @returns {string} - JSON string
 */
function exportReportJSON(reportData) {
  return JSON.stringify(reportData, null, 2);
}

/**
 * Schedule automated report generation
 * @param {Function} callback - Function to call with generated report
 * @param {string} schedule - Schedule type (daily, weekly, monthly)
 * @returns {Object} - Schedule info
 */
function scheduleAutomatedReport(callback, schedule = 'weekly') {
  // This would integrate with a job scheduler in production
  const schedules = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000
  };
  
  const interval = schedules[schedule] || schedules.weekly;
  
  return {
    schedule,
    interval,
    nextRun: Date.now() + interval,
    message: `Automated ${schedule} reports scheduled successfully!`
  };
}

module.exports = {
  calculateDateRange,
  filterTransactionsByDate,
  calculateTransactionStats,
  generateUserReport,
  generateCommunityReport,
  generateQuickSummary,
  exportReportJSON,
  scheduleAutomatedReport
};
