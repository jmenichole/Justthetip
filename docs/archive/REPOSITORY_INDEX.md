# JustTheTip Repository Index & Summary

**Version:** 1.0.0
**Last Updated:** 2025-11-11
**Branch:** claude/justhetip-kick-bot-integration-011CV1NoFUHu8RviMqLTKqQK

---

## 📋 Executive Summary

**JustTheTip** is a production-ready, non-custodial Solana-based Discord bot enabling secure cryptocurrency tipping, NFT verification badges, and community payments. The bot implements a trustless architecture where users sign once with their wallet and can tip forever without custody transfer.

### Core Technology Stack
- **Platform:** Node.js 18+ / JavaScript
- **Primary Blockchain:** Solana (mainnet-beta)
- **Smart Contracts:** Anchor Framework (Rust)
- **Discord Integration:** discord.js v14
- **Web Framework:** Express.js v5
- **Database:** PostgreSQL/Supabase (production), SQLite (development)
- **Wallet Integration:** WalletConnect, Phantom, Solflare

---

## 📁 Repository Structure

```
/home/user/Justthetip/
├── api/                              # REST API Server
│   ├── server.js                     # Main Express server (1,592 LOC)
│   ├── adminRoutes.js                # Admin dashboard endpoints
│   └── public/                       # Frontend assets
│       ├── sign.html                 # Wallet registration UI
│       └── sign.js                   # Wallet signature logic
│
├── src/                              # Source Code Organization
│   ├── commands/                     # Discord slash command handlers
│   │   ├── tipCommand.js             # /tip implementation
│   │   ├── airdropCommand.js         # /airdrop implementation
│   │   ├── swapCommand.js            # /swap implementation
│   │   └── ...                       # Other command handlers
│   ├── utils/                        # Reusable utility modules
│   │   ├── logger.js                 # Winston logging
│   │   ├── solanaDevTools.js         # RPC health checks
│   │   ├── jupiterSwap.js            # Token swap integration
│   │   ├── coinbaseClient.js         # Coinbase Commerce API
│   │   ├── embedBuilders.js          # Discord embed templates
│   │   ├── balanceChecker.js         # Multi-token balance queries
│   │   ├── priceService.js           # Real-time price data
│   │   ├── tokenRegistry.js          # Token metadata registry
│   │   ├── rateLimiter.js            # Request rate limiting
│   │   ├── trustBadge.js             # NFT verification badges
│   │   ├── validation.js             # Input/output validation
│   │   ├── transactionLogger.js      # Transaction audit trail
│   │   ├── x402Client.js             # x402 payment protocol
│   │   └── ...
│   ├── security/                     # Security utilities
│   │   ├── walletConnection.js       # Secure wallet linking
│   │   ├── multiSig.js               # Multi-signature support
│   │   └── withdrawalQueue.js        # Secure withdrawal processing
│   ├── validators/                   # Input validation modules
│   ├── jobs/                         # Background jobs
│   │   └── pendingTipsProcessor.js   # Async transaction processor
│   └── components/                   # UI components
│
├── contracts/                        # Solana SDK & Integration
│   ├── sdk.js                        # Main SDK (265 LOC)
│   └── example.js                    # SDK usage examples
│
├── justthetip-contracts/             # Anchor Workspace
│   ├── programs/justthetip/          # Main Solana program
│   ├── tests/                        # Contract integration tests
│   └── Anchor.toml                   # Anchor configuration
│
├── db/                               # Database Layer
│   ├── database.js                   # Database operations
│   ├── db.js                         # PostgreSQL integration
│   ├── schema.sql                    # Database schema
│   ├── SCHEMA_DIAGRAM.md             # Visual schema documentation
│   └── SUPABASE_SETUP.md             # Supabase configuration
│
├── docs/                             # Documentation (50+ files)
│   ├── WALLET_REGISTRATION_GUIDE.md
│   ├── SOLANA_PROGRAM_GUIDE.md
│   ├── NON_CUSTODIAL_ARCHITECTURE.md
│   └── ...
│
├── scripts/                          # Build & Deployment Scripts
│   ├── verify-env.js                 # Environment validation
│   ├── verify-railway-secrets.js     # Railway deployment check
│   └── start-bot-railway.js          # Railway bot startup
│
├── tests/                            # Unit Tests
│
├── security/                         # Security Guidelines
│   └── feeWallet.json                # Fee wallet configuration
│
├── chains/                           # Multi-chain Helpers
│
├── bot_smart_contract.js             # Main Discord Bot (704 LOC)
├── register-commands.js              # Command registration utility
│
├── .env.example                      # Environment variable template (246 lines)
├── package.json                      # Dependencies & scripts
├── jest.config.js                    # Jest testing configuration
├── .eslintrc.json                    # ESLint configuration
├── .prettierrc.json                  # Prettier configuration
├── Dockerfile                        # Docker containerization
├── railway.json                      # Railway deployment config
├── vercel.json                       # Vercel API deployment config
└── README.md                         # Main project documentation
```

---

## 🎯 Current Features

### Discord Bot Commands (13+ Commands)

#### Wallet & Balance
- `/register-wallet` - Register Solana wallet with signature verification
- `/balance` - Check wallet balance and verification status
- `/status` - Check verification status and NFT badge details
- `/verify` - Complete Discord verification and get NFT badge
- `/connect-wallet` - Link wallet with signature validation

#### Token & Transactions
- `/tip` - Send tips with SOL, USDC, BONK support
- `/airdrop` - Create dollar-based airdrops
- `/swap` - Token swaps via Jupiter Aggregator
- `/tiplog` - View transaction history
- `/leaderboard` - View top tippers and recipients

#### Information & Support
- `/help` - View command documentation
- `/support` - Report issues or get assistance
- `/info` - Learn about verification system
- `/pricing` - View verification costs
- `/stats` - View bot statistics
- `/admin-stats` - Admin analytics (admin-only)

### REST API Endpoints

#### Public Endpoints
- `GET /api/health` - System health & Solana connection status
- `GET /api/diag` - Diagnostic information
- `POST /api/registerwallet/verify` - Wallet signature verification
- `GET /api/registerwallet/status/:discordUserId` - Verification status
- `GET /api/verification/:discordId` - Verification lookup
- `POST /api/mintBadge` - NFT badge minting
- `POST /api/discord/token` - OAuth token exchange

#### Solana Developer Tools
- `GET /api/solana/devtools/status` - Solana RPC health
- `GET /api/solana/devtools/program/:programId/accounts` - Program account inspection
- `POST /api/solana/devtools/airdrop` - Devnet SOL airdrops
- `GET /api/solana/devtools/nft/:mintAddress` - NFT metadata retrieval

#### Payment Integration
- `POST /api/payments/coinbase/*` - Coinbase Commerce integration
- `POST /api/x402/premium/*` - x402 Payment Protocol for premium features

#### Admin Dashboard
- `GET /api/admin/stats` - Overall bot statistics
- `GET /api/admin/top-tokens` - Weekly token analytics
- `GET /api/admin/recent-activity` - Transaction history
- `GET /api/admin/user/:userId` - User details
- `GET /api/admin/daily-stats` - Daily analytics

#### Support System
- `POST /api/tickets` - Support ticket creation

### Smart Contract Features

- **Non-custodial architecture:** Users sign once with wallet, bot never holds private keys
- **Program Derived Addresses (PDAs):** Generated per Discord user for on-chain state
- **Multi-token support:** SOL, USDC, BONK, USDT (coming soon)
- **On-chain verification:** Cryptographic signature validation for wallet ownership
- **NFT Badge System:** Verification badges minted as Solana NFTs

### Security Features

- **Rate limiting:** Multi-layer protection (express-rate-limit, rate-limiter-flexible)
- **Input validation:** Comprehensive validation for all user inputs
- **Helmet security headers:** HTTP security headers
- **CORS configuration:** Secure cross-origin resource sharing
- **Environment validation:** Mandatory environment variable checks
- **Signature verification:** Base58/Base64 signature validation
- **Non-custodial design:** Keys never leave user wallets

---

## 🔧 Configuration

### Required Environment Variables

```bash
# Discord Configuration
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_CLUSTER=mainnet-beta

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Application
FRONTEND_URL=https://yourapp.com
NODE_ENV=production
```

### Optional but Recommended

```bash
# Optimized Solana RPC
HELIUS_API_KEY=your_helius_key

# NFT Minting
MINT_AUTHORITY_KEYPAIR=base58_encoded_keypair

# Payments
COINBASE_COMMERCE_API_KEY=your_api_key
X402_TREASURY_WALLET=treasury_address
X402_PAYER_SECRET=base58_encoded_keypair

# Admin Access
SUPER_ADMIN_USER_IDS=comma_separated_ids
```

---

## 📚 Documentation Index

### Getting Started
- `README.md` - Project overview and quick start
- `DEVELOPER_GUIDE.md` - Architecture and code patterns
- `CONTRIBUTING.md` - Developer onboarding
- `DOCUMENTATION_INDEX.md` - Complete guide navigation

### Deployment
- `RAILWAY_DEPLOYMENT_INSTRUCTIONS.md` - Railway setup
- `RAILWAY_BOT_CHECKLIST.md` - Deployment verification
- `RAILWAY_QUICK_REFERENCE.md` - Quick deployment reference
- `VERCEL_DEPLOYMENT_GUIDE.md` - API server deployment
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment verification

### Features
- `WALLET_REGISTRATION_GUIDE.md` - Wallet registration flow
- `SOLANA_PROGRAM_GUIDE.md` - Smart contract architecture
- `MULTI_TOKEN_SUPPORT.md` - Token integration guide
- `NON_CUSTODIAL_ARCHITECTURE.md` - Technical architecture
- `X402_README.md` - x402 protocol integration

### Database
- `db/SCHEMA_DIAGRAM.md` - Visual schema representation
- `db/SUPABASE_SETUP.md` - Supabase configuration
- `POSTGRESQL_MIGRATION.md` - Migration from MongoDB

### Operations
- `FIX_SUMMARY.md` - Common issues and fixes
- `CONFIG_TEST_SUMMARY.md` - Configuration testing
- `RAILWAY_ERROR_LOGGING.md` - Troubleshooting guide

---

## 🎨 Branding & Style Guidelines

### Code Style (Enforced)

```json
// Prettier Configuration
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### ESLint Rules
- Security plugin enabled
- Unused variables warning
- Prefer const over var
- No console restrictions (allowed)

### Visual Branding
- **Primary Gradient:** `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **Secondary Gradient:** `linear-gradient(135deg, #f093fb 0%, #f5576c 100%)`
- **Accent Gradient:** `linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)`
- **Dark Background:** `#0a0a0f`
- **Card Background:** `rgba(255, 255, 255, 0.05)`
- **Success Color:** `#10b981`
- **Error Color:** `#ef4444`
- **Info Color:** `#3b82f6`

### UI/UX Standards
- Discord embeds with consistent formatting
- Interactive buttons for user actions
- Mobile-responsive design
- Professional error messages
- Emoji indicators for visual clarity

---

## 🧪 Testing & Quality Assurance

### Available Scripts

```bash
# Testing
npm test                  # Run Jest tests
npm run test:contracts    # Anchor contract tests

# Code Quality
npm run lint             # ESLint check
npm run audit            # Security audit

# Development
npm run start            # Start API server
npm run start:bot        # Start Discord bot
npm run demo:sdk         # Run SDK examples

# Build & Deploy
npm run build:contracts  # Build Solana programs
npm run deploy:devnet    # Deploy to Solana devnet
npm run deploy:mainnet   # Deploy to Solana mainnet

# Environment
npm run verify-env       # Validate environment variables
```

---

## 🚀 Deployment Platforms

### Supported Platforms
1. **Railway** - Recommended for Discord bot (pre-configured)
2. **Vercel** - API server (serverless functions)
3. **Docker** - Universal containerization
4. **Solana Clusters** - Devnet, Testnet, Mainnet-beta

### Database Hosting
- **Supabase** - PostgreSQL managed (recommended)
- **Railway** - PostgreSQL managed
- **Local SQLite** - Development only

---

## 📊 Architecture Patterns

### Key Design Principles

1. **Non-Custodial Design**
   - User wallets never touch bot servers
   - Cryptographic signature verification
   - 100% user control over funds

2. **Program Derived Addresses (PDAs)**
   - Per-user on-chain accounts
   - No custody transfer required
   - Deterministic address generation

3. **Rate Limiting**
   - Multi-layer protection
   - Per-endpoint configuration
   - Redis-backed (optional)

4. **Error Handling**
   - Graceful fallbacks
   - Detailed user feedback
   - Comprehensive logging

5. **Database Abstraction**
   - Support for SQLite (demo) and PostgreSQL (production)
   - ACID compliance for financial operations
   - Proper decimal handling (NUMERIC(20, 8))

6. **API Security**
   - Helmet HTTP headers
   - CORS configuration
   - Signature verification
   - Rate limiting

7. **Modular Architecture**
   - Separated concerns (commands, utils, security, jobs)
   - Dependency injection for testing
   - Clear module boundaries

---

## 📦 Dependencies Overview

### Core Dependencies
- `discord.js` v14.14.1 - Discord bot framework
- `express` v5.1.0 - Web server
- `@solana/web3.js` v1.98.4 - Solana blockchain interaction
- `@solana/spl-token` v0.1.8 - SPL token operations
- `@metaplex-foundation/js` v0.20.1 - NFT minting

### Wallet Integration
- `@walletconnect/modal` v2.7.0 - Universal wallet modal
- `@solana/wallet-adapter-wallets` v0.19.32 - Wallet adapters
- `@solana/wallet-adapter-base` v0.9.23 - Base adapter

### Database & Security
- `better-sqlite3` v12.4.1 - SQLite database
- `helmet` v7.1.0 - Security headers
- `cors` v2.8.5 - CORS middleware
- `express-rate-limit` v7.1.5 - Rate limiting
- `rate-limiter-flexible` v4.0.0 - Advanced rate limiting

### Blockchain Support
- `ethers` v6.15.0 - Ethereum support
- `tronweb` v6.0.2 - Tron support
- `xrpl` v4.4.1 - XRP Ledger support
- `bitcoinjs-lib` v6.1.7 - Bitcoin support

### Development Tools
- `jest` v29.7.0 - Testing framework
- `eslint` v8.57.1 - Code linting
- `prettier` v3.1.0 - Code formatting
- `typescript` v5.9.2 - Type checking
- `vite` v7.1.4 - Frontend bundling

---

## 🔒 Security Best Practices

### Implemented Security Measures

1. **Non-custodial Architecture**
   - Private keys never touch bot infrastructure
   - Users maintain full custody of funds

2. **Rate Limiting**
   - Per-endpoint rate limits
   - IP-based and user-based limits
   - Configurable thresholds

3. **Input Validation**
   - Comprehensive validation for all inputs
   - Type checking and sanitization
   - SQL injection prevention

4. **Environment Variable Security**
   - Mandatory validation on startup
   - No hardcoded secrets
   - dotenv-safe integration

5. **Signature Verification**
   - Cryptographic validation of wallet ownership
   - Support for multiple signature formats
   - Time-limited registration links

6. **HTTPS Enforcement**
   - All external communications over HTTPS
   - Secure cookie handling
   - HSTS headers

7. **Error Handling**
   - No sensitive data in error messages
   - Comprehensive logging for debugging
   - User-friendly error messages

---

## 📈 Recent Development Activity

### Latest Commits (Last 10)

```
43547a5 - Merge #80: Setup verification steps (Nov 10, 2025)
3673f2b - Fix linting errors and remove duplicate handler
5a2cd9b - Add /register-wallet command for signature verification
dab77a0 - Initial plan
7ab81d2 - Merge #79: Fix slash command issues
fcb09df - Fix linting warning for unused signature variable
b8d9687 - Update slash commands to new user-friendly structure
3df0338 - Initial plan
05950fb - Merge #78: WalletConnect integration
78ff827 - Add security documentation for HTML usage
```

### Recent Features Implemented

1. **Wallet Registration System** (Nov 10, 2025)
   - `/register-wallet` command
   - Frontend signature flow (sign.html + sign.js)
   - Backend verification endpoint with rate limiting
   - Persistent wallet-to-Discord mapping

2. **WalletConnect Integration** (Nov 8, 2025)
   - Universal wallet selection modal
   - Mobile & desktop wallet support
   - Enhanced UX for non-custodial signing

3. **PostgreSQL Migration**
   - Migrated from MongoDB to PostgreSQL
   - ACID compliance for financial operations
   - Supabase integration for production

---

## 🎯 Upcoming Features (Planned)

### Currently in Development

- **Multi-token Tipping:** Full support for USDC, BONK, USDT
- **x402 Hackathon Enhancements:** Premium API features with micropayments
- **Enhanced NFT Badges:** Tiered verification system

---

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- Follow Prettier formatting rules
- Pass ESLint checks
- Write unit tests for new features
- Update documentation
- Add JSDoc comments for public APIs

### Testing Requirements

- Unit tests for all business logic
- Integration tests for API endpoints
- Contract tests for Solana programs
- Minimum 80% code coverage (goal)

---

## 📞 Support & Resources

### Documentation
- [GitHub Repository](https://github.com/jmenichole/Justthetip)
- [Project Website](https://jmenichole.github.io/Justthetip)

### Commands
- `/help` - View bot help documentation
- `/support` - Report issues or get assistance

### Development
- Issues: GitHub Issues
- Discussions: GitHub Discussions
- Pull Requests: Welcome!

---

## 📄 License

This project is licensed under the JustTheTip Custom License (Based on MIT).
See LICENSE file for full license information.

**Commercial use restrictions apply.** Contact project maintainers for commercial licensing.

---

**Last Updated:** 2025-11-11
**Repository Version:** 1.0.0
**Document Maintainer:** Claude Code
