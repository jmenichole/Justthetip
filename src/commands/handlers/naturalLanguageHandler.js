/**
 * JustTheTip - Natural Language Message Handler
 * Process natural language messages for FAQ, transactions, and help
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { EmbedBuilder } = require('discord.js');
const { processNaturalLanguage, generateBalanceResponse, isBotMentioned } = require('../../services/naturalLanguageService');
const { searchFAQ, getRandomTip } = require('../../services/faqService');
const { handleNaturalLanguageReport } = require('./reportHandler');

/**
 * Process natural language message
 * @param {Message} message - Discord message
 * @param {Object} context - Bot context (client, database, etc.)
 */
async function handleNaturalLanguageMessage(message, context) {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Check if bot is mentioned or DM
  const isDM = message.channel.type === 1; // DM channel
  const mentioned = isBotMentioned(message.content, context.client.user.id);
  
  // Only process if mentioned in server or any DM
  if (!isDM && !mentioned) return;
  
  try {
    // Remove bot mention from message
    let cleanMessage = message.content
      .replace(/<@!?\d+>/g, '')
      .trim();
    
    // Process the natural language
    const intent = processNaturalLanguage(cleanMessage);
    
    switch (intent.type) {
      case 'balance_check':
        await handleBalanceCheck(message, context);
        break;
        
      case 'history':
        await handleHistoryRequest(message, context);
        break;
        
      case 'help':
        await handleHelpRequest(message, cleanMessage, context);
        break;
        
      case 'tip':
        await handleNaturalLanguageTip(message, intent, context);
        break;
        
      case 'airdrop':
        await handleNaturalLanguageAirdrop(message, intent, context);
        break;
        
      case 'report':
        await handleNaturalLanguageReport(message, context);
        break;
        
      case 'unknown':
      default:
        // Try FAQ search
        const faqResults = searchFAQ(cleanMessage);
        if (faqResults.length > 0) {
          await handleFAQResponse(message, faqResults);
        } else {
          // Provide helpful guidance
          await message.reply(
            `I'm not sure what you're asking. Try:\n` +
            `• \`/help\` - View all commands\n` +
            `• \`/faq\` - Browse FAQ\n` +
            `• \`/tip @user amount\` - Send SOL\n` +
            `• \`/status\` - Check your balance\n\n` +
            `Or ask me questions like:\n` +
            `"How do I tip someone?"\n` +
            `"What's my balance?"\n` +
            `"Show my transaction history"`
          );
        }
    }
    
  } catch (error) {
    console.error('Error processing natural language:', error);
    message.reply('❌ Sorry, I encountered an error. Please try using slash commands or /support.');
  }
}

/**
 * Handle balance check from natural language
 */
async function handleBalanceCheck(message, context) {
  try {
    const userId = message.author.id;
    const walletAddress = await context.database.getUserWallet(userId);
    
    if (!walletAddress) {
      return message.reply(
        '💰 You don\'t have a wallet yet!\n\n' +
        'Create one with `/register-magic` or receive your first tip to automatically create one.'
      );
    }
    
    const balance = await context.sdk.getBalance(walletAddress);
    const balances = await context.database.getBalances(userId);
    
    const embed = new EmbedBuilder()
      .setTitle('💰 Your Wallet Balance')
      .setDescription(`**On-Chain Balance:** ${balance.toFixed(4)} SOL`)
      .setColor(0x667eea)
      .addFields({
        name: 'Wallet Address',
        value: `\`${walletAddress}\``,
        inline: false
      })
      .setFooter({ text: getRandomTip() })
      .setTimestamp();
    
    return message.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error checking balance:', error);
    return message.reply('❌ Failed to check balance. Use `/status` command instead.');
  }
}

/**
 * Handle transaction history request
 */
async function handleHistoryRequest(message, context) {
  try {
    const userId = message.author.id;
    const transactions = await context.database.getUserTransactions(userId, 10);
    
    if (!transactions || transactions.length === 0) {
      return message.reply('📝 No transaction history found. Start tipping to see your activity!');
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📝 Recent Transactions')
      .setColor(0x667eea)
      .setDescription(`Your last ${transactions.length} transactions:`)
      .setFooter({ text: 'Use /logs for more details' })
      .setTimestamp();
    
    transactions.slice(0, 5).forEach((tx, index) => {
      const amount = parseFloat(tx.amount) || 0;
      const isSender = tx.sender_id === userId || tx.from_user_id === userId;
      const otherUser = isSender ? 
        (tx.recipient_id || tx.to_user_id) : 
        (tx.sender_id || tx.from_user_id);
      
      const direction = isSender ? '→ Sent to' : '← Received from';
      const date = new Date((tx.timestamp || tx.created_at) * 1000).toLocaleDateString();
      
      embed.addFields({
        name: `${index + 1}. ${amount.toFixed(4)} SOL`,
        value: `${direction} <@${otherUser}>\n${date}`,
        inline: true
      });
    });
    
    return message.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error fetching history:', error);
    return message.reply('❌ Failed to fetch transaction history. Use `/logs` command instead.');
  }
}

/**
 * Handle help request with FAQ search
 */
async function handleHelpRequest(message, query, context) {
  const faqResults = searchFAQ(query);
  
  if (faqResults.length > 0) {
    await handleFAQResponse(message, faqResults);
  } else {
    const embed = new EmbedBuilder()
      .setTitle('📚 JustTheTip Help')
      .setDescription(
        '**Quick Start:**\n' +
        '• `/register-magic` - Create your wallet\n' +
        '• `/tip @user amount` - Send SOL to someone\n' +
        '• `/status` - Check your balance\n' +
        '• `/logs` - View transaction history\n' +
        '• `/airdrop amount` - Drop to multiple users\n\n' +
        '**Get Help:**\n' +
        '• `/faq` - Browse FAQ categories\n' +
        '• `/support` - Report issues\n' +
        '• Ask me questions naturally!'
      )
      .setColor(0x667eea)
      .setFooter({ text: getRandomTip() });
    
    return message.reply({ embeds: [embed] });
  }
}

/**
 * Handle FAQ response
 */
async function handleFAQResponse(message, faqResults) {
  const topResult = faqResults[0];
  
  const embed = new EmbedBuilder()
    .setTitle(`❓ ${topResult.question}`)
    .setDescription(topResult.answer)
    .setColor(0x10b981)
    .setFooter({ text: `Category: ${topResult.category} | Use /faq for more` });
  
  // Add related questions
  if (faqResults.length > 1) {
    const related = faqResults.slice(1, 3)
      .map(faq => `• ${faq.question}`)
      .join('\n');
    
    embed.addFields({
      name: '📖 Related',
      value: related,
      inline: false
    });
  }
  
  return message.reply({ embeds: [embed] });
}

/**
 * Handle natural language tip
 */
async function handleNaturalLanguageTip(message, intent, context) {
  try {
    // Validate recipient exists
    const recipientMention = message.mentions.users.first();
    if (!recipientMention) {
      return message.reply(
        '❌ Please mention a user to tip. Example:\n' +
        '"Send 0.5 SOL to @user" or use `/tip @user 0.5`'
      );
    }
    
    // Convert to slash command suggestion
    return message.reply(
      `I understood: Tip **${intent.amount} ${intent.currency}** to ${recipientMention}\n\n` +
      `To complete this transaction, use:\n` +
      `\`/tip @${recipientMention.username} ${intent.amount}\`\n\n` +
      `*Natural language transactions are in beta. Use slash commands for reliable execution.*`
    );
    
  } catch (error) {
    console.error('Error handling natural language tip:', error);
    return message.reply('❌ Failed to process tip. Use `/tip @user amount` command instead.');
  }
}

/**
 * Handle natural language airdrop
 */
async function handleNaturalLanguageAirdrop(message, intent, context) {
  return message.reply(
    `I understood: Airdrop **${intent.amount} ${intent.currency}** to everyone\n\n` +
    `To complete this airdrop, use:\n` +
    `\`/airdrop ${intent.amount}\`\n\n` +
    `*Natural language airdrops are in beta. Use slash commands for reliable execution.*`
  );
}

module.exports = {
  handleNaturalLanguageMessage
};
