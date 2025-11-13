/**
 * SIMPLIFIED SLASH COMMANDS FOR JUSTTHETIP BOT
 * Core functionality only - tipping, wallet registration, support
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

const improvedCommands = [
  // ===== CORE COMMANDS =====
  {
    name: 'help',
    description: '📚 View all commands and how to use the bot',
  },

  {
    name: 'tip',
    description: '💸 Tip SOL to another user',
    options: [
      {
        name: 'user',
        type: 6, // USER
        description: 'User to tip',
        required: true
      },
      {
        name: 'amount',
        type: 10, // NUMBER
        description: 'Amount in SOL (0.001 - 1.0)',
        required: true
      }
    ]
  },

  {
    name: 'airdrop',
    description: '🎁 Request devnet/testnet SOL airdrop',
    options: [
      {
        name: 'amount',
        type: 10, // NUMBER
        description: 'Amount in SOL (max 2.0)',
        required: false
      }
    ]
  },

  {
    name: 'register-wallet',
    description: '🔐 Register your Solana wallet with signature verification',
  },

  {
    name: 'support',
    description: '🎫 Get help or report an issue',
    options: [
      {
        name: 'issue',
        type: 3, // STRING
        description: 'Describe your problem or question',
        required: true
      }
    ]
  },

  {
    name: 'status',
    description: '🔍 Check bot status and wallet registration status',
  },

  {
    name: 'logs',
    description: '📋 View your transaction logs (sent via DM)',
  }
];

// ===== COMMAND DESCRIPTIONS FOR /help =====
const HELP_MESSAGES = {
  userGuide: `
**🎯 JustTheTip - Solana Tipping Bot**

**Quick Start Guide:**

**1️⃣ Register Your Wallet**
\`/register-wallet\`
• Generates a secure verification link
• Connect your Solana wallet (Phantom, Solflare, etc.)
• Sign a message to prove ownership
• Your wallet is registered automatically!

**2️⃣ Tip Other Users**
\`/tip @user 0.1\`
• Tip SOL to other Discord users
• Amount between 0.001 - 1.0 SOL
• Non-custodial - tips happen on-chain

**3️⃣ Request Testnet Airdrop** (Devnet only)
\`/airdrop 1.0\`
• Get free testnet SOL for testing
• Max 2.0 SOL per request

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**All Commands:**

💸 **Tipping**
\`/tip @user <amount>\` - Send SOL to another user
\`/logs\` - View your transaction history (DM)

🔐 **Wallet**
\`/register-wallet\` - Register your Solana wallet
\`/status\` - Check bot & wallet status

🆘 **Support**
\`/help\` - Show this guide
\`/support <issue>\` - Contact support team

🎁 **Testing** (Devnet only)
\`/airdrop <amount>\` - Get testnet SOL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**⚡ Network:** Solana Mainnet
**🛡️ Security:** Non-custodial, you control your keys
**💰 Fees:** Only network transaction fees
`,

  support: `
**🎫 Support & Help**

**Common Issues:**

**Wallet Won't Connect?**
• Double-check your wallet address
• Make sure you signed the message
• Try the registration link again

**Tip Not Working?**
• Make sure recipient has registered their wallet
• Check you have sufficient SOL balance
• Verify amount is between 0.001 - 1.0 SOL

**Can't See Logs?**
• Check your DMs (direct messages)
• Make sure DMs are enabled in this server

**Still Need Help?**
Use \`/support <describe-your-issue>\`
Your message will be sent to the support team.

**Contact:**
• GitHub: github.com/jmenichole/Justthetip/issues
`
};

// ===== PERMISSION CONFIGURATION =====
const commandPermissions = {
  // Public commands (everyone can use)
  public: [
    'help',
    'tip',
    'airdrop',
    'register-wallet',
    'support',
    'status',
    'logs'
  ]
};

// ===== RATE LIMITS =====
const rateLimits = {
  'register-wallet': { max: 5, window: 900000 }, // 5 per 15 minutes
  'tip': { max: 10, window: 60000 }, // 10 per minute
  'airdrop': { max: 2, window: 3600000 }, // 2 per hour
  'support': { max: 2, window: 300000 }, // 2 per 5 minutes
  'logs': { max: 5, window: 60000 }, // 5 per minute
  default: { max: 10, window: 60000 } // 10 per minute for others
};

module.exports = {
  commands: improvedCommands,
  helpMessages: HELP_MESSAGES,
  permissions: commandPermissions,
  rateLimits
};
