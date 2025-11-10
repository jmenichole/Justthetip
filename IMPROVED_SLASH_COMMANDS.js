/**
 * IMPROVED SLASH COMMANDS FOR JUSTTHETIP BOT
 * User-friendly, clear, and relevant to bot functions
 * 
 * Replace the commands array in bot.js with this configuration
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
  // ===== WALLET & BALANCE COMMANDS =====
  {
    name: 'verify',
    description: '✅ Complete Discord verification and get your NFT badge!',
    options: [
      {
        name: 'wallet',
        type: 3, // STRING
        description: 'Your Solana wallet address',
        required: true
      }
    ]
  },
  
  {
    name: 'balance',
    description: '💰 Check your wallet balance and verification status',
  },
  
  {
    name: 'status',
    description: '🔍 Check verification status and NFT badge details',
  },

  // ===== VERIFICATION & NFT COMMANDS =====
  {
    name: 'register-wallet',
    description: '🔐 Register your Solana wallet with signature verification',
  },

  {
    name: 'connect-wallet',
    description: '🔗 Link your Solana wallet to your Discord account',
    options: [
      {
        name: 'wallet-address',
        type: 3, // STRING
        description: 'Your Solana wallet public key',
        required: true
      },
      {
        name: 'signature',
        type: 3, // STRING  
        description: 'Signature to prove wallet ownership',
        required: true
      }
    ]
  },

  {
    name: 'get-badge',
    description: '🎖️ Mint your verification NFT badge (requires payment)',
  },

  {
    name: 'check-payment',
    description: '💳 Verify if your verification payment was received',
    options: [
      {
        name: 'wallet',
        type: 3, // STRING
        description: 'Wallet address that sent payment',
        required: false
      }
    ]
  },

  // ===== SUPPORT & HELP COMMANDS =====
  {
    name: 'help',
    description: '📚 View all commands and how to use the bot',
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
    name: 'pricing',
    description: '💵 View verification costs and payment information',
  },

  // ===== INFO COMMANDS =====
  {
    name: 'info',
    description: 'ℹ️ Learn about JustTheTip verification system',
  },

  {
    name: 'stats',
    description: '📊 View bot statistics and network status',
  },

  // ===== ADMIN COMMANDS (Optional) =====
  {
    name: 'admin-stats',
    description: '👑 View detailed analytics (Admin only)',
  },

  {
    name: 'admin-user',
    description: '👑 Look up user verification details (Admin only)',
    options: [
      {
        name: 'user',
        type: 6, // USER
        description: 'Discord user to look up',
        required: true
      }
    ]
  }
];

// ===== COMMAND DESCRIPTIONS FOR /help =====
const HELP_MESSAGES = {
  userGuide: `
**🎯 JustTheTip Verification Bot - Quick Start Guide**

**Getting Verified (3 Easy Steps):**

**Step 1: Register Your Wallet**
\`/register-wallet\`
• Generates a secure verification link
• Opens your wallet for signature
• Proves you own the wallet

**Step 2: Pay Verification Fee**
• Send **0.02 SOL** to the bot's payment address
• You'll receive this address after connecting
• Fee covers NFT minting + platform costs

**Step 3: Get Your Badge**
\`/get-badge\`
• Mints your verification NFT
• Automatically checks payment
• Badge appears in your wallet!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Other Useful Commands:**

🔍 **Check Status**
\`/status\` - View your verification progress
\`/balance\` - Check wallet balance
\`/check-payment\` - Verify payment status

📚 **Get Help**
\`/help\` - Show this guide
\`/support <issue>\` - Contact support
\`/pricing\` - View current costs

📊 **Bot Info**
\`/info\` - Learn about the system
\`/stats\` - View network statistics

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**💰 Pricing:** 0.02 SOL per verification
**⚡ Network:** Solana Mainnet
**🎖️ NFT Badge:** Permanent on-chain proof
**🛡️ Security:** Non-custodial, you control your wallet
`,

  pricing: `
**💵 Verification Pricing**

**Verification Fee:** 0.02 SOL (~$3-4 USD)

**What's Included:**
✅ Permanent Discord verification
✅ NFT badge minted to your wallet  
✅ On-chain proof of verification
✅ Lifetime access (no recurring fees)

**Fee Breakdown:**
• 0.01 SOL - NFT minting cost
• 0.01 SOL - Platform fee

**Why We Charge:**
• Covers Solana network fees
• Prevents spam and abuse
• Sustainable bot operation
• You own the NFT forever!

**Payment Address:** 
Will be provided after \`/connect-wallet\`
`,

  info: `
**ℹ️ About JustTheTip Verification**

**What We Do:**
JustTheTip provides Discord verification through Solana blockchain NFT badges. When you verify, you receive a permanent, transferable NFT that proves your Discord identity on-chain.

**How It Works:**
1. You connect your wallet and sign a message
2. You pay a small fee (0.02 SOL) 
3. We mint an NFT badge to your wallet
4. Your Discord gets verified status

**Why Blockchain?**
• **Permanent:** NFT can't be revoked
• **Portable:** Use across platforms
• **Secure:** Cryptographic proof
• **Decentralized:** No central authority

**Open Source:**
Our code is public on GitHub
Repository: github.com/jmenichole/Justthetip

**Built With:**
• Solana blockchain
• Metaplex NFT standard
• Node.js + Discord.js
• MongoDB for records
`,

  support: `
**🎫 Support & Help**

**Common Issues:**

**Payment Not Detected?**
• Wait 2-3 minutes for confirmation
• Use \`/check-payment\` to verify
• Ensure you sent exactly 0.02 SOL

**Wallet Won't Connect?**
• Double-check your wallet address
• Make sure signature is correct
• Try reconnecting with \`/connect-wallet\`

**NFT Not Received?**
• Check your wallet's collectibles tab
• Verify on Solana Explorer
• May take 5-10 minutes to appear

**Still Need Help?**
Use \`/support <describe-your-issue>\`

**Contact:**
• Discord Support Server: [Add your server link]
• Email: support@justthetip.bot
• GitHub Issues: github.com/jmenichole/Justthetip/issues
`
};

// ===== PERMISSION CONFIGURATION =====
const commandPermissions = {
  // Public commands (everyone can use)
  public: [
    'verify',
    'balance',
    'status',
    'register-wallet',
    'connect-wallet',
    'get-badge',
    'check-payment',
    'help',
    'support',
    'pricing',
    'info',
    'stats'
  ],
  
  // Admin-only commands
  admin: [
    'admin-stats',
    'admin-user'
  ]
};

// ===== RATE LIMITS =====
const rateLimits = {
  'register-wallet': { max: 5, window: 900000 }, // 5 per 15 minutes
  'connect-wallet': { max: 3, window: 60000 }, // 3 per minute
  'get-badge': { max: 2, window: 60000 }, // 2 per minute
  'check-payment': { max: 5, window: 60000 }, // 5 per minute
  'support': { max: 2, window: 300000 }, // 2 per 5 minutes
  default: { max: 10, window: 60000 } // 10 per minute for others
};

module.exports = {
  commands: improvedCommands,
  helpMessages: HELP_MESSAGES,
  permissions: commandPermissions,
  rateLimits
};
