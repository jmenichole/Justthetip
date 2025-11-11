# JustTheTip Codebase Index & Summary

**Generated**: 2025-11-11
**Repository**: https://github.com/jmenichole/Justthetip
**Version**: 1.0.0
**License**: Custom MIT-based

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Directory Structure](#directory-structure)
5. [Key Features](#key-features)
6. [Branding & Design](#branding--design)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Discord Commands](#discord-commands)
10. [Smart Contracts](#smart-contracts)
11. [Development Workflow](#development-workflow)
12. [Deployment](#deployment)

---

## Project Overview

**JustTheTip** is a non-custodial Solana tipping bot for Discord that enables trustless cryptocurrency transactions without users surrendering their private keys.

### Core Principles
- **Non-Custodial**: Users maintain full control of their wallets
- **On-Chain Verification**: All transactions recorded on Solana blockchain
- **Signature-Based Auth**: Ed25519 cryptographic wallet registration
- **Multi-Token Support**: SOL, USDC, BONK, USDT
- **NFT Trust Badges**: Metaplex-based verification system

---

## Architecture

### High-Level Design

```
┌─────────────────┐
│  Discord Users  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│   Discord Bot (Node.js) │
│  bot_smart_contract.js  │
└────────┬────────────────┘
         │
         ├──────────────────────┐
         │                      │
         ▼                      ▼
┌──────────────────┐   ┌────────────────┐
│   REST API       │   │ Solana Network │
│  Express Server  │   │ Smart Contracts│
└────────┬─────────┘   └────────┬───────┘
         │                      │
         ▼                      ▼
┌──────────────────┐   ┌────────────────┐
│    Database      │   │   SPL Tokens   │
│ SQLite/Postgres  │   │  (USDC, BONK)  │
└──────────────────┘   └────────────────┘
```

### Component Interaction

1. **User Registration Flow**:
   - User runs `/register-wallet` command
   - Bot generates unique nonce (10-min expiration)
   - User signs message with wallet
   - Backend verifies Ed25519 signature
   - Wallet address stored in database

2. **Tipping Flow**:
   - User runs `/tip @user 10 SOL`
   - Bot validates wallet registration
   - Smart contract instruction created
   - User signs transaction
   - Transaction submitted to Solana
   - Balance updated on-chain via PDA

---

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js v5.1.0
- **Discord**: Discord.js v14.14.1
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Logging**: Winston v3.11.0
- **Security**: Helmet v7.1.0, express-rate-limit

### Blockchain
- **Blockchain**: Solana (Devnet/Mainnet)
- **Framework**: Anchor (Rust)
- **SDK**: @solana/web3.js v1.98.4
- **Tokens**: @solana/spl-token v0.1.8
- **NFTs**: @metaplex-foundation/js v0.20.1
- **Crypto**: TweetNaCl.js (Ed25519), bs58 (Base58)

### Payments
- **Fiat**: Coinbase Commerce API
- **Micropayments**: x402 Protocol (USDC)

### Frontend
- **Framework**: React 19.1.1
- **Styling**: TailwindCSS 4.1.13
- **Build**: Vite 7.1.4
- **Wallet Adapters**: WalletConnect, Phantom, Solflare

### DevOps
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Deployment**: Railway (bot), Vercel (API), GitHub Pages (frontend)
- **Process Manager**: PM2 v6.0.10

---

## Directory Structure

```
/home/user/Justthetip/
├── api/                          # REST API server
│   ├── server.js                # Main Express server (1,592 lines)
│   ├── adminRoutes.js          # Admin dashboard endpoints
│   └── public/                  # Static frontend assets
│       ├── sign.html           # Wallet signature form
│       └── sign-walletconnect.js
│
├── bot_smart_contract.js         # Main Discord bot (704 lines)
│
├── contracts/                    # Solana SDK
│   ├── sdk.js                  # JustTheTipSDK (265 lines)
│   └── example.js              # SDK usage demo
│
├── justthetip-contracts/         # Anchor workspace
│   ├── programs/justthetip/     # Solana smart contracts
│   │   └── src/
│   │       ├── lib.rs          # Main program (600+ lines)
│   │       └── trust_badge.rs  # NFT badge system
│   ├── tests/                  # Anchor integration tests
│   └── scripts/                # Build & deployment scripts
│
├── db/                          # Database layer
│   ├── db.js                   # SQLite implementation
│   ├── database.js             # Database wrapper
│   ├── schema.sql              # PostgreSQL schema
│   └── README.md               # Database documentation
│
├── src/                         # Shared utilities
│   ├── commands/               # Discord command handlers
│   │   ├── tipCommand.js
│   │   ├── leaderboardCommand.js
│   │   ├── airdropCommand.js
│   │   ├── swapCommand.js
│   │   └── secureCommands.js
│   ├── utils/                  # Utility modules (27 files)
│   │   ├── embedBuilders.js   # Discord embed formatters
│   │   ├── validation.js       # Input validation
│   │   ├── solanaDevTools.js  # RPC utilities
│   │   ├── coinbaseClient.js  # Fiat payments
│   │   ├── x402PaymentHandler.js # Micropayments
│   │   ├── tokenRegistry.js   # Token metadata
│   │   ├── priceService.js    # CoinGecko price feeds
│   │   └── logger.js          # Winston logging
│   ├── security/              # Security modules
│   │   ├── walletConnection.js
│   │   ├── multiSig.js
│   │   └── withdrawalQueue.js
│   └── jobs/
│       └── pendingTipsProcessor.js
│
├── docs/                        # Documentation & frontend
│   ├── landing.html           # Main landing page
│   ├── landing-styles.css     # Branding CSS
│   ├── sign.html              # Signature page
│   ├── privacy.html
│   ├── terms.html
│   └── support.html
│
├── .github/workflows/          # CI/CD pipelines
│   ├── ci.yml                 # Lint & test
│   ├── railway-deploy.yml     # Railway deployment
│   └── pages.yml              # GitHub Pages
│
├── scripts/                    # Utility scripts
│   ├── verify-env.js          # Environment validation
│   ├── verify-railway-secrets.js
│   └── start-bot-railway.js
│
├── package.json              # Dependencies & scripts
├── .env.example              # Environment template
├── Dockerfile                # Container config
├── Procfile                  # Railway process file
├── vercel.json               # Vercel deployment config
└── IMPROVED_SLASH_COMMANDS.js # Discord command definitions
```

---

## Key Features

### 1. Non-Custodial Wallet System
- **Signature-based registration**: Users sign message with wallet
- **Ed25519 verification**: TweetNaCl.js cryptographic validation
- **Nonce system**: 10-minute expiration, single-use
- **Rate limiting**: 5 requests per 15 minutes per IP

### 2. Multi-Token Tipping
| Token | Mint Address | Decimals | CoinGecko ID |
|-------|--------------|----------|--------------|
| SOL | So11111111111111111111111111111111111111112 | 9 | solana |
| USDC | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v | 6 | usd-coin |
| BONK | DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263 | 5 | bonk |
| USDT | Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB | 6 | tether |

### 3. Smart Contract Features
- **User PDAs**: Per-user on-chain accounts
- **Tipping**: `tip_sol()`, `tip_spl_token()` instructions
- **Airdrops**: Create and claim token distributions
- **Statistics**: On-chain tracking of sent/received amounts

### 4. NFT Verification Badges
- **Metaplex integration**: Mint trust badges as NFTs
- **Reputation scoring**: Track user trustworthiness
- **On-chain verification**: Immutable badge ownership

### 5. Payment Integrations
- **Coinbase Commerce**: Fiat on-ramp (USD, EUR, GBP, etc.)
- **x402 Protocol**: USDC micropayments for premium features

### 6. Developer Tools
- **SDK**: Reusable Solana interaction functions
- **Admin dashboard**: Analytics and user management
- **Transaction logging**: Complete audit trail
- **Health checks**: RPC status, system diagnostics

---

## Branding & Design

### Color Palette

```css
/* Primary Gradient (Purple) */
--primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Secondary Gradient (Pink/Red) */
--secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);

/* Accent Gradient (Cyan) */
--accent-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);

/* Background */
--dark-bg: #0a0a0f;

/* Semantic Colors */
--success: #10b981;  /* Green */
--warning: #f59e0b;  /* Amber */
--error: #ef4444;    /* Red */
--info: #3b82f6;     /* Blue */
```

### Typography
- **Font Family**: Inter (with system fallbacks)
- **Font Weights**: 300, 400, 600, 700, 900

### UI Patterns
- **Glassmorphism**: Cards with backdrop blur
- **Gradient buttons**: Smooth hover transitions
- **Responsive design**: Mobile-first approach

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- Discord user ID
  wallet TEXT,                      -- Solana wallet address
  balance REAL DEFAULT 0,           -- Legacy balance field
  reputation_score INTEGER DEFAULT 0,
  trust_badge_mint TEXT             -- NFT badge mint address
);
```

### Tips Table
```sql
CREATE TABLE tips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT NOT NULL,
  receiver TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,          -- SOL, USDC, BONK, USDT
  signature TEXT,                  -- Solana transaction signature
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Wallet Registrations Table
```sql
CREATE TABLE wallet_registrations (
  discord_id TEXT PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  signature TEXT NOT NULL,         -- Ed25519 signature
  message TEXT NOT NULL,           -- Signed message
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Registration Nonces Table
```sql
CREATE TABLE registration_nonces (
  nonce TEXT PRIMARY KEY,          -- UUID v4
  discord_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,   -- 10-minute TTL
  used BOOLEAN DEFAULT FALSE
);
```

### Trust Badges Table
```sql
CREATE TABLE trust_badges (
  discord_id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  mint_address TEXT,               -- NFT mint address
  reputation_score INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Health & Diagnostics
- `GET /api/health` - System health and Solana connection status
- `GET /api/diag` - Sanitized diagnostics

### Wallet & Verification
- `POST /api/verifyWallet` - Verify wallet ownership via signature
- `POST /api/registerwallet/verify` - Register wallet with nonce
- `GET /api/registerwallet/status/:discordUserId` - Registration status
- `GET /api/verification/:discordId` - Verification status

### NFT & Badges
- `POST /api/mintBadge` - Mint verification NFT
- `GET /api/verification/:discordId` - Badge details

### Solana Developer Tools
- `GET /api/solana/devtools/status` - RPC connection status
- `GET /api/solana/devtools/program/:programId/accounts` - Program accounts
- `POST /api/solana/devtools/airdrop` - Request testnet airdrop
- `GET /api/solana/devtools/nft/:mintAddress` - NFT metadata

### Payments
- `POST /api/payments/coinbase/charges` - Create charge
- `GET /api/payments/coinbase/charges/:chargeId` - Charge status
- `POST /api/payments/coinbase/webhook` - Coinbase webhooks

### x402 Premium Features
- `GET /api/x402/premium/analytics` - Premium analytics (x402 protected)
- `POST /api/x402/premium/mint-priority` - Priority minting (x402 protected)
- `GET /api/x402/payment/:signature` - Verify payment

### Admin
- `GET /api/admin/stats` - System statistics (requires admin secret)
- `GET /api/admin/users` - User management

---

## Discord Commands

### User Commands
- `/register-wallet` - Register Solana wallet with signature
- `/balance` - Check wallet balance and verification status
- `/tip @user <amount> <token>` - Send tip to user
- `/verify` - Complete verification and get NFT badge
- `/status` - Check verification status
- `/help` - View all commands
- `/support` - Get help or report issue

### Admin Commands
- `/admin-stats` - View detailed analytics
- `/admin-user <discord_id>` - Look up user details

---

## Smart Contracts

### Program ID (Devnet)
```
Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
```

### Core Instructions

#### initialize_user
```rust
pub fn initialize_user(ctx: Context<InitializeUser>, discord_id: String) -> Result<()>
```
- Creates user's PDA account
- Seeds: `["user", discord_id.as_bytes()]`

#### tip_sol
```rust
pub fn tip_sol(ctx: Context<TipSol>, amount: u64) -> Result<()>
```
- Transfer native SOL between users
- Updates on-chain statistics

#### tip_spl_token
```rust
pub fn tip_spl_token(ctx: Context<TipSplToken>, amount: u64) -> Result<()>
```
- Transfer SPL tokens (USDC, BONK, etc.)
- Uses associated token accounts

#### create_airdrop
```rust
pub fn create_airdrop(ctx: Context<CreateAirdrop>, total_amount: u64, recipients_count: u8) -> Result<()>
```
- Creates airdrop PDA
- Calculates per-recipient amount

#### claim_airdrop
```rust
pub fn claim_airdrop(ctx: Context<ClaimAirdrop>) -> Result<()>
```
- Allows recipients to claim share

### Account Structures

#### UserAccount
```rust
pub struct UserAccount {
    pub authority: Pubkey,
    pub discord_id: String,
    pub total_sent: u64,
    pub total_received: u64,
    pub tip_count: u64,
    pub bump: u8,
}
```

---

## Development Workflow

### Setup
```bash
git clone https://github.com/jmenichole/Justthetip.git
cd Justthetip
npm install
cp .env.example .env
# Edit .env with your values
```

### Environment Verification
```bash
npm run verify-env -- --smart-contract
```

### Start Bot
```bash
npm run start:bot
```

### Start API Server
```bash
npm start
```

### Build Smart Contracts
```bash
npm run build:contracts
```

### Run Tests
```bash
npm test
npm run test:contracts
```

### Linting
```bash
npm run lint
```

### Deploy Contracts
```bash
# Devnet
npm run deploy:devnet

# Mainnet
npm run deploy:mainnet
```

---

## Deployment

### Discord Bot (Railway)
1. Push to GitHub
2. Connect Railway to repository
3. Set environment variables in Railway dashboard
4. Auto-deploys on git push to main

### API Server (Vercel)
1. Connect Vercel to GitHub repository
2. Configure environment variables
3. Auto-deploys via `vercel.json` configuration

### Frontend (GitHub Pages)
1. Push to main branch
2. GitHub Actions workflow deploys to Pages
3. Accessible at: https://jmenichole.github.io/Justthetip/

### Smart Contracts (Solana)
```bash
# Build
anchor build

# Deploy to Devnet
anchor deploy --provider.cluster devnet

# Deploy to Mainnet
anchor deploy --provider.cluster mainnet
```

---

## Environment Variables

### Required
```env
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_client_id
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Optional (Production)
```env
DATABASE_URL=postgresql://user:pass@host/db
MINT_AUTHORITY_KEYPAIR=base58_private_key
COINBASE_COMMERCE_API_KEY=your_api_key
SUPER_ADMIN_SECRET=your_admin_password
```

See `.env.example` for complete list with descriptions.

---

## Statistics

- **Total Lines of Code**: 5,000+
- **JavaScript Files**: 27+
- **Rust Programs**: 2
- **API Endpoints**: 23+
- **Discord Commands**: 13
- **Supported Tokens**: 4
- **Database Tables**: 8-10

---

## Key Innovations

1. **Non-Custodial Architecture** - Users never surrender private keys
2. **Smart Contract Integration** - On-chain state via PDAs
3. **Signature-Based Auth** - Ed25519 cryptographic registration
4. **Multi-Token Support** - Seamless tipping in 4+ tokens
5. **x402 Protocol** - Monetize APIs with USDC micropayments
6. **NFT Trust Badges** - Metaplex-based verification
7. **Trustless Design** - No intermediary custody

---

## License

Custom MIT-based License - See LICENSE file for details

---

## Contact & Support

- **GitHub**: https://github.com/jmenichole/Justthetip
- **Support**: Use `/support` command in Discord
- **Documentation**: https://jmenichole.github.io/Justthetip/

---

**Last Updated**: 2025-11-11
**Maintainer**: jmenichole
