/**
 * JustTheTip - Simplified Slash Commands
 * Core functionality only - tipping, wallet registration, support
 * 
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 * 
 * This file is part of JustTheTip.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * See LICENSE file in the project root for full license information.
 */

const improvedCommands = [
  // ===== CORE COMMANDS =====
  {
    name: 'help',
    description: 'learn to use justthetip bot',
  },

  {
    name: 'tip',
    description: 'send some sol to a fren',
    options: [
      {
        name: 'user',
        type: 6, // USER
        description: 'who gets the bag',
        required: true
      },
      {
        name: 'amount',
        type: 10, // NUMBER
        description: 'how much ($0.10 to $100)',
        required: true
      }
    ]
  },

  {
    name: 'register-magic',
    description: 'create wallet with Discord (easiest way to start)',
    options: [
      {
        name: 'email',
        type: 3, // STRING
        description: 'your email',
        required: false
      }
    ]
  },

  {
    name: 'disconnect-wallet',
    description: 'unlink your wallet',
  },

  {
    name: 'support',
    description: 'something broken? lmk',
    options: [
      {
        name: 'issue',
        type: 3, // STRING
        description: 'what went wrong',
        required: true
      }
    ]
  },

  {
    name: 'status',
    description: 'check if youre connected',
  },

  {
    name: 'logs',
    description: 'see your tx history',
  },

  {
    name: 'airdrop',
    description: 'drop bags for everyone (default 30s timer)',
    options: [
      {
        name: 'amount',
        type: 10, // NUMBER
        description: 'how much per person ($0.10 to $100)',
        required: true,
        min_value: 0.10,
        max_value: 100.00
      },
      {
        name: 'total_claims',
        type: 4, // INTEGER
        description: 'max claimers (default unlimited)',
        required: false,
        min_value: 1,
        max_value: 1000
      },
      {
        name: 'expires_in',
        type: 3, // STRING
        description: 'how long (default 30s)',
        required: false,
        choices: [
          { name: '5 seconds', value: '5s' },
          { name: '10 seconds', value: '10s' },
          { name: '15 seconds', value: '15s' },
          { name: '20 seconds', value: '20s' },
          { name: '30 seconds', value: '30s' },
          { name: '1 minute', value: '1m' },
          { name: '2 minutes', value: '2m' }
        ]
      },
      {
        name: 'message',
        type: 3, // STRING
        description: 'custom msg for claimers',
        required: false,
        max_length: 200
      },
      {
        name: 'require_server',
        type: 5, // BOOLEAN
        description: 'only this server?',
        required: false
      }
    ]
  }
];

// ===== COMMAND DESCRIPTIONS FOR /help =====
const HELP_MESSAGES = {
  userGuide: `
**Welcome to JustTheTip!**

Send SOL as easy as sending a DM.

**how it works:**

**1️⃣ get a wallet**
\`/register-magic\`
• easiest way - authenticate with Discord
• wallet created instantly
• works everywhere

**2️⃣ tip someone**
\`/tip @fren 5\`
• send $0.10 to $100
• instant on solana
• they dont need a wallet yet (we hold it til they register)

**3️⃣ make it rain**
\`/airdrop 1 50\`
• drop $1 for 50 ppl
• quick timer options (5s-2m)
• first come first serve

━━━━━━━━━━━━━━━━━━━━━━━━━━━

**commands:**

\`/tip @user <amount>\` - send sol
\`/airdrop <amount> [claims]\` - make it rain
\`/register-magic\` - get wallet
\`/status\` - check connection
\`/logs\` - see your txs
\`/disconnect-wallet\` - unlink
\`/support <issue>\` - report bugs

━━━━━━━━━━━━━━━━━━━━━━━━━━━

**fees?** only network fees (couple cents)
**safe?** non-custodial, you own your keys
**network:** solana mainnet
`,

  support: `
**need help?**

**wallet issues?**
• check your email for magic link
• make sure you completed registration
• try \`/register-magic\` again

**tip not working?**
• they dont need wallet to receive (we hold it)
• amount must be $0.10-$100
• check balance with \`/status\`

**cant see logs?**
• check DMs
• enable DMs in server settings

**still broken?**
\`/support <describe the issue>\`

or hit us up:
• github.com/jmenichole/Justthetip/issues
`
};

// ===== PERMISSION CONFIGURATION =====
const commandPermissions = {
  // Public commands (everyone can use)
  public: [
    'help',
    'tip',
    'register-magic',
    'disconnect-wallet',
    'support',
    'status',
    'logs',
    'airdrop'
  ]
};

// ===== RATE LIMITS =====
const rateLimits = {
  'register-magic': { max: 5, window: 900000 }, // 5 per 15 minutes
  'disconnect-wallet': { max: 3, window: 300000 }, // 3 per 5 minutes
  'tip': { max: 10, window: 60000 }, // 10 per minute
  'support': { max: 2, window: 300000 }, // 2 per 5 minutes
  'logs': { max: 5, window: 60000 }, // 5 per minute
  'airdrop': { max: 3, window: 300000 }, // 3 per 5 minutes
  default: { max: 10, window: 60000 } // 10 per minute for others
};

module.exports = {
  commands: improvedCommands,
  helpMessages: HELP_MESSAGES,
  permissions: commandPermissions,
  rateLimits
};