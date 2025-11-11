# JustTheTip - Telegram Integration Plan

**Created**: 2025-11-11
**Branch**: claude/index-just-the-tip-011CV1MM4tisrHBWsi5NnijG
**Author**: 4eckd
**Status**: Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Feature 1: Telegram API / Tipping Ability](#feature-1-telegram-api--tipping-ability)
3. [Feature 2: Telegram Bot API](#feature-2-telegram-bot-api)
4. [Feature 3: Telegram Channel and Group Integration](#feature-3-telegram-channel-and-group-integration)
5. [Feature 4: Branded Wallet using Passkeys](#feature-4-branded-wallet-using-passkeys)
6. [Architecture & Technology Stack](#architecture--technology-stack)
7. [Database Schema Extensions](#database-schema-extensions)
8. [API Endpoints](#api-endpoints)
9. [Security Considerations](#security-considerations)
10. [Development Roadmap](#development-roadmap)
11. [Testing Strategy](#testing-strategy)
12. [Deployment Strategy](#deployment-strategy)

---

## Executive Summary

This document outlines the comprehensive plan for integrating Telegram functionality into JustTheTip, expanding the platform from Discord-only to a multi-platform non-custodial tipping system. The integration maintains the core principles of trustless, non-custodial architecture while leveraging Telegram's unique features.

### Goals
- **Multi-Platform Presence**: Extend JustTheTip to Telegram's 800M+ user base
- **Feature Parity**: Replicate Discord tipping functionality for Telegram
- **Enhanced UX**: Leverage Telegram's inline buttons and mini-apps
- **Unified Backend**: Share Solana smart contracts and database across platforms
- **Modern Authentication**: Implement passkey-based branded wallet

### Success Metrics
- Successful Telegram bot deployment with tipping functionality
- 100% feature parity with Discord version
- <2 second response time for bot commands
- Secure passkey wallet registration with <5% failure rate
- Zero private key custody (maintain non-custodial architecture)

---

## Feature 1: Telegram API / Tipping Ability

### Overview
Implement non-custodial tipping functionality for Telegram using the existing Solana smart contracts and add Telegram-specific features.

### Technical Design

#### 1.1 Telegram Bot Framework
```javascript
// telegram/bot.js
const TelegramBot = require('node-telegram-bot-api');
const { JustTheTipSDK } = require('../contracts/sdk');

class JustTheTipTelegramBot {
  constructor(token, solanaConfig) {
    this.bot = new TelegramBot(token, { polling: true });
    this.sdk = new JustTheTipSDK(solanaConfig);
    this.registerHandlers();
  }

  registerHandlers() {
    // Command handlers
    this.bot.onText(/\/start/, this.handleStart.bind(this));
    this.bot.onText(/\/tip/, this.handleTip.bind(this));
    this.bot.onText(/\/balance/, this.handleBalance.bind(this));
    this.bot.onText(/\/register/, this.handleRegister.bind(this));
    this.bot.onText(/\/wallet/, this.handleWallet.bind(this));

    // Callback query handlers for inline buttons
    this.bot.on('callback_query', this.handleCallback.bind(this));
  }
}
```

#### 1.2 Tipping Flow

**User Journey**:
1. User sends `/tip @username 10 SOL` or replies to message with `/tip 10 SOL`
2. Bot validates:
   - Sender has registered wallet
   - Recipient exists in system
   - Amount and token are valid
3. Bot generates transaction via smart contract
4. Bot sends inline keyboard with "Sign Transaction" button
5. User clicks button → Opens mini-app or deep link to wallet
6. User signs transaction in wallet
7. Bot monitors blockchain for confirmation
8. Bot notifies both parties with transaction signature

**Command Syntax**:
```
/tip <@username|reply> <amount> <token>
/tip @alice 10 SOL
/tip 5.5 USDC (when replying to a message)
/tip 1000 BONK @bob
```

#### 1.3 Telegram-Specific Features

##### Inline Keyboards
```javascript
const tipKeyboard = {
  inline_keyboard: [
    [
      { text: '✅ Sign & Send', callback_data: `sign_${txId}` },
      { text: '❌ Cancel', callback_data: `cancel_${txId}` }
    ],
    [
      { text: '📊 View Transaction', url: `https://solscan.io/tx/${signature}` }
    ]
  ]
};
```

##### Reply-Based Tipping
- Allow tipping by replying to any message: `/tip 5 USDC`
- Extract recipient from replied message
- Prevents tagging errors

##### Group Chat Features
- Detect mentions: `@username`
- Support multiple recipients: `/tip @alice @bob 10 SOL` (split evenly)
- Rain command: `/rain 100 BONK 10` (distribute to 10 random active users)

#### 1.4 Integration with Existing Smart Contracts

```javascript
// Reuse existing Solana instructions
async function processTelegramTip(senderId, recipientId, amount, token) {
  // 1. Fetch user PDAs from Discord-style IDs mapped to Telegram
  const senderPDA = await sdk.getUserPDA(`telegram_${senderId}`);
  const recipientPDA = await sdk.getUserPDA(`telegram_${recipientId}`);

  // 2. Build transaction
  const tx = token === 'SOL'
    ? await sdk.buildTipSolTx(senderPDA, recipientPDA, amount)
    : await sdk.buildTipSplTokenTx(senderPDA, recipientPDA, amount, token);

  // 3. Return unsigned transaction for user to sign
  return tx;
}
```

#### 1.5 Database Extensions for Telegram

```sql
-- Extend users table to support Telegram
ALTER TABLE users ADD COLUMN telegram_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN telegram_username TEXT;
ALTER TABLE users ADD COLUMN platform TEXT DEFAULT 'discord'; -- 'discord' | 'telegram' | 'both'

-- Telegram-specific tips tracking
CREATE TABLE telegram_tips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_telegram_id TEXT NOT NULL,
  recipient_telegram_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,              -- Group or DM identifier
  message_id INTEGER,                 -- Original message ID
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  signature TEXT,                     -- Solana transaction signature
  status TEXT DEFAULT 'pending',      -- 'pending' | 'signed' | 'confirmed' | 'failed'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TEXT
);

-- Track Telegram chat registrations
CREATE TABLE telegram_chats (
  chat_id TEXT PRIMARY KEY,
  chat_type TEXT NOT NULL,            -- 'private' | 'group' | 'supergroup' | 'channel'
  title TEXT,
  username TEXT,
  registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE
);
```

---

## Feature 2: Telegram Bot API

### Overview
Comprehensive Telegram bot implementation with modern features including mini-apps, inline mode, and payment integration.

### Technical Design

#### 2.1 Bot Commands

##### Core Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Initialize bot, show welcome message | `/start` |
| `/register` | Register Solana wallet | `/register` |
| `/wallet` | View wallet info and QR code | `/wallet` |
| `/balance` | Check balance and portfolio | `/balance` |
| `/tip` | Send tip to user | `/tip @alice 10 SOL` |
| `/withdraw` | Withdraw funds to wallet | `/withdraw 50 USDC` |
| `/deposit` | Get deposit address | `/deposit SOL` |
| `/history` | View transaction history | `/history` |
| `/leaderboard` | Top tippers in chat | `/leaderboard` |
| `/price` | Check token prices | `/price SOL` |
| `/help` | Show help menu | `/help` |

##### Admin Commands
| Command | Description | Permissions |
|---------|-------------|-------------|
| `/stats` | Bot statistics | Admin only |
| `/broadcast` | Send message to all users | Super admin |
| `/ban` | Ban user from bot | Admin |
| `/unban` | Unban user | Admin |

#### 2.2 Inline Mode

Allow users to tip from any chat without adding bot:

```
@JustTheTipBot tip @alice 10 SOL
```

**Implementation**:
```javascript
bot.on('inline_query', async (query) => {
  const userId = query.from.id;
  const queryText = query.query; // "tip @alice 10 SOL"

  const results = [
    {
      type: 'article',
      id: '1',
      title: '💸 Send Tip',
      description: `Tip ${recipient} ${amount} ${token}`,
      input_message_content: {
        message_text: `🎁 Tip sent to ${recipient}!`
      },
      reply_markup: {
        inline_keyboard: [[
          { text: 'Sign Transaction', callback_data: `sign_${txId}` }
        ]]
      }
    }
  ];

  bot.answerInlineQuery(query.id, results);
});
```

#### 2.3 Mini Apps (Telegram Web Apps)

Create rich web-based UI within Telegram:

**Features**:
- Wallet dashboard with portfolio visualization
- Interactive transaction history
- Token swap interface
- NFT gallery for trust badges
- Settings and preferences

**Tech Stack**:
- React + TailwindCSS (match existing branding)
- Telegram Web App SDK
- @twa-dev/sdk npm package

**Implementation**:
```javascript
// telegram/webapp/index.html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script>
  const tg = window.Telegram.WebApp;
  tg.ready();

  // Access user data
  const user = tg.initDataUnsafe.user;

  // Close app
  tg.close();

  // Main button
  tg.MainButton.setText('Sign Transaction');
  tg.MainButton.onClick(() => signAndSendTx());
</script>
```

#### 2.4 Bot Middleware Architecture

```javascript
// telegram/middleware/auth.js
async function authenticateUser(ctx, next) {
  const telegramId = ctx.from.id;
  const user = await db.getUserByTelegramId(telegramId);

  if (!user) {
    return ctx.reply('Please register first: /register');
  }

  ctx.user = user;
  await next();
}

// telegram/middleware/rateLimit.js
const rateLimiter = new Map();

async function rateLimit(ctx, next) {
  const userId = ctx.from.id;
  const now = Date.now();
  const userLimits = rateLimiter.get(userId) || { count: 0, resetAt: now + 60000 };

  if (userLimits.count >= 10 && now < userLimits.resetAt) {
    return ctx.reply('Rate limit exceeded. Try again in a minute.');
  }

  userLimits.count++;
  rateLimiter.set(userId, userLimits);
  await next();
}

// telegram/bot.js
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.use(rateLimit);
bot.command('tip', authenticateUser, handleTip);
```

#### 2.5 Notification System

```javascript
// telegram/notifications.js
class TelegramNotificationService {
  async notifyTipReceived(recipientTelegramId, amount, token, senderName) {
    const message = `
🎁 *You received a tip!*

Amount: \`${amount} ${token}\`
From: ${senderName}
USD Value: $${await this.getUsdValue(amount, token)}

Use /balance to view your wallet.
    `;

    await this.bot.sendMessage(recipientTelegramId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '💰 View Balance', callback_data: 'view_balance' },
          { text: '🔄 Tip Back', callback_data: `tip_back_${senderTelegramId}` }
        ]]
      }
    });
  }

  async notifyTipConfirmed(senderTelegramId, amount, token, recipient, signature) {
    const message = `
✅ *Tip Confirmed!*

Amount: \`${amount} ${token}\`
To: ${recipient}
Status: Confirmed on Solana

[View on Solscan](https://solscan.io/tx/${signature})
    `;

    await this.bot.sendMessage(senderTelegramId, message, { parse_mode: 'Markdown' });
  }
}
```

---

## Feature 3: Telegram Channel and Group Integration

### Overview
Enable JustTheTip functionality in Telegram groups and channels with community-focused features.

### Technical Design

#### 3.1 Group Chat Features

##### Tipping in Groups
```javascript
// Handle tips in group context
async function handleGroupTip(ctx) {
  const chatId = ctx.chat.id;
  const chatType = ctx.chat.type; // 'group' | 'supergroup'

  // Permission check: Is bot admin?
  const botMember = await ctx.telegram.getChatMember(chatId, ctx.botInfo.id);
  if (!['administrator', 'creator'].includes(botMember.status)) {
    return ctx.reply('Please make me an admin to enable tipping.');
  }

  // Extract tip details
  const { recipient, amount, token } = parseTipCommand(ctx.message.text);

  // Process tip
  await processTip(ctx.from.id, recipient.id, amount, token, chatId);
}
```

##### Rain Command (Mass Tipping)
```javascript
// /rain 1000 BONK 10
// Distributes 1000 BONK to 10 random recent active members

async function handleRain(ctx, amount, token, recipientCount) {
  const chatId = ctx.chat.id;

  // Get recent active members (last 24h)
  const activeMembers = await getActiveChatMembers(chatId, '24h');

  // Select random recipients
  const recipients = selectRandomUsers(activeMembers, recipientCount);

  // Calculate amount per person
  const amountPerPerson = amount / recipientCount;

  // Create multi-recipient transaction
  const tx = await sdk.buildMultiRecipientTx(ctx.from.id, recipients, amountPerPerson, token);

  // Send for signature
  await promptSignature(ctx, tx);

  // Notify all recipients
  for (const recipient of recipients) {
    await notifyRainReceived(recipient, amountPerPerson, token, ctx.from);
  }
}
```

##### Leaderboard System
```javascript
async function generateGroupLeaderboard(chatId, period = '30d') {
  const stats = await db.query(`
    SELECT
      sender_telegram_id,
      telegram_username,
      COUNT(*) as tip_count,
      SUM(amount_usd) as total_usd
    FROM telegram_tips
    WHERE chat_id = ?
      AND created_at > datetime('now', ?)
      AND status = 'confirmed'
    GROUP BY sender_telegram_id
    ORDER BY total_usd DESC
    LIMIT 10
  `, [chatId, `-${period}`]);

  let message = '🏆 *Top Tippers (Last 30 Days)*\n\n';
  stats.forEach((user, index) => {
    const medal = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
    message += `${medal} ${user.telegram_username}\n`;
    message += `   💰 $${user.total_usd.toFixed(2)} • ${user.tip_count} tips\n\n`;
  });

  return message;
}
```

#### 3.2 Channel Integration

##### Read-Only Channel Announcements
```javascript
// Post tipping statistics to channel
async function postChannelStats(channelId) {
  const stats = await getGlobalStats();

  const message = `
📊 *JustTheTip Daily Stats*

💸 Total Tips Today: ${stats.tipCount}
💰 Total Volume: $${stats.volumeUsd.toFixed(2)}
👥 Active Users: ${stats.activeUsers}
🔥 Most Tipped Token: ${stats.topToken}

[Start Tipping](https://t.me/JustTheTipBot)
  `;

  await bot.telegram.sendMessage(channelId, message, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  });
}
```

##### Discussion Groups Linked to Channels
- Enable tipping in discussion groups
- Cross-post major tips to main channel
- Verified tipper badges for channel subscribers

#### 3.3 Group Settings & Administration

```sql
-- Group configuration table
CREATE TABLE telegram_group_settings (
  chat_id TEXT PRIMARY KEY,
  allow_tipping BOOLEAN DEFAULT TRUE,
  min_tip_amount REAL DEFAULT 0.01,
  allowed_tokens TEXT DEFAULT 'SOL,USDC,BONK,USDT',  -- Comma-separated
  require_registration BOOLEAN DEFAULT TRUE,
  enable_leaderboard BOOLEAN DEFAULT TRUE,
  enable_notifications BOOLEAN DEFAULT TRUE,
  admin_telegram_ids TEXT,                            -- Comma-separated admin IDs
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Admin Commands for Groups**:
```
/group_settings - View current group settings
/set_min_tip 0.1 - Set minimum tip amount
/set_tokens SOL,USDC - Set allowed tokens
/enable_leaderboard - Enable leaderboard
/disable_notifications - Disable tip notifications
```

#### 3.4 Anti-Spam & Security for Groups

```javascript
// telegram/middleware/antiSpam.js
class AntiSpamMiddleware {
  constructor() {
    this.userActivity = new Map();
  }

  async checkSpam(ctx, next) {
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const now = Date.now();

    const key = `${userId}_${chatId}`;
    const activity = this.userActivity.get(key) || [];

    // Remove old activities (older than 1 minute)
    const recentActivity = activity.filter(ts => now - ts < 60000);

    // Check if more than 5 commands in 1 minute
    if (recentActivity.length >= 5) {
      await ctx.reply('⚠️ Slow down! You are sending commands too fast.');

      // Notify group admins if in group
      if (ctx.chat.type !== 'private') {
        await this.notifyAdmins(chatId, `User ${ctx.from.username} is spamming commands.`);
      }

      return; // Block execution
    }

    recentActivity.push(now);
    this.userActivity.set(key, recentActivity);

    await next();
  }
}
```

---

## Feature 4: Branded Wallet using Passkeys

### Overview
Implement a modern, user-friendly wallet system using WebAuthn passkeys for authentication, eliminating seed phrase management while maintaining non-custodial security.

### Technical Design

#### 4.1 Passkey Authentication Architecture

**Benefits**:
- No seed phrases to manage
- Biometric authentication (Face ID, Touch ID, Windows Hello)
- Phishing-resistant
- Works across devices via cloud sync (iCloud Keychain, Google Password Manager)
- Better UX than traditional wallet apps

**Implementation Stack**:
- **WebAuthn/FIDO2**: Browser standard for passkey authentication
- **@simplewebauthn/browser**: Client-side library
- **@simplewebauthn/server**: Server-side verification
- **Solana Key Derivation**: Derive Ed25519 keys from passkey credentials

#### 4.2 Wallet Architecture

```
┌─────────────────────────────────────┐
│   User Device (Phone/Computer)      │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   Passkey (Secure Enclave)   │  │
│  │   • Biometric Auth           │  │
│  │   • Private Key (never leaves)│  │
│  └──────────────────────────────┘  │
│              │                      │
│              │ WebAuthn Challenge   │
│              ▼                      │
│  ┌──────────────────────────────┐  │
│  │    JustTheTip Wallet App     │  │
│  │    (Mini App / Web App)      │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
                │
                │ Signed Transaction
                ▼
┌─────────────────────────────────────┐
│      JustTheTip Backend API         │
│  • Verify passkey signature         │
│  • Submit to Solana blockchain      │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│       Solana Blockchain             │
│  • Execute smart contract           │
│  • Update on-chain state            │
└─────────────────────────────────────┘
```

#### 4.3 Passkey Registration Flow

```javascript
// wallet/passkey-registration.js
import { startRegistration } from '@simplewebauthn/browser';

async function registerPasskey(userId, username) {
  // 1. Request registration options from server
  const optionsResponse = await fetch('/api/wallet/passkey/register/begin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, username })
  });

  const options = await optionsResponse.json();

  // 2. Trigger passkey creation (biometric prompt)
  let attResp;
  try {
    attResp = await startRegistration(options);
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      throw new Error('User cancelled passkey creation');
    }
    throw error;
  }

  // 3. Send attestation to server for verification
  const verificationResponse = await fetch('/api/wallet/passkey/register/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, attestation: attResp })
  });

  const result = await verificationResponse.json();

  if (result.verified) {
    // 4. Derive Solana wallet address from passkey
    const walletAddress = result.solanaAddress;

    // 5. Initialize user on-chain
    await initializeUserOnChain(userId, walletAddress);

    return { success: true, walletAddress };
  } else {
    throw new Error('Passkey verification failed');
  }
}
```

**Server-Side (Registration)**:
```javascript
// api/wallet/passkeyRoutes.js
import {
  generateRegistrationOptions,
  verifyRegistrationResponse
} from '@simplewebauthn/server';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';

// Begin registration
app.post('/api/wallet/passkey/register/begin', async (req, res) => {
  const { userId, username } = req.body;

  // Generate WebAuthn registration options
  const options = await generateRegistrationOptions({
    rpName: 'JustTheTip Wallet',
    rpID: 'justthetip.app',
    userID: userId,
    userName: username,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Prefer platform authenticators
      requireResidentKey: true,
      userVerification: 'required'
    }
  });

  // Store challenge temporarily (10 min expiration)
  await db.storePasskeyChallenge(userId, options.challenge);

  res.json(options);
});

// Complete registration
app.post('/api/wallet/passkey/register/complete', async (req, res) => {
  const { userId, attestation } = req.body;

  // Retrieve challenge
  const expectedChallenge = await db.getPasskeyChallenge(userId);

  // Verify attestation
  const verification = await verifyRegistrationResponse({
    response: attestation,
    expectedChallenge,
    expectedOrigin: 'https://justthetip.app',
    expectedRPID: 'justthetip.app'
  });

  if (!verification.verified) {
    return res.status(400).json({ error: 'Verification failed' });
  }

  // Extract credential
  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

  // Derive Solana keypair from credential
  // Option 1: Use credentialID as seed
  const seed = Buffer.from(credentialID).slice(0, 32); // First 32 bytes
  const keypair = Keypair.fromSeed(seed);

  // Option 2: Generate deterministic keypair using credentialID + user secret
  // const mnemonic = bip39.entropyToMnemonic(credentialID);
  // const seed = bip39.mnemonicToSeedSync(mnemonic);
  // const keypair = Keypair.fromSeed(seed.slice(0, 32));

  const walletAddress = keypair.publicKey.toString();

  // Store passkey credential
  await db.storePasskeyCredential({
    userId,
    credentialID: Buffer.from(credentialID).toString('base64'),
    credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
    counter,
    walletAddress,
    platform: attestation.authenticatorAttachment
  });

  res.json({
    verified: true,
    solanaAddress: walletAddress
  });
});
```

#### 4.4 Passkey Authentication & Transaction Signing

```javascript
// wallet/passkey-signing.js
import { startAuthentication } from '@simplewebauthn/browser';

async function signTransactionWithPasskey(userId, transaction) {
  // 1. Request authentication options
  const optionsResponse = await fetch('/api/wallet/passkey/auth/begin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });

  const options = await optionsResponse.json();

  // 2. Trigger biometric authentication
  const authResp = await startAuthentication(options);

  // 3. Send transaction + authentication to server for signing
  const signResponse = await fetch('/api/wallet/passkey/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      authentication: authResp,
      transaction: transaction.serialize()
    })
  });

  const result = await signResponse.json();

  if (result.success) {
    return {
      signature: result.signature,
      signedTransaction: result.signedTransaction
    };
  } else {
    throw new Error('Transaction signing failed');
  }
}
```

**Server-Side (Signing)**:
```javascript
// api/wallet/passkeyRoutes.js
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { Transaction } from '@solana/web3.js';

app.post('/api/wallet/passkey/sign', async (req, res) => {
  const { userId, authentication, transaction } = req.body;

  // 1. Verify authentication
  const credential = await db.getPasskeyCredential(userId);
  const expectedChallenge = await db.getAuthChallenge(userId);

  const verification = await verifyAuthenticationResponse({
    response: authentication,
    expectedChallenge,
    expectedOrigin: 'https://justthetip.app',
    expectedRPID: 'justthetip.app',
    authenticator: {
      credentialID: Buffer.from(credential.credentialID, 'base64'),
      credentialPublicKey: Buffer.from(credential.credentialPublicKey, 'base64'),
      counter: credential.counter
    }
  });

  if (!verification.verified) {
    return res.status(401).json({ error: 'Authentication failed' });
  }

  // 2. Update counter (prevent replay attacks)
  await db.updatePasskeyCounter(userId, verification.authenticationInfo.newCounter);

  // 3. Retrieve user's Solana keypair (derived from passkey)
  const keypair = await deriveKeypairFromPasskey(userId, credential.credentialID);

  // 4. Sign transaction
  const tx = Transaction.from(Buffer.from(transaction, 'base64'));
  tx.sign(keypair);

  // 5. Submit to Solana
  const signature = await connection.sendRawTransaction(tx.serialize());

  res.json({
    success: true,
    signature,
    signedTransaction: tx.serialize().toString('base64')
  });
});
```

#### 4.5 Database Schema for Passkey Wallet

```sql
-- Passkey credentials storage
CREATE TABLE passkey_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,              -- Discord or Telegram ID
  platform TEXT NOT NULL,             -- 'discord' | 'telegram'
  credential_id TEXT UNIQUE NOT NULL, -- Base64 encoded credential ID
  credential_public_key TEXT NOT NULL, -- Base64 encoded public key
  counter INTEGER DEFAULT 0,          -- Signature counter (replay protection)
  wallet_address TEXT NOT NULL,       -- Derived Solana address
  device_name TEXT,                   -- Optional: "iPhone 15", "MacBook Pro"
  authenticator_attachment TEXT,      -- 'platform' | 'cross-platform'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  UNIQUE(user_id, platform)
);

-- Passkey challenges (temporary storage)
CREATE TABLE passkey_challenges (
  challenge TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,                 -- 'registration' | 'authentication'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

-- Index for quick lookups
CREATE INDEX idx_passkey_user ON passkey_credentials(user_id, platform);
CREATE INDEX idx_passkey_wallet ON passkey_credentials(wallet_address);
CREATE INDEX idx_challenge_expiry ON passkey_challenges(expires_at);
```

#### 4.6 Branded Wallet UI/UX

**Design System** (following existing JustTheTip branding):
```css
/* wallet/styles.css */
:root {
  --wallet-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --wallet-card-bg: rgba(255, 255, 255, 0.05);
  --wallet-border: rgba(255, 255, 255, 0.1);
  --success-color: #10b981;
  --error-color: #ef4444;
}

.wallet-card {
  background: var(--wallet-card-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--wallet-border);
  border-radius: 16px;
  padding: 24px;
}

.wallet-balance {
  font-size: 48px;
  font-weight: 700;
  background: var(--wallet-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

**React Components**:
```jsx
// wallet/components/WalletDashboard.jsx
import { usePasskeyWallet } from '../hooks/usePasskeyWallet';

export function WalletDashboard() {
  const { balance, walletAddress, transactions, isLoading } = usePasskeyWallet();

  return (
    <div className="wallet-dashboard">
      <WalletHeader address={walletAddress} />

      <BalanceCard
        balance={balance}
        tokens={['SOL', 'USDC', 'BONK', 'USDT']}
      />

      <QuickActions
        onSend={() => openSendModal()}
        onReceive={() => openReceiveModal()}
        onSwap={() => openSwapModal()}
      />

      <TransactionHistory transactions={transactions} />

      <SecuritySettings />
    </div>
  );
}

// wallet/components/PasskeyRegistration.jsx
export function PasskeyRegistration({ userId, username }) {
  const [status, setStatus] = useState('idle');

  const handleRegister = async () => {
    setStatus('registering');

    try {
      const result = await registerPasskey(userId, username);
      setStatus('success');

      // Show success message with wallet address
      showToast(`Wallet created: ${result.walletAddress}`);
    } catch (error) {
      setStatus('error');
      showToast(error.message, 'error');
    }
  };

  return (
    <div className="passkey-registration">
      <h2>Create Your JustTheTip Wallet</h2>
      <p>Use your device's biometric authentication for secure access.</p>

      <button
        onClick={handleRegister}
        disabled={status === 'registering'}
        className="btn-gradient"
      >
        {status === 'registering' ? 'Creating Wallet...' : '🔐 Create Wallet'}
      </button>

      <SecurityFeatures />
    </div>
  );
}
```

#### 4.7 Passkey Wallet Features

##### Multi-Device Sync
- Passkeys automatically sync via iCloud Keychain (iOS/macOS) or Google Password Manager (Android/Chrome)
- Users can access wallet from any synced device
- Optional: Add additional passkeys for different devices

##### Recovery Options
```javascript
// wallet/recovery.js

// Option 1: Social Recovery (Guardian System)
async function setupSocialRecovery(userId, guardians) {
  // guardians: Array of Discord/Telegram IDs
  // Require 2 of 3 guardians to approve recovery

  await db.setSocialRecoveryGuardians(userId, guardians, { threshold: 2 });
}

// Option 2: Email Recovery Link
async function setupEmailRecovery(userId, email) {
  // Send encrypted recovery data to email
  // User can recover wallet with email verification

  const recoveryToken = generateSecureToken();
  await sendRecoveryEmail(email, recoveryToken);
  await db.storeRecoveryToken(userId, recoveryToken);
}

// Option 3: Backup Passkey (Offline)
async function generateBackupPasskey(userId) {
  // Generate secondary passkey stored on hardware security key
  // YubiKey, Titan Key, etc.

  const backupOptions = await generateRegistrationOptions({
    ...standardOptions,
    authenticatorSelection: {
      authenticatorAttachment: 'cross-platform' // External authenticator
    }
  });

  return backupOptions;
}
```

##### Security Features
- **Biometric Authentication**: Face ID, Touch ID, Windows Hello
- **Device-Bound Keys**: Private keys never leave secure enclave
- **Replay Protection**: Counter-based signature verification
- **Phishing Resistant**: Origin-bound credentials
- **Rate Limiting**: Maximum 3 failed attempts before lockout
- **Session Management**: 15-minute active sessions, re-auth required for sensitive operations

##### Transaction Limits & Safeguards
```javascript
// wallet/security/transactionLimits.js
const TRANSACTION_LIMITS = {
  hourly: {
    SOL: 10,
    USDC: 1000,
    BONK: 1000000,
    USDT: 1000
  },
  daily: {
    SOL: 50,
    USDC: 5000,
    BONK: 10000000,
    USDT: 5000
  }
};

async function checkTransactionLimit(userId, amount, token, period) {
  const recentTxs = await db.getUserTransactions(userId, period);
  const totalSent = recentTxs
    .filter(tx => tx.token === token)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const limit = TRANSACTION_LIMITS[period][token];

  if (totalSent + amount > limit) {
    throw new Error(`${period} limit exceeded for ${token}. Limit: ${limit}`);
  }

  return true;
}
```

---

## Architecture & Technology Stack

### Technology Additions

#### Telegram Integration
```json
{
  "dependencies": {
    "node-telegram-bot-api": "^0.66.0",
    "telegraf": "^4.15.0",
    "@grammyjs/grammy": "^1.19.0",
    "telegram-web-app": "^7.0.0"
  }
}
```

#### Passkey/WebAuthn
```json
{
  "dependencies": {
    "@simplewebauthn/browser": "^9.0.0",
    "@simplewebauthn/server": "^9.0.0",
    "@github/webauthn-json": "^2.1.1"
  }
}
```

### Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Discord    │  │   Telegram   │  │  Web Wallet  │ │
│  │     Bot      │  │     Bot      │  │   Mini App   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   API Gateway Layer                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │          Express REST API (api/server.js)        │  │
│  │  • Discord routes    • Telegram routes           │  │
│  │  • Wallet routes     • Passkey routes            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Business Logic Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Tipping     │  │   Wallet     │  │   Passkey    │ │
│  │   Service    │  │   Service    │  │   Service    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Notification │  │   Price      │  │   Security   │ │
│  │   Service    │  │   Service    │  │   Service    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Database   │  │    Solana    │  │   External   │
│  PostgreSQL  │  │  Blockchain  │  │     APIs     │
│   /SQLite    │  │  + Programs  │  │  CoinGecko   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Database Schema Extensions

### Complete Schema for Telegram + Passkey

```sql
-- ========================================
-- TELEGRAM INTEGRATION TABLES
-- ========================================

-- Telegram users (extends existing users table)
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'discord';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_via TEXT; -- 'discord' | 'telegram' | 'web'

-- Telegram-specific tips
CREATE TABLE telegram_tips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_telegram_id TEXT NOT NULL,
  sender_username TEXT,
  recipient_telegram_id TEXT NOT NULL,
  recipient_username TEXT,
  chat_id TEXT NOT NULL,
  chat_type TEXT NOT NULL,              -- 'private' | 'group' | 'supergroup' | 'channel'
  message_id INTEGER,
  reply_to_message_id INTEGER,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  amount_usd REAL,
  signature TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  signed_at TEXT,
  confirmed_at TEXT,
  FOREIGN KEY (sender_telegram_id) REFERENCES users(telegram_id),
  FOREIGN KEY (recipient_telegram_id) REFERENCES users(telegram_id)
);

-- Telegram chats/groups
CREATE TABLE telegram_chats (
  chat_id TEXT PRIMARY KEY,
  chat_type TEXT NOT NULL,
  title TEXT,
  username TEXT,
  description TEXT,
  member_count INTEGER,
  is_bot_admin BOOLEAN DEFAULT FALSE,
  settings_json TEXT,                   -- JSON blob for group settings
  registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE
);

-- Telegram group settings
CREATE TABLE telegram_group_settings (
  chat_id TEXT PRIMARY KEY,
  allow_tipping BOOLEAN DEFAULT TRUE,
  min_tip_amount REAL DEFAULT 0.01,
  allowed_tokens TEXT DEFAULT 'SOL,USDC,BONK,USDT',
  require_registration BOOLEAN DEFAULT TRUE,
  enable_leaderboard BOOLEAN DEFAULT TRUE,
  enable_notifications BOOLEAN DEFAULT TRUE,
  enable_rain BOOLEAN DEFAULT TRUE,
  max_rain_recipients INTEGER DEFAULT 50,
  admin_telegram_ids TEXT,
  moderator_telegram_ids TEXT,
  banned_user_ids TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES telegram_chats(chat_id)
);

-- Telegram user activity (for rain command)
CREATE TABLE telegram_user_activity (
  chat_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  last_message_at TEXT DEFAULT CURRENT_TIMESTAMP,
  message_count INTEGER DEFAULT 1,
  PRIMARY KEY (chat_id, telegram_id),
  FOREIGN KEY (chat_id) REFERENCES telegram_chats(chat_id),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ========================================
-- PASSKEY WALLET TABLES
-- ========================================

-- Passkey credentials
CREATE TABLE passkey_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,               -- 'discord' | 'telegram' | 'web'
  credential_id TEXT UNIQUE NOT NULL,
  credential_public_key TEXT NOT NULL,
  counter INTEGER DEFAULT 0,
  wallet_address TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,                     -- 'phone' | 'computer' | 'tablet' | 'security_key'
  authenticator_attachment TEXT,        -- 'platform' | 'cross-platform'
  transports TEXT,                      -- JSON array: ['internal', 'usb', 'nfc', 'ble']
  backup_eligible BOOLEAN DEFAULT FALSE,
  backup_state BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  UNIQUE(user_id, platform, device_name)
);

-- Passkey challenges (temporary)
CREATE TABLE passkey_challenges (
  challenge TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  type TEXT NOT NULL,                   -- 'registration' | 'authentication' | 'transaction'
  metadata TEXT,                        -- JSON: transaction details, etc.
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

-- Wallet recovery methods
CREATE TABLE wallet_recovery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  recovery_type TEXT NOT NULL,          -- 'social' | 'email' | 'backup_passkey'
  recovery_data TEXT NOT NULL,          -- JSON with recovery-specific data
  status TEXT DEFAULT 'active',         -- 'active' | 'revoked' | 'used'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  UNIQUE(user_id, platform, recovery_type)
);

-- Social recovery guardians
CREATE TABLE social_recovery_guardians (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  guardian_user_id TEXT NOT NULL,
  guardian_platform TEXT NOT NULL,
  guardian_name TEXT,
  status TEXT DEFAULT 'pending',        -- 'pending' | 'accepted' | 'declined' | 'revoked'
  threshold INTEGER NOT NULL,           -- Number of guardians required to recover
  approval_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  accepted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Wallet transaction history (passkey-signed)
CREATE TABLE wallet_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  transaction_type TEXT NOT NULL,       -- 'tip' | 'withdraw' | 'deposit' | 'swap'
  from_address TEXT,
  to_address TEXT,
  amount REAL NOT NULL,
  token TEXT NOT NULL,
  amount_usd REAL,
  signature TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  passkey_credential_id TEXT,
  device_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (passkey_credential_id) REFERENCES passkey_credentials(credential_id)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX idx_telegram_tips_sender ON telegram_tips(sender_telegram_id, created_at);
CREATE INDEX idx_telegram_tips_recipient ON telegram_tips(recipient_telegram_id, created_at);
CREATE INDEX idx_telegram_tips_chat ON telegram_tips(chat_id, created_at);
CREATE INDEX idx_telegram_tips_status ON telegram_tips(status, created_at);

CREATE INDEX idx_telegram_activity_chat ON telegram_user_activity(chat_id, last_message_at);
CREATE INDEX idx_telegram_activity_user ON telegram_user_activity(telegram_id, last_message_at);

CREATE INDEX idx_passkey_user ON passkey_credentials(user_id, platform);
CREATE INDEX idx_passkey_wallet ON passkey_credentials(wallet_address);
CREATE INDEX idx_passkey_last_used ON passkey_credentials(last_used_at);

CREATE INDEX idx_challenge_expiry ON passkey_challenges(expires_at);
CREATE INDEX idx_challenge_user ON passkey_challenges(user_id, platform, type);

CREATE INDEX idx_wallet_tx_user ON wallet_transactions(user_id, created_at);
CREATE INDEX idx_wallet_tx_address ON wallet_transactions(wallet_address, created_at);
CREATE INDEX idx_wallet_tx_signature ON wallet_transactions(signature);
```

---

## API Endpoints

### New Telegram Endpoints

```
POST   /api/telegram/webhook                    # Telegram webhook handler
GET    /api/telegram/bot/info                   # Bot information
POST   /api/telegram/user/register              # Register Telegram user
GET    /api/telegram/user/:telegramId           # Get user info
POST   /api/telegram/tip/create                 # Create tip transaction
GET    /api/telegram/tip/:tipId                 # Get tip status
POST   /api/telegram/tip/confirm                # Confirm tip
GET    /api/telegram/chat/:chatId/settings      # Get group settings
PUT    /api/telegram/chat/:chatId/settings      # Update group settings
GET    /api/telegram/chat/:chatId/leaderboard   # Get group leaderboard
POST   /api/telegram/rain/create                # Create rain tip
GET    /api/telegram/stats                      # Telegram bot statistics
```

### New Passkey Wallet Endpoints

```
POST   /api/wallet/passkey/register/begin       # Start passkey registration
POST   /api/wallet/passkey/register/complete    # Complete registration
POST   /api/wallet/passkey/auth/begin           # Start authentication
POST   /api/wallet/passkey/auth/complete        # Complete authentication
POST   /api/wallet/passkey/sign                 # Sign transaction with passkey
GET    /api/wallet/passkey/credentials          # List user's passkeys
DELETE /api/wallet/passkey/credentials/:id      # Revoke passkey
POST   /api/wallet/passkey/recovery/social      # Setup social recovery
POST   /api/wallet/passkey/recovery/email       # Setup email recovery
POST   /api/wallet/passkey/recovery/initiate    # Initiate recovery process
GET    /api/wallet/:address/balance             # Get wallet balance
GET    /api/wallet/:address/transactions        # Get transaction history
POST   /api/wallet/withdraw                     # Withdraw to external wallet
```

---

## Security Considerations

### Telegram-Specific Security

1. **Webhook Validation**
   ```javascript
   function verifyTelegramWebhook(req) {
     const secret = crypto.createHash('sha256')
       .update(process.env.TELEGRAM_BOT_TOKEN)
       .digest();

     const checkString = Object.keys(req.body)
       .filter(key => key !== 'hash')
       .sort()
       .map(key => `${key}=${req.body[key]}`)
       .join('\n');

     const hmac = crypto.createHmac('sha256', secret)
       .update(checkString)
       .digest('hex');

     return hmac === req.body.hash;
   }
   ```

2. **Rate Limiting Per Chat**
   - Group chats: 10 tips per minute per chat
   - Private chats: 5 tips per minute per user
   - Rain command: 1 per hour per chat

3. **Anti-Spam Measures**
   - Require minimum account age (7 days)
   - Minimum message count before tipping (10 messages)
   - Captcha verification for new users

### Passkey Security

1. **Credential Storage**
   - Never store raw private keys
   - Credential IDs and public keys only
   - Counter-based replay protection

2. **Challenge Validation**
   - Challenges expire after 5 minutes
   - Single-use challenges
   - Cryptographically random (crypto.randomBytes)

3. **Transaction Signing**
   - Re-authenticate for amounts > $100
   - Require biometric for all transactions
   - Transaction limit: 10 per hour

4. **Recovery Security**
   - Social recovery requires 2/3 guardians
   - Email recovery with 48-hour waiting period
   - Notify all devices when recovery initiated

---

## Development Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Telegram bot framework
- [ ] Implement basic command handlers
- [ ] Database schema migration for Telegram support
- [ ] Basic tipping functionality in DMs

### Phase 2: Group Features (Weeks 3-4)
- [ ] Group chat integration
- [ ] Leaderboard system
- [ ] Rain command implementation
- [ ] Admin commands for groups

### Phase 3: Passkey Wallet (Weeks 5-7)
- [ ] WebAuthn server implementation
- [ ] Passkey registration flow
- [ ] Transaction signing with passkeys
- [ ] Recovery system implementation

### Phase 4: Mini App & UI (Weeks 8-9)
- [ ] Telegram mini app framework
- [ ] Wallet dashboard UI
- [ ] Transaction history UI
- [ ] Settings and security UI

### Phase 5: Testing & Polish (Weeks 10-11)
- [ ] Integration testing
- [ ] Security audit
- [ ] Performance optimization
- [ ] User acceptance testing

### Phase 6: Deployment (Week 12)
- [ ] Staging environment deployment
- [ ] Beta testing with select users
- [ ] Production deployment
- [ ] Documentation and guides

---

## Testing Strategy

### Unit Tests
```javascript
// __tests__/telegram/tipCommand.test.js
describe('Telegram Tip Command', () => {
  it('should parse tip command correctly', () => {
    const result = parseTipCommand('/tip @alice 10 SOL');
    expect(result).toEqual({
      recipient: 'alice',
      amount: 10,
      token: 'SOL'
    });
  });

  it('should reject invalid amounts', () => {
    expect(() => parseTipCommand('/tip @alice -5 SOL')).toThrow();
  });
});

// __tests__/wallet/passkey.test.js
describe('Passkey Registration', () => {
  it('should generate valid registration options', async () => {
    const options = await generateRegistrationOptions({
      userId: 'test123',
      username: 'testuser'
    });

    expect(options.challenge).toBeDefined();
    expect(options.rp.name).toBe('JustTheTip Wallet');
  });

  it('should derive consistent Solana address', () => {
    const credentialId = Buffer.from('test-credential-id');
    const address1 = deriveWalletAddress(credentialId);
    const address2 = deriveWalletAddress(credentialId);

    expect(address1).toBe(address2);
  });
});
```

### Integration Tests
```javascript
// __tests__/integration/telegram-tipping.test.js
describe('End-to-End Telegram Tipping', () => {
  it('should complete tip flow', async () => {
    // 1. Register users
    await registerTelegramUser('alice', 'alice123');
    await registerTelegramUser('bob', 'bob456');

    // 2. Fund Alice's wallet
    await fundWallet('alice123', 10, 'SOL');

    // 3. Send tip command
    const tipResult = await sendTipCommand('alice123', 'bob456', 5, 'SOL');

    // 4. Sign transaction
    const signResult = await signTransaction(tipResult.txId, 'alice123');

    // 5. Verify balances
    const aliceBalance = await getBalance('alice123');
    const bobBalance = await getBalance('bob456');

    expect(aliceBalance.SOL).toBeLessThan(5); // Less due to fees
    expect(bobBalance.SOL).toBe(5);
  });
});
```

---

## Deployment Strategy

### Infrastructure Requirements

1. **Telegram Bot Server**
   - Railway or Heroku
   - Webhook endpoint: `/api/telegram/webhook`
   - Environment variables: `TELEGRAM_BOT_TOKEN`

2. **Passkey Wallet API**
   - HTTPS required (WebAuthn requirement)
   - Origin: `https://justthetip.app`
   - SSL certificate

3. **Database Migration**
   ```bash
   # Apply Telegram schema
   npm run db:migrate -- --schema telegram

   # Apply passkey schema
   npm run db:migrate -- --schema passkey
   ```

### Environment Variables

```env
# Telegram Configuration
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_WEBHOOK_URL=https://justthetip.app/api/telegram/webhook
TELEGRAM_MINI_APP_URL=https://justthetip.app/wallet

# Passkey Configuration
PASSKEY_RP_NAME=JustTheTip Wallet
PASSKEY_RP_ID=justthetip.app
PASSKEY_ORIGIN=https://justthetip.app
WEBAUTHN_TIMEOUT=300000

# Security
PASSKEY_CHALLENGE_EXPIRY=300
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
```

### Deployment Checklist

- [ ] Deploy Telegram bot to Railway
- [ ] Set webhook: `setWebhook` API call
- [ ] Deploy wallet mini app to Vercel
- [ ] Configure CORS for passkey endpoints
- [ ] Run database migrations
- [ ] Test webhook connectivity
- [ ] Test passkey registration on production
- [ ] Monitor error logs
- [ ] Set up Telegram bot commands menu
- [ ] Announce launch in Discord and Telegram

---

## Contribution to Upstream

### Preparation for Pull Request

Before submitting PR to main JustTheTip repository:

1. **Code Quality**
   - [ ] All tests passing
   - [ ] ESLint clean
   - [ ] Documentation complete
   - [ ] No console.logs in production code

2. **Feature Flags**
   ```javascript
   // config.js
   module.exports = {
     features: {
       telegramBot: process.env.ENABLE_TELEGRAM === 'true',
       passkeyWallet: process.env.ENABLE_PASSKEY === 'true'
     }
   };
   ```

3. **Backward Compatibility**
   - Existing Discord functionality unchanged
   - Database migrations non-destructive
   - Optional feature toggles

4. **Documentation**
   - Update main README.md
   - Add TELEGRAM_SETUP.md guide
   - Add PASSKEY_WALLET.md guide
   - Update API documentation

### Fork Contribution Strategy

**Approach**: Keep features in fork until mature, then propose upstream merge

1. **Maintain fork with regular upstream syncs**
   ```bash
   git remote add upstream https://github.com/jmenichole/Justthetip.git
   git fetch upstream
   git merge upstream/main
   ```

2. **Create feature branch for PR**
   ```bash
   git checkout -b feature/telegram-passkey-integration
   ```

3. **Prepare detailed PR description**
   - Feature overview
   - Architecture decisions
   - Breaking changes (if any)
   - Testing performed
   - Screenshots/demos

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Set up development environment** for Telegram and passkey testing
3. **Create GitHub issues** for each phase milestone
4. **Begin Phase 1 implementation**
5. **Regular progress updates** to track development

---

**Document Version**: 1.0
**Last Updated**: 2025-11-11
**Author**: 4eckd
**Status**: Ready for Implementation
