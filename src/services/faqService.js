/**
 * JustTheTip - FAQ Service
 * Intelligent FAQ bot with natural language understanding
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

/**
 * FAQ Knowledge Base
 * Organized by category with keywords for intelligent matching
 */
const faqKnowledgeBase = {
  // Getting Started
  gettingStarted: {
    category: 'Getting Started',
    questions: [
      {
        keywords: ['how', 'start', 'begin', 'setup', 'first time', 'new'],
        question: 'How do I get started with JustTheTip?',
        answer: `Welcome to JustTheTip! Here's how to get started:
1. Use \`/register-magic\` to create your wallet (easiest method)
2. Once registered, check your status with \`/status\`
3. Start tipping friends with \`/tip @user amount\`
4. Check your transaction history with \`/logs\`

No crypto experience needed - we make it easy!`
      },
      {
        keywords: ['wallet', 'create', 'register', 'account'],
        question: 'How do I create a wallet?',
        answer: `Creating a wallet is simple:
• Use \`/register-magic\` for Discord OAuth (recommended)
• Your wallet is created automatically when someone tips you
• All wallets are secured with enterprise-grade encryption

Your private keys are always encrypted and never shared.`
      },
      {
        keywords: ['safe', 'secure', 'trust', 'security'],
        question: 'Is JustTheTip safe to use?',
        answer: `Yes! Security is our top priority:
✓ AES-256-GCM encryption for all private keys
✓ Non-custodial smart contract architecture
✓ Your keys are encrypted with unique authentication tags
✓ Regular security audits
✓ Open-source codebase for transparency

We never have access to your unencrypted private keys.`
      }
    ]
  },

  // Tipping & Transactions
  tipping: {
    category: 'Tipping & Transactions',
    questions: [
      {
        keywords: ['tip', 'send', 'transfer', 'payment'],
        question: 'How do I tip someone?',
        answer: `Tipping is easy! Use:
\`/tip @user <amount>\`

Example: \`/tip @friend 0.1\`

You can also use natural language:
"Send 0.5 SOL to @friend"
"Tip @buddy 1 dollar"

Amount range: $0.10 to $100`
      },
      {
        keywords: ['airdrop', 'multiple', 'everyone', 'group'],
        question: 'How do airdrops work?',
        answer: `Share crypto with multiple people:
\`/airdrop <amount> [max_claims]\`

Example: \`/airdrop 0.1 50\`

• React with 🎁 to claim
• 30-second timer by default
• Perfect for community rewards!`
      },
      {
        keywords: ['fee', 'cost', 'charge', 'price'],
        question: 'Are there any fees?',
        answer: `JustTheTip keeps it simple:
• No bot fees for tipping
• Only standard Solana network fees (~$0.00025)
• Airdrops may have small platform fees
• All fees are transparent and shown before transaction`
      },
      {
        keywords: ['failed', 'error', 'didn\'t work', 'problem'],
        question: 'My transaction failed, what do I do?',
        answer: `If your transaction failed:
1. Check your balance with \`/status\`
2. Verify you have enough SOL for the tip + network fee
3. Try again - network issues are temporary
4. Use \`/support\` to report persistent issues

Common fixes:
• Wait 30 seconds and retry
• Check recipient's wallet is registered
• Ensure amount is within limits ($0.10-$100)`
      }
    ]
  },

  // Wallet Management
  walletManagement: {
    category: 'Wallet Management',
    questions: [
      {
        keywords: ['balance', 'check', 'how much', 'funds'],
        question: 'How do I check my balance?',
        answer: `Check your balance anytime:
\`/status\` - Complete wallet info
\`/logs\` - Transaction history

Or just ask:
"What's my balance?"
"How much SOL do I have?"`
      },
      {
        keywords: ['withdraw', 'export', 'external', 'send out'],
        question: 'Can I withdraw to an external wallet?',
        answer: `Yes! You have full control:
1. Use \`/disconnect-wallet\` to export your private key
2. Import into any Solana wallet (Phantom, Solflare, etc.)
3. Your funds are always yours

⚠️ Never share your private key with anyone!`
      },
      {
        keywords: ['lost', 'forgot', 'recover', 'backup'],
        question: 'What if I lose access to my wallet?',
        answer: `Wallet recovery options:
• Magic wallets: Use your email to recover
• Export your private key regularly as backup
• Store private keys securely (password manager recommended)

Prevention tips:
- Back up your private key immediately after creation
- Use \`/disconnect-wallet\` to securely export
- Keep your backup in a safe location`
      },
      {
        keywords: ['transactions', 'history', 'logs', 'past'],
        question: 'How do I view my transaction history?',
        answer: `View your transactions:
\`/logs\` - Recent transaction history
\`/status\` - Current balance and wallet info

You can also generate reports:
"Show me my transactions this week"
"Generate my monthly report"`
      }
    ]
  },

  // Troubleshooting
  troubleshooting: {
    category: 'Troubleshooting',
    questions: [
      {
        keywords: ['not working', 'broken', 'issue', 'bug'],
        question: 'The bot is not responding',
        answer: `If the bot isn't responding:
1. Check bot status with \`/status\`
2. Wait a moment - server might be busy
3. Try the command again
4. Report persistent issues: \`/support <description>\`

Bot status: Check #status-updates channel`
      },
      {
        keywords: ['help', 'support', 'question', 'confused'],
        question: 'How do I get help?',
        answer: `We're here to help!
• Use \`/help\` for command guide
• Ask questions naturally: "How do I tip?"
• Report issues: \`/support <your issue>\`
• Check FAQ: Just ask me anything!
• Community: Join our Discord support channel`
      },
      {
        keywords: ['delete', 'remove', 'close', 'account'],
        question: 'How do I delete my account?',
        answer: `To remove your wallet:
1. Export your private key first (to keep your funds)
2. Use \`/disconnect-wallet\`
3. Transfer any remaining balance before disconnecting

Note: You can create a new wallet anytime`
      }
    ]
  },

  // Advanced Features
  advanced: {
    category: 'Advanced Features',
    questions: [
      {
        keywords: ['smart contract', 'program', 'on-chain'],
        question: 'What is the smart contract address?',
        answer: `JustTheTip uses Solana smart contracts:
• All transactions are on-chain
• Non-custodial architecture
• Transparent and auditable
• Program details available on Solscan

Check our GitHub for contract source code.`
      },
      {
        keywords: ['api', 'integrate', 'developer', 'sdk'],
        question: 'Can I integrate JustTheTip into my app?',
        answer: `Yes! Developer resources:
• Full SDK available on GitHub
• REST API documentation
• Example integrations
• Community support

Check: https://jmenichole.github.io/Justthetip`
      },
      {
        keywords: ['report', 'analytics', 'statistics', 'stats'],
        question: 'Can I generate reports?',
        answer: `Automated reports available:
• Daily transaction summaries
• Weekly activity reports
• Monthly statistics
• Custom date ranges

Generate with:
"Generate my weekly report"
"Show stats for this month"
\`/report [period]\``
      }
    ]
  }
};

/**
 * Search FAQ knowledge base using keyword matching
 * @param {string} query - User's question or search term
 * @returns {Array} - Matching FAQ entries sorted by relevance
 */
function searchFAQ(query) {
  const normalizedQuery = query.toLowerCase().trim();
  const matches = [];
  
  // Search through all categories
  for (const [categoryKey, categoryData] of Object.entries(faqKnowledgeBase)) {
    for (const faq of categoryData.questions) {
      // Calculate relevance score
      let score = 0;
      
      // Check keyword matches
      for (const keyword of faq.keywords) {
        if (normalizedQuery.includes(keyword.toLowerCase())) {
          score += 10;
        }
      }
      
      // Check question similarity
      if (normalizedQuery.includes(faq.question.toLowerCase()) || 
          faq.question.toLowerCase().includes(normalizedQuery)) {
        score += 20;
      }
      
      // Partial word matches
      const queryWords = normalizedQuery.split(' ');
      for (const word of queryWords) {
        if (word.length > 3) { // Ignore short words
          for (const keyword of faq.keywords) {
            if (keyword.toLowerCase().includes(word)) {
              score += 3;
            }
          }
        }
      }
      
      if (score > 0) {
        matches.push({
          ...faq,
          category: categoryData.category,
          score
        });
      }
    }
  }
  
  // Sort by relevance score (highest first)
  matches.sort((a, b) => b.score - a.score);
  
  return matches.slice(0, 5); // Return top 5 matches
}

/**
 * Get all FAQ categories for browsing
 * @returns {Array} - List of categories with their questions
 */
function getAllCategories() {
  return Object.entries(faqKnowledgeBase).map(([key, data]) => ({
    key,
    category: data.category,
    questionCount: data.questions.length
  }));
}

/**
 * Get FAQs by category
 * @param {string} categoryKey - Category identifier
 * @returns {Object} - Category data with questions
 */
function getFAQsByCategory(categoryKey) {
  return faqKnowledgeBase[categoryKey] || null;
}

/**
 * Get a random helpful tip
 * @returns {string} - Random tip for users
 */
function getRandomTip() {
  const tips = [
    '💡 Tip: You can tip using natural language! Just say "send 0.5 SOL to @friend"',
    '💡 Tip: Export your private key regularly as backup using /disconnect-wallet',
    '💡 Tip: Check your transaction history anytime with /logs',
    '💡 Tip: Airdrops are perfect for community events! Use /airdrop to share with everyone',
    '💡 Tip: Your wallet is created automatically when someone tips you',
    '💡 Tip: All transactions are on-chain and verifiable on Solscan',
    '💡 Tip: Use /status to quickly check your balance and wallet info',
    '💡 Tip: Generate monthly reports to track your tipping activity'
  ];
  
  return tips[Math.floor(Math.random() * tips.length)];
}

/**
 * Analyze user intent from natural language query
 * @param {string} message - User's message
 * @returns {Object} - Intent analysis result
 */
function analyzeIntent(message) {
  const normalized = message.toLowerCase().trim();
  
  // FAQ/Help intent
  if (normalized.match(/\b(how|what|when|where|why|can i|help|explain)\b/)) {
    return {
      type: 'faq',
      confidence: 0.8,
      action: 'search_faq'
    };
  }
  
  // Balance check intent
  if (normalized.match(/\b(balance|how much|funds|check|wallet)\b/) && 
      !normalized.match(/\b(someone|user|friend)\b/)) {
    return {
      type: 'balance_check',
      confidence: 0.9,
      action: 'check_balance'
    };
  }
  
  // Transaction intent (handled by natural language transaction processor)
  if (normalized.match(/\b(send|tip|give|transfer)\b/) && 
      (normalized.match(/@[\w]+/) || normalized.match(/\b(to|for)\b/))) {
    return {
      type: 'transaction',
      confidence: 0.85,
      action: 'process_transaction'
    };
  }
  
  // Report generation intent
  if (normalized.match(/\b(report|summary|stats|analytics|generate)\b/)) {
    return {
      type: 'report',
      confidence: 0.8,
      action: 'generate_report'
    };
  }
  
  // General help
  return {
    type: 'general',
    confidence: 0.5,
    action: 'show_help'
  };
}

module.exports = {
  searchFAQ,
  getAllCategories,
  getFAQsByCategory,
  getRandomTip,
  analyzeIntent,
  faqKnowledgeBase
};
