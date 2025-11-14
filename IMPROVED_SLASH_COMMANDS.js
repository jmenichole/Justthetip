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
    name: 'register-wallet',
    description: '🔐 Connect your Solana wallet - Sign once, tip forever',
  },

  {

  {
    name: 'register-magic',
    description: '✨ Link your Magic wallet to Discord using registration token',
    options: [
      {
        name: 'token',
        type: 3, // STRING
        description: 'Registration token from Magic wallet page',
        required: true
      }
    ]
  },
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
  },

  {
    name: 'donate',
    description: '☕ Support the developer with an optional donation',
  },

  {
    name: 'airdrop',
    description: '💝 Share the love - create a claimable SOL airdrop',
    options: [
      {
        name: 'amount',
        type: 10, // NUMBER
        description: 'Amount in USD per claim (e.g., 5 for $5, 20 for $20)',
        required: true,
        min_value: 0.10,
        max_value: 100.00
      },
      {
        name: 'total_claims',
        type: 4, // INTEGER
        description: 'Max users who can claim (leave empty for unlimited within time)',
        required: false,
        min_value: 1,
        max_value: 1000
      },
      {
        name: 'expires_in',
        type: 3, // STRING
        description: 'How long available (leave empty for unlimited users within 2min)',
        required: false,
        choices: [
          { name: '2 minutes', value: '2m' },
          { name: '5 minutes', value: '5m' },
          { name: '15 minutes', value: '15m' },
          { name: '30 minutes', value: '30m' },
          { name: '1 hour', value: '1h' },
          { name: '6 hours', value: '6h' },
          { name: '24 hours (1 day)', value: '24h' },
          { name: '7 days (1 week)', value: '7d' }
        ]
      },
      {
        name: 'message',
        type: 3, // STRING
        description: 'Custom message to show claimers (optional)',
        required: false,
        max_length: 200
      },
      {
        name: 'require_server',
        type: 5, // BOOLEAN
        description: 'Only allow claims from users in this server? (default: false)',
        required: false
      }
    ]
  },

  {
    name: 'my-airdrops',
    description: '📊 View and manage your active airdrops',
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
