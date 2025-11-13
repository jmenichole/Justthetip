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
    description: '📚 View all available commands and how to use JustTheTip',
  },

  {
    name: 'tip',
    description: '💸 Send a tip in USD to another Discord user',
    options: [
      {
        name: 'user',
        type: 6, // USER
        description: 'The user you want to tip',
        required: true
      },
      {
        name: 'amount',
        type: 10, // NUMBER
        description: 'Amount in USD ($0.10 to $100.00)',
        required: true
      }
    ]
  },

  {
    name: 'airdrop',
    description: '🎁 Request testnet SOL for development and testing (devnet only)',
    options: [
      {
        name: 'amount',
        type: 10, // NUMBER
        description: 'Amount in USD (maximum $20.00)',
        required: false
      }
    ]
  },

  {
    name: 'register-wallet',
    description: '🔐 Connect your Solana wallet - Sign once, tip forever',
  },

  {
    name: 'disconnect-wallet',
    description: '🔓 Disconnect your registered Solana wallet from JustTheTip',
  },

  {
    name: 'support',
    description: '🎫 Contact support team or report an issue',
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
    description: '🔍 Check bot status and your wallet connection status',
  },

  {
    name: 'logs',
    description: '📋 View your recent transactions (sent via DM)',
  }
];

// ===== COMMAND DESCRIPTIONS FOR /help =====
const HELP_MESSAGES = {
  userGuide: `
**🎯 JustTheTip - x402 Trustless Agent**
Sign once, tip forever—without compromising security.

**Quick Start Guide:**

**1️⃣ Register Your Wallet**
\`/register-wallet\`
• Opens a secure verification link
• Connect your Solana wallet (Phantom, Trust, Coinbase, etc.)
• Sign one message to prove ownership
• That's it! Your wallet is registered instantly

**2️⃣ Send Tips**
\`/tip @username 10\`
• Tip other Discord users in USD
• Amount between $0.10 and $100.00
• 100% non-custodial - you control your wallet
• Automatically converted to SOL at current price

**3️⃣ Request Testnet Tokens** (For developers)
\`/airdrop 5\`
• Get free testnet SOL for testing
• Amount in USD (maximum $20.00)
• Works on devnet only

━━━━━━━━━━━━━━━━━━━━━━━━━━━

**All Commands:**

💸 **Tipping**
\`/tip @user <amount>\` - Send USD to another user
\`/logs\` - View your transaction history (sent via DM)

🔐 **Wallet Management**
\`/register-wallet\` - Connect your Solana wallet
\`/disconnect-wallet\` - Remove your wallet connection
\`/status\` - Check bot and wallet status

🆘 **Support**
\`/help\` - Show this guide
\`/support <issue>\` - Contact support team

🎁 **Testing** (Devnet only)
\`/airdrop <amount>\` - Get testnet SOL (amount in USD)

━━━━━━━━━━━━━━━━━━━━━━━━━━━

**⚡ Network:** Solana Mainnet
**🛡️ Security:** x402 Trustless Agent - Non-custodial, you control your keys
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
• Verify recipient has registered their wallet
• Check you have sufficient SOL balance
• Amount must be between $0.10 and $100.00

**Can't See Logs?**
• Check your DMs (direct messages)
• Enable DMs from server members in privacy settings

**Need to Disconnect?**
Use \`/disconnect-wallet\` to remove your wallet registration.

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
    'disconnect-wallet',
    'support',
    'status',
    'logs'
  ]
};

// ===== RATE LIMITS =====
const rateLimits = {
  'register-wallet': { max: 5, window: 900000 }, // 5 per 15 minutes
  'disconnect-wallet': { max: 3, window: 300000 }, // 3 per 5 minutes
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
