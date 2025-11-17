/**
 * JustTheTip - Natural Language Service
 * Process transactions and commands through natural language
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

/**
 * Parse natural language for transaction intent
 * @param {string} message - User's message
 * @returns {Object|null} - Parsed transaction details or null
 */
function parseTransactionIntent(message) {
  const normalized = message.toLowerCase().trim();
  
  // Pattern: "send/tip/give X (SOL/dollars/USD/$) to @user"
  const patterns = [
    // "send 0.5 SOL to @user" or "tip 0.5 to @user"
    /\b(send|tip|give|transfer)\s+(\d+\.?\d*)\s*(sol|dollars?|usd|\$)?\s+(to|for|@)\s*@?(\w+)/i,
    // "@user 0.5 SOL" or "@user get 0.5"
    /@(\w+)\s+(get|gets|receive|receives)?\s*(\d+\.?\d*)\s*(sol|dollars?|usd|\$)?/i,
    // "0.5 SOL to @user"
    /(\d+\.?\d*)\s*(sol|dollars?|usd|\$)?\s+(to|for)\s*@?(\w+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      let amount, currency, recipient;
      
      if (pattern === patterns[0]) {
        amount = parseFloat(match[2]);
        currency = match[3] || 'SOL';
        recipient = match[5];
      } else if (pattern === patterns[1]) {
        recipient = match[1];
        amount = parseFloat(match[3]);
        currency = match[4] || 'SOL';
      } else {
        amount = parseFloat(match[1]);
        currency = match[2] || 'SOL';
        recipient = match[4];
      }
      
      // Normalize currency
      if (currency.match(/\$|dollars?|usd/i)) {
        currency = 'USD';
      } else {
        currency = 'SOL';
      }
      
      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        return null;
      }
      
      return {
        type: 'tip',
        amount,
        currency,
        recipient: recipient.replace('@', ''),
        confidence: 0.9,
        originalMessage: message
      };
    }
  }
  
  return null;
}

/**
 * Parse natural language for balance check
 * @param {string} message - User's message
 * @returns {Object|null} - Parsed balance check request or null
 */
function parseBalanceCheck(message) {
  const normalized = message.toLowerCase().trim();
  
  // Patterns for balance checks
  const patterns = [
    /\b(what'?s?|show|check|get|view)\s+(my|me)?\s*(balance|wallet|funds|money|sol)/i,
    /\bhow much\s+(sol|money|funds|do i have)/i,
    /\b(balance|wallet)\s+(check|info|status)/i,
    /\bmy\s+(balance|wallet|funds)/i
  ];
  
  for (const pattern of patterns) {
    if (normalized.match(pattern)) {
      return {
        type: 'balance_check',
        confidence: 0.85,
        originalMessage: message
      };
    }
  }
  
  return null;
}

/**
 * Parse natural language for transaction history request
 * @param {string} message - User's message
 * @returns {Object|null} - Parsed history request or null
 */
function parseHistoryRequest(message) {
  const normalized = message.toLowerCase().trim();
  
  // Patterns for transaction history
  const patterns = [
    /\b(show|get|view|check|see)\s+(my|me)?\s*(transactions?|history|logs|tips?|payments?)/i,
    /\b(transactions?|history|logs)\s+(for|from)?\s*(today|yesterday|this week|this month|last week|last month)/i,
    /\bwhat\s+(did i|have i)\s+(send|sent|tip|tipped|receive|received)/i
  ];
  
  // Parse time period if mentioned
  let period = 'recent';
  if (normalized.match(/\btoday\b/)) period = 'today';
  else if (normalized.match(/\byesterday\b/)) period = 'yesterday';
  else if (normalized.match(/\bthis week\b/)) period = 'this_week';
  else if (normalized.match(/\bthis month\b/)) period = 'this_month';
  else if (normalized.match(/\blast week\b/)) period = 'last_week';
  else if (normalized.match(/\blast month\b/)) period = 'last_month';
  
  for (const pattern of patterns) {
    if (normalized.match(pattern)) {
      return {
        type: 'history',
        period,
        confidence: 0.8,
        originalMessage: message
      };
    }
  }
  
  return null;
}

/**
 * Parse natural language for airdrop intent
 * @param {string} message - User's message
 * @returns {Object|null} - Parsed airdrop details or null
 */
function parseAirdropIntent(message) {
  const normalized = message.toLowerCase().trim();
  
  // Pattern: "airdrop X to everyone" or "give everyone X"
  const patterns = [
    /\b(airdrop|send|give)\s+(\d+\.?\d*)\s*(sol|dollars?|usd|\$)?\s+(to\s+)?(everyone|all|community|group)/i,
    /\b(everyone|all)\s+(gets?|receives?)\s+(\d+\.?\d*)\s*(sol|dollars?|usd|\$)?/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      let amount, currency;
      
      if (pattern === patterns[0]) {
        amount = parseFloat(match[2]);
        currency = match[3] || 'SOL';
      } else {
        amount = parseFloat(match[3]);
        currency = match[4] || 'SOL';
      }
      
      // Normalize currency
      if (currency && currency.match(/\$|dollars?|usd/i)) {
        currency = 'USD';
      } else {
        currency = 'SOL';
      }
      
      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        return null;
      }
      
      return {
        type: 'airdrop',
        amount,
        currency,
        confidence: 0.85,
        originalMessage: message
      };
    }
  }
  
  return null;
}

/**
 * Parse natural language for help/FAQ request
 * @param {string} message - User's message
 * @returns {Object|null} - Parsed help request or null
 */
function parseHelpRequest(message) {
  const normalized = message.toLowerCase().trim();
  
  // Direct help request patterns
  const helpPatterns = [
    /\b(help|assist|support|guide|explain)/i,
    /\bhow\s+(do|can|to)\s+(i|you)/i,
    /\bwhat\s+(is|are|does)/i,
    /\b(can\s+i|is\s+it\s+possible)/i
  ];
  
  for (const pattern of helpPatterns) {
    if (normalized.match(pattern)) {
      return {
        type: 'help',
        query: message,
        confidence: 0.75,
        originalMessage: message
      };
    }
  }
  
  return null;
}

/**
 * Main natural language processor
 * Analyzes message and returns the most likely intent
 * @param {string} message - User's message
 * @returns {Object} - Detected intent with highest confidence
 */
function processNaturalLanguage(message) {
  if (!message || typeof message !== 'string') {
    return { type: 'unknown', confidence: 0 };
  }
  
  // Try parsing different intents
  const intents = [
    parseTransactionIntent(message),
    parseBalanceCheck(message),
    parseHistoryRequest(message),
    parseAirdropIntent(message),
    parseHelpRequest(message)
  ].filter(Boolean); // Remove null results
  
  // Return highest confidence intent
  if (intents.length > 0) {
    intents.sort((a, b) => b.confidence - a.confidence);
    return intents[0];
  }
  
  // No clear intent detected
  return {
    type: 'unknown',
    confidence: 0,
    originalMessage: message,
    suggestion: 'Try using slash commands like /tip, /balance, or /help'
  };
}

/**
 * Generate natural language response for transaction
 * @param {Object} result - Transaction result
 * @returns {string} - Human-friendly response
 */
function generateTransactionResponse(result) {
  if (result.success) {
    return `✅ Successfully sent ${result.amount} ${result.currency} to ${result.recipient}! Transaction: ${result.signature}`;
  } else {
    return `❌ Transaction failed: ${result.error || 'Unknown error'}. Please try again or use /support for help.`;
  }
}

/**
 * Generate natural language response for balance
 * @param {Object} balance - Balance information
 * @returns {string} - Human-friendly response
 */
function generateBalanceResponse(balance) {
  return `💰 Your current balance:\n${balance.SOL || 0} SOL\n${balance.USDC || 0} USDC\n\nWallet: ${balance.address || 'Not registered'}`;
}

/**
 * Format time period for reports
 * @param {string} period - Time period identifier
 * @returns {string} - Human-readable period
 */
function formatPeriod(period) {
  const periods = {
    'today': 'Today',
    'yesterday': 'Yesterday',
    'this_week': 'This Week',
    'this_month': 'This Month',
    'last_week': 'Last Week',
    'last_month': 'Last Month',
    'recent': 'Recent'
  };
  return periods[period] || 'Recent';
}

/**
 * Check if message mentions the bot
 * @param {string} message - Message content
 * @param {string} botId - Bot user ID
 * @returns {boolean} - True if bot is mentioned
 */
function isBotMentioned(message, botId) {
  return message.includes(`<@${botId}>`) || message.includes(`<@!${botId}>`);
}

/**
 * Extract transaction amount with currency conversion
 * @param {number} amount - Amount value
 * @param {string} currency - Currency type
 * @param {Object} priceService - Price service for conversion
 * @returns {Object} - Amount in both original and SOL
 */
async function extractAmountWithConversion(amount, currency, priceService) {
  if (currency === 'SOL') {
    return {
      sol: amount,
      usd: priceService ? await priceService.convertToUSD(amount, 'SOL') : null,
      original: { amount, currency }
    };
  } else if (currency === 'USD') {
    const solAmount = priceService ? await priceService.convertFromUSD(amount, 'SOL') : amount;
    return {
      sol: solAmount,
      usd: amount,
      original: { amount, currency }
    };
  }
  
  return {
    sol: amount,
    usd: null,
    original: { amount, currency }
  };
}

module.exports = {
  processNaturalLanguage,
  parseTransactionIntent,
  parseBalanceCheck,
  parseHistoryRequest,
  parseAirdropIntent,
  parseHelpRequest,
  generateTransactionResponse,
  generateBalanceResponse,
  formatPeriod,
  isBotMentioned,
  extractAmountWithConversion
};
