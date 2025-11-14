# JustTheTip Bot - Complete Slash Commands and Functions Reference

**Last Updated:** November 12, 2025  
**Bot Version:** 1.0.0 (Smart Contract Non-Custodial)  
**Total Commands:** 13 (11 public + 2 admin)

---

## 📋 Table of Contents

1. [Verification & Wallet Commands](#verification--wallet-commands)
2. [Balance & Status Commands](#balance--status-commands)
3. [Help & Information Commands](#help--information-commands)
4. [Admin Commands](#admin-commands)
5. [Core Bot Functions](#core-bot-functions)
6. [API Endpoints](#api-endpoints)
7. [SDK Functions](#sdk-functions)
8. [Database Operations](#database-operations)
9. [Security Features](#security-features)
10. [Rate Limiting](#rate-limiting)

---

## Verification & Wallet Commands

### `/verify`
**Description:** ✅ Complete Discord verification and get your NFT badge!

**Parameters:**
- `wallet` (STRING, required) - Your Solana wallet address

**Usage Example:**
```
/verify wallet: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

**Function:**
- Validates Solana wallet address format
- Checks if wallet is already registered
- Initiates verification NFT minting process
- Requires 0.02 SOL payment to be confirmed

**Response:**
- Success: Verification status embed with next steps
- Error: Invalid wallet format or already registered

**Rate Limit:** 10 calls per minute (default)

---

### `/register-wallet`
**Description:** 🔐 Register your Solana wallet with signature verification

**Parameters:** None

**Usage Example:**
```
/register-wallet
```

**Function:**
- Generates unique UUID v4 nonce for security
- Creates verification URL with encoded user data
- Returns Discord embed with clickable "Register Wallet" button
- Opens wallet selection modal (Phantom, Solflare, Trust, Coinbase, Backpack)

**Implementation:**
```javascript
const nonce = crypto.randomUUID();
const registrationUrl = `${FRONTEND_URL}/sign.html?user=${userId}&username=${username}&nonce=${nonce}`;
```

**Response:**
- Ephemeral message (only visible to user)
- Purple embed with bot icon
- Button linking to registration page
- Instructions for wallet connection

**Rate Limit:** 5 calls per 15 minutes

**Security:**
- Nonce expires after 10 minutes
- One-time use per nonce
- Prevents replay attacks

---

### `/connect-wallet`
**Description:** 🔗 Link your Solana wallet to your Discord account

**Parameters:**
- `wallet-address` (STRING, required) - Your Solana wallet public key
- `signature` (STRING, required) - Signature to prove wallet ownership

**Usage Example:**
```
/connect-wallet wallet-address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU signature: 3a8d9f7e...
```

**Function:**
- Validates wallet address format (base58)
- Verifies cryptographic signature using public key
- Confirms message matches expected format
- Stores wallet-Discord mapping in database

**Signature Verification Process:**
1. Constructs expected message: `"Connect wallet to Discord: {discordUserId}"`
2. Decodes signature from base64
3. Verifies signature matches public key and message
4. Checks nonce hasn't expired or been used

**Response:**
- Success: "✅ Wallet connected successfully!" embed
- Error: "Invalid signature" or "Wallet already registered"

**Rate Limit:** 3 calls per minute

---

### `/get-badge`
**Description:** 🎖️ Mint your verification NFT badge (requires payment)

**Parameters:** None

**Usage Example:**
```
/get-badge
```

**Function:**
- Checks if wallet is connected
- Verifies payment of 0.02 SOL has been received
- Initiates NFT minting via Metaplex
- Mints verification badge to user's wallet

**NFT Metadata:**
- Name: "JustTheTip Verified - {Discord Username}"
- Symbol: "JTTV"
- Description: "Official Discord verification badge"
- Collection: Verified collection address
- Attributes: Discord ID, verification date, tier

**Minting Process:**
1. Check payment status in database
2. Generate NFT metadata JSON
3. Upload metadata to Arweave/IPFS
4. Call Metaplex mint instruction
5. Update database with NFT mint address

**Response:**
- Success: Embed with NFT details, Explorer link, wallet address
- Error: "Payment not found" or "Already minted"

**Rate Limit:** 2 calls per minute

**Requirements:**
- Wallet must be connected
- Payment of 0.02 SOL must be confirmed
- User must not have existing badge

---

### `/check-payment`
**Description:** 💳 Verify if your verification payment was received

**Parameters:**
- `wallet` (STRING, optional) - Wallet address that sent payment

**Usage Example:**
```
/check-payment
/check-payment wallet: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

**Function:**
- Queries Solana blockchain for recent transactions
- Checks database for recorded payments
- Validates amount (must be exactly 0.02 SOL)
- Returns payment status and confirmation time

**Database Query:**
```sql
SELECT * FROM payments 
WHERE discord_id = ? OR wallet_address = ?
ORDER BY created_at DESC LIMIT 1
```

**Response:**
- Found: "✅ Payment confirmed" with transaction signature
- Pending: "⏳ Payment pending confirmation (1/2 confirmations)"
- Not Found: "❌ No payment found. Please send 0.02 SOL to: {address}"

**Rate Limit:** 5 calls per minute

---

## Balance & Status Commands

### `/balance`
**Description:** 💰 Check your wallet balance and verification status

**Parameters:** None

**Usage Example:**
```
/balance
```

**Function:**
- Retrieves registered wallet address from database
- Queries Solana RPC for current balance
- Checks verification status and NFT ownership
- Displays formatted balance in SOL

**SDK Call:**
```javascript
const balance = await sdk.getBalance(walletAddress);
const balanceSOL = balance / LAMPORTS_PER_SOL;
```

**Response Embed Fields:**
- 💰 Balance: X.XXX SOL (~$XX.XX USD)
- 🔗 Wallet: `7xKXt...gAsU` (with Explorer link)
- ✅ Verification Status: Verified / Pending / Not Verified
- 🎖️ NFT Badge: Owned / Not Owned
- 📊 Total Tips Sent: X tips (X.XX SOL)
- 📥 Total Tips Received: X tips (X.XX SOL)

**Rate Limit:** 10 calls per minute (default)

---

### `/status`
**Description:** 🔍 Check verification status and NFT badge details

**Parameters:** None

**Usage Example:**
```
/status
```

**Function:**
- Queries database for user verification record
- Fetches NFT metadata if badge is minted
- Retrieves payment and registration timestamps
- Shows verification progress steps

**Progress Steps:**
1. ✅ / ❌ Wallet Connected
2. ✅ / ❌ Payment Received (0.02 SOL)
3. ✅ / ❌ NFT Badge Minted
4. ✅ / ❌ Verification Complete

**Response:**
- Status: Verified / In Progress / Not Started
- Wallet: Connected address or "Not connected"
- Payment: Confirmed/Pending/Not received with timestamp
- NFT: Mint address with Solana Explorer link
- Next Step: Clear instruction on what to do next

**Rate Limit:** 10 calls per minute (default)

---

## Help & Information Commands

### `/help`
**Description:** 📚 View all commands and how to use the bot

**Parameters:** None

**Usage Example:**
```
/help
```

**Function:**
- Displays comprehensive user guide
- Shows 3-step verification process
- Lists all available commands with examples
- Provides pricing and network information

**Response Content:**
```
🎯 JustTheTip Verification Bot - Quick Start Guide

Getting Verified (3 Easy Steps):

Step 1: Register Your Wallet
/register-wallet
• Generates a secure verification link
• Opens your wallet for signature
• Proves you own the wallet

Step 2: Pay Verification Fee
• Send 0.02 SOL to the bot's payment address
• You'll receive this address after connecting
• Fee covers NFT minting + platform costs

Step 3: Get Your Badge
/get-badge
• Mints your verification NFT
• Automatically checks payment
• Badge appears in your wallet!

[Additional command categories and info...]
```

**Rate Limit:** 10 calls per minute (default)

---

### `/support`
**Description:** 🎫 Get help or report an issue

**Parameters:**
- `issue` (STRING, required) - Describe your problem or question

**Usage Example:**
```
/support issue: Payment not showing up after 5 minutes
```

**Function:**
- Creates support ticket in database
- Generates unique ticket ID
- Records user info, timestamp, and issue description
- Notifies support team (if webhook configured)

**Database Insert:**
```sql
INSERT INTO support_tickets (discord_id, username, issue, status, created_at)
VALUES (?, ?, ?, 'open', CURRENT_TIMESTAMP)
```

**Response:**
- Ticket ID: #12345
- Status: Open
- Message: "Support ticket created! We'll respond within 24 hours."
- Common Solutions: Links to help docs

**Auto-Reply Logic:**
- If issue contains "payment": Show payment FAQ
- If issue contains "wallet" or "connect": Show connection FAQ
- If issue contains "NFT" or "badge": Show minting FAQ

**Rate Limit:** 2 calls per 5 minutes

---

### `/pricing`
**Description:** 💵 View verification costs and payment information

**Parameters:** None

**Usage Example:**
```
/pricing
```

**Function:**
- Displays current pricing structure
- Explains fee breakdown
- Shows what's included
- Provides payment instructions

**Response Content:**
```
💵 Verification Pricing

Verification Fee: 0.02 SOL (~$3-4 USD)

What's Included:
✅ Permanent Discord verification
✅ NFT badge minted to your wallet  
✅ On-chain proof of verification
✅ Lifetime access (no recurring fees)

Fee Breakdown:
• 0.01 SOL - NFT minting cost
• 0.01 SOL - Platform fee

Why We Charge:
• Covers Solana network fees
• Prevents spam and abuse
• Sustainable bot operation
• You own the NFT forever!
```

**Rate Limit:** 10 calls per minute (default)

---

### `/info`
**Description:** ℹ️ Learn about JustTheTip verification system

**Parameters:** None

**Usage Example:**
```
/info
```

**Function:**
- Explains bot purpose and technology
- Describes verification process
- Highlights blockchain benefits
- Provides GitHub and social links

**Response Content:**
```
ℹ️ About JustTheTip Verification

What We Do:
JustTheTip provides Discord verification through Solana 
blockchain NFT badges. When you verify, you receive a 
permanent, transferable NFT that proves your Discord 
identity on-chain.

How It Works:
1. You connect your wallet and sign a message
2. You pay a small fee (0.02 SOL) 
3. We mint an NFT badge to your wallet
4. Your Discord gets verified status

Why Blockchain?
• Permanent: NFT can't be revoked
• Portable: Use across platforms
• Secure: Cryptographic proof
• Decentralized: No central authority

Built With:
• Solana blockchain
• Metaplex NFT standard
• Node.js + Discord.js
• SQLite database
```

**Rate Limit:** 10 calls per minute (default)

---

### `/stats`
**Description:** 📊 View bot statistics and network status

**Parameters:** None

**Usage Example:**
```
/stats
```

**Function:**
- Queries database for aggregate statistics
- Checks Solana network status
- Calculates verification metrics
- Shows real-time bot performance

**Database Queries:**
```sql
SELECT COUNT(*) FROM users WHERE verified = 1
SELECT COUNT(*) FROM payments WHERE status = 'confirmed'
SELECT AVG(amount) FROM tips
SELECT COUNT(*) FROM nft_badges
```

**Response Embed Fields:**
- 👥 Total Users: X,XXX
- ✅ Verified Users: X,XXX
- 🎖️ NFT Badges Minted: X,XXX
- 💰 Total Value Processed: XXX SOL
- 📊 Average Verification Time: XX minutes
- 🌐 Solana Network: Healthy / Degraded
- ⚡ RPC Response Time: XXX ms
- 🤖 Bot Uptime: X days X hours

**Rate Limit:** 10 calls per minute (default)

---

## Admin Commands

### `/admin-stats`
**Description:** 👑 View detailed analytics (Admin only)

**Parameters:** None

**Permission Required:** Administrator role in Discord

**Usage Example:**
```
/admin-stats
```

**Function:**
- Retrieves comprehensive database analytics
- Shows revenue and payment statistics
- Displays user growth metrics
- Monitors system health

**Admin Dashboard Data:**
- New Users (24h / 7d / 30d)
- Verification Rate (%)
- Payment Success Rate (%)
- Average Processing Time
- Failed Transactions
- Support Tickets (Open / Total)
- Revenue Breakdown (SOL / USD)
- Top Referrers
- Error Logs Summary

**Security:**
- Requires admin role verification
- Logs all admin command usage
- Ephemeral response (only visible to admin)

**Rate Limit:** 10 calls per minute (default)

---

### `/admin-user`
**Description:** 👑 Look up user verification details (Admin only)

**Parameters:**
- `user` (USER, required) - Discord user to look up

**Permission Required:** Administrator role in Discord

**Usage Example:**
```
/admin-user user: @username
```

**Function:**
- Retrieves all user data from database
- Shows verification history
- Displays payment records
- Lists associated wallets

**Retrieved Data:**
- Discord ID and username
- Registration date
- Verification status
- Connected wallet addresses
- Payment history (amounts, signatures, timestamps)
- NFT badges minted (mint addresses, dates)
- Support tickets created
- Tip history (sent/received)
- Last active timestamp

**Security:**
- Requires admin role verification
- Logs all user lookups with admin ID
- Redacts sensitive information in logs
- Ephemeral response

**Rate Limit:** 10 calls per minute (default)

---

## Core Bot Functions

### Wallet Management

#### `generateUserPDA(discordUserId)`
**Purpose:** Generate Program Derived Address for user

**Implementation:**
```javascript
function generateUserPDA(discordUserId) {
  return sdk.generateUserPDA(discordUserId);
}
```

**Returns:**
```javascript
{
  address: PublicKey,
  bump: number
}
```

**Use Cases:**
- Creating user account on Solana
- Querying user state from blockchain
- Generating deterministic addresses

---

#### `getSolanaBalance(address)`
**Purpose:** Retrieve Solana balance for address

**Implementation:**
```javascript
async function getSolanaBalance(address) {
  return await sdk.getBalance(address);
}
```

**Parameters:**
- `address` (string) - Base58 encoded Solana public key

**Returns:**
- Balance in lamports (1 SOL = 1,000,000,000 lamports)

**Error Handling:**
- Invalid address format: Throws `Error('Invalid address')`
- RPC connection error: Returns `null`, logs error

---

### Command Processing

#### `handleInteractionCreate(interaction)`
**Purpose:** Main command router for Discord interactions

**Flow:**
1. Validate interaction type (is command?)
2. Extract command name and options
3. Check user permissions
4. Apply rate limiting
5. Route to specific command handler
6. Execute command logic
7. Format and send response
8. Log command execution

**Rate Limiting Implementation:**
```javascript
const userRateLimits = new Map();

function checkRateLimit(userId, commandName) {
  const limit = rateLimits[commandName] || rateLimits.default;
  const userCommands = userRateLimits.get(userId) || [];
  const recentCommands = userCommands.filter(
    timestamp => Date.now() - timestamp < limit.window
  );
  
  if (recentCommands.length >= limit.max) {
    return false; // Rate limit exceeded
  }
  
  userRateLimits.set(userId, [...recentCommands, Date.now()]);
  return true; // Allow command
}
```

---

### Embed Builders

#### `createOnChainBalanceEmbed(walletAddress, balance)`
**Purpose:** Format blockchain balance data into Discord embed

**Implementation:**
```javascript
function createOnChainBalanceEmbed(walletAddress, balance) {
  const balanceSOL = balance / 1000000000;
  const explorerUrl = `https://explorer.solana.com/address/${walletAddress}`;
  
  return new EmbedBuilder()
    .setTitle('💰 Wallet Balance')
    .setDescription(`**Address:** \`${walletAddress}\``)
    .addFields(
      { name: 'Balance', value: `${balanceSOL.toFixed(4)} SOL`, inline: true },
      { name: 'Network', value: 'Solana Mainnet', inline: true }
    )
    .setColor(0x667eea)
    .setFooter({ text: 'Non-custodial • You control your keys' })
    .setURL(explorerUrl);
}
```

---

## API Endpoints

### Health & Diagnostics

#### `GET /api/health`
**Description:** Overall system health check

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T22:33:04.161Z",
  "solana": {
    "connected": true,
    "cluster": "mainnet-beta",
    "latency": 45
  },
  "database": {
    "connected": true,
    "type": "sqlite"
  },
  "coinbase": {
    "configured": true
  }
}
```

**Use Cases:**
- Uptime monitoring
- Health checks for load balancers
- Debugging connection issues

---

#### `GET /api/diag`
**Description:** Detailed diagnostics (sanitized)

**Response:**
```json
{
  "environment": "production",
  "nodeVersion": "v18.17.0",
  "solanaRPC": "https://api.mainnet-beta.solana.com",
  "mintAuthority": "7xKXt...AsU",
  "verifiedCollection": "9yVPq...3kL",
  "database": {
    "path": "./justthetip.db",
    "size": "2.4 MB",
    "tables": ["users", "payments", "nft_badges", "tips", "support_tickets"]
  }
}
```

**Security:**
- Redacts full private keys
- Shows only public information
- Rate limited to prevent reconnaissance

---

### Discord OAuth

#### `POST /api/discord/token`
**Description:** Exchange OAuth code for access token

**Request Body:**
```json
{
  "code": "OAuth_authorization_code"
}
```

**Response:**
```json
{
  "access_token": "access_token_string",
  "token_type": "Bearer",
  "expires_in": 604800,
  "refresh_token": "refresh_token_string",
  "scope": "identify email",
  "user": {
    "id": "123456789",
    "username": "username",
    "discriminator": "0001",
    "avatar": "avatar_hash"
  }
}
```

**Error Handling:**
- Invalid code: 400 Bad Request
- Expired code: 400 Bad Request
- Discord API error: 502 Bad Gateway

---

### Wallet & Verification

#### `POST /api/registerwallet/verify`
**Description:** Verify wallet signature

**Request Body:**
```json
{
  "discordId": "123456789",
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "signature": "3a8d9f7e1c2b...",
  "message": "Connect wallet to Discord: 123456789",
  "nonce": "uuid-v4-nonce"
}
```

**Verification Process:**
1. Validate nonce (not expired, not used)
2. Reconstruct expected message
3. Decode signature from base64
4. Verify signature with wallet public key
5. Mark nonce as used
6. Store wallet-Discord mapping

**Response:**
```json
{
  "success": true,
  "message": "Wallet verified successfully",
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "discordId": "123456789"
}
```

**Error Responses:**
- Invalid signature: 400 Bad Request
- Expired nonce: 400 Bad Request
- Already registered: 409 Conflict

---

#### `POST /api/mintBadge`
**Description:** Mint verification NFT badge

**Request Body:**
```json
{
  "discordId": "123456789",
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
}
```

**Minting Process:**
1. Verify payment received (0.02 SOL)
2. Check badge not already minted
3. Generate NFT metadata
4. Upload metadata to Arweave
5. Mint NFT via Metaplex
6. Update database with mint address

**Response:**
```json
{
  "success": true,
  "mintAddress": "9yVPqx3kL...",
  "metadataUri": "https://arweave.net/...",
  "explorerUrl": "https://explorer.solana.com/address/9yVPqx3kL...",
  "transactionSignature": "5aF3bC..."
}
```

**Error Responses:**
- Payment not found: 402 Payment Required
- Already minted: 409 Conflict
- Minting failed: 500 Internal Server Error

---

### Support System

#### `POST /api/ticket`
**Description:** Create support ticket

**Request Body:**
```json
{
  "discordId": "123456789",
  "username": "username#0001",
  "issue": "Payment not showing up after 5 minutes",
  "category": "payment"
}
```

**Response:**
```json
{
  "success": true,
  "ticketId": "12345",
  "status": "open",
  "estimatedResponse": "24 hours",
  "autoSuggestions": [
    "Try /check-payment command",
    "Wait 10 minutes for confirmations",
    "Check transaction on Explorer"
  ]
}
```

---

## SDK Functions

**File:** `contracts/sdk.js`

### Core Methods

#### `constructor(rpcUrl, programId)`
```javascript
const sdk = new JustTheTipSDK(
  'https://api.mainnet-beta.solana.com',
  'JTTProgram1111111111111111111111111111111111'
);
```

#### `generateUserPDA(discordUserId)`
**Returns:** `{ address: PublicKey, bump: number }`

#### `getBalance(address)`
**Returns:** `Promise<number>` (lamports)

#### `getUserAccount(userPDA)`
**Returns:** `Promise<UserAccount>`

#### `createTipInstruction(fromPDA, toPDA, amount)`
**Returns:** `TransactionInstruction`

#### `getTipHistory(userPDA, limit)`
**Returns:** `Promise<Tip[]>`

---

## Database Operations

**Database:** SQLite (`justthetip.db`)

### Tables

#### `users`
```sql
CREATE TABLE users (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  wallet_address TEXT UNIQUE,
  verified BOOLEAN DEFAULT 0,
  nft_mint_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `payments`
```sql
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount REAL NOT NULL,
  transaction_signature TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  FOREIGN KEY (discord_id) REFERENCES users(discord_id)
);
```

#### `nft_badges`
```sql
CREATE TABLE nft_badges (
  mint_address TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  metadata_uri TEXT NOT NULL,
  transaction_signature TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (discord_id) REFERENCES users(discord_id)
);
```

#### `support_tickets`
```sql
CREATE TABLE support_tickets (
  ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  username TEXT NOT NULL,
  issue TEXT NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  FOREIGN KEY (discord_id) REFERENCES users(discord_id)
);
```

---

## Security Features

### 1. Signature Verification
- Uses Ed25519 cryptographic signatures
- Verifies wallet ownership without private key exposure
- Nonce system prevents replay attacks

### 2. Rate Limiting
- Per-user, per-command limits
- Sliding window algorithm
- Prevents spam and abuse

### 3. Input Validation
- Wallet address format validation (base58)
- SQL injection prevention (parameterized queries)
- Discord snowflake ID validation

### 4. Non-Custodial Architecture
- Bot never holds private keys
- Users sign transactions in their own wallets
- All transactions verifiable on-chain

### 5. Secure Environment Variables
- Sensitive data in .env file
- Production uses Railway/Vercel secret management
- No secrets committed to repository

---

## Rate Limiting

### Configuration

```javascript
const rateLimits = {
  'register-wallet': { max: 5, window: 900000 },    // 5 per 15 min
  'connect-wallet': { max: 3, window: 60000 },      // 3 per 1 min
  'get-badge': { max: 2, window: 60000 },           // 2 per 1 min
  'check-payment': { max: 5, window: 60000 },       // 5 per 1 min
  'support': { max: 2, window: 300000 },            // 2 per 5 min
  default: { max: 10, window: 60000 }               // 10 per 1 min
};
```

### Implementation

**Algorithm:** Sliding Window

```javascript
class RateLimiter {
  constructor() {
    this.requests = new Map(); // userId -> [timestamps]
  }
  
  check(userId, commandName) {
    const limit = rateLimits[commandName] || rateLimits.default;
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Remove expired requests
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < limit.window
    );
    
    if (validRequests.length >= limit.max) {
      const oldestRequest = Math.min(...validRequests);
      const waitTime = limit.window - (now - oldestRequest);
      return { allowed: false, waitTime };
    }
    
    // Add new request
    this.requests.set(userId, [...validRequests, now]);
    return { allowed: true };
  }
}
```

### Rate Limit Response

When rate limit exceeded:
```javascript
const embed = new EmbedBuilder()
  .setTitle('⏱️ Rate Limit Exceeded')
  .setDescription(`Please wait ${Math.ceil(waitTime/1000)} seconds before using this command again.`)
  .setColor(0xff0000);

await interaction.reply({ embeds: [embed], ephemeral: true });
```

---

## Error Handling

### Standard Error Response Format

```javascript
const errorEmbed = new EmbedBuilder()
  .setTitle('❌ Error')
  .setDescription(errorMessage)
  .setColor(0xff0000)
  .setFooter({ text: 'Use /support if this persists' });
```

### Common Error Types

1. **Invalid Input**
   - Message: "Invalid wallet address format"
   - Action: Show correct format example

2. **Not Found**
   - Message: "Wallet not registered"
   - Action: Suggest `/register-wallet`

3. **Already Exists**
   - Message: "Wallet already registered"
   - Action: Suggest `/status` to check

4. **Payment Required**
   - Message: "Payment not found or insufficient"
   - Action: Show payment address and amount

5. **RPC Error**
   - Message: "Solana network error, please try again"
   - Action: Log error, retry automatically

---

**Document End**

For updates to this documentation, submit PR to:  
https://github.com/jmenichole/Justthetip
