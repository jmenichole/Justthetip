# Changelog

All notable changes to JustTheTip will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Kick.com streaming platform integration planning and documentation
- Comprehensive Kick Bot API integration plan with OAuth 2.1, WebSocket chat, and webhook support
- Passkey-based wallet authentication plan using WebAuthn/FIDO2
- Database migrations for Kick users, channels, tips, and passkey authentication
- Interactive Kick integration setup script (`scripts/kick-setup.js`)
- CONTRIBUTORS.md with proper attribution to project maintainers
- REPOSITORY_INDEX.md with complete repository structure and feature overview
- Developer contribution guide for Kick integration features
- Magic Link Discord Social Login documentation and configuration guides
  - MAGIC_DISCORD_OAUTH_FIX.md - Quick reference for redirect URI configuration
  - docs/guides/MAGIC_DISCORD_SOCIAL_LOGIN_SETUP.md - Complete setup guide
  - docs/guides/MAGIC_DISCORD_REDIRECT_FIX.md - 5-minute quick fix guide

### Changed
- Updated .env.example with Kick API, Passkey, and encryption configuration sections
- Updated .env.example with Magic Link Discord OAuth redirect URI notes
- Enhanced Magic Link Discord OAuth documentation with domain allowlist configuration
  - Added Magic Link dashboard allowlist requirements to all guides
  - Added troubleshooting for CORS and "origin not allowed" errors
  - Updated configuration checklists to include domain allowlist steps

### Fixed
- Magic Link Discord social login "invalid redirect URI" error in dashboard testing
  - Documented both required redirect URIs (production and test) that must be registered in Discord Developer Portal
  - Added comprehensive troubleshooting guides for OAuth configuration
  - **Added critical domain allowlist configuration** for Magic Link dashboard (Settings → Allowlists)
  - Documented that applications must allowlist their domains in Magic Link for authentication to work

## [1.0.0] - 2025-11-07

### Added
- `/register-wallet` command for signature-based wallet registration
- WalletConnect integration for mobile and desktop wallet support
- Signature verification system with rate limiting
- Database schema for wallet registration tracking
- PostgreSQL/Supabase production database support
- SQLite fallback for local development
- Wallet registration UI (sign.html) with modern design
- Security documentation for HTML usage

### Changed
- Updated slash commands to new user-friendly structure
- Improved error handling and user feedback
- Enhanced wallet connection flow

### Fixed
- Linting errors and duplicate handler issues
- Slash command registration problems
- Deploy failure issues with obsolete test files

### Security
- Added rate limiting for wallet registration endpoints
- Implemented signature verification for wallet ownership
- Added time-limited registration links (10-minute expiry)
- Encrypted OAuth token storage preparation

## [0.9.0] - 2025-10-15

### Added
- Non-custodial Solana smart contract integration
- NFT verification badge system
- Multi-token support (SOL, USDC, BONK)
- Jupiter Swap integration for token swaps
- Coinbase Commerce payment integration
- x402 Payment Protocol for premium features
- Admin dashboard API endpoints
- Support ticket system

### Changed
- Migrated from MongoDB to PostgreSQL for ACID compliance
- Updated architecture to non-custodial model
- Improved transaction logging and audit trail

## [0.8.0] - 2025-09-01

### Added
- Initial Discord bot with tip functionality
- Basic wallet management
- Transaction history tracking
- Leaderboard system

---

## Version History

- **[Unreleased]** - Kick integration and Passkey authentication (in planning)
- **[1.0.0]** - 2025-11-07 - Wallet registration and WalletConnect
- **[0.9.0]** - 2025-10-15 - Non-custodial architecture and smart contracts
- **[0.8.0]** - 2025-09-01 - Initial Discord bot release

---

## How to Update This Changelog

When adding changes:

1. Add entries under `[Unreleased]` section
2. Use these categories:
   - **Added** - New features
   - **Changed** - Changes to existing functionality
   - **Deprecated** - Soon-to-be removed features
   - **Removed** - Removed features
   - **Fixed** - Bug fixes
   - **Security** - Security improvements

3. When releasing a new version:
   - Move `[Unreleased]` entries to new version section
   - Update version number and date
   - Create new `[Unreleased]` section

Example:
```markdown
### Added
- New feature description with PR reference #123

### Fixed
- Bug fix description with issue reference #456
```

---

**Contributors:** See [CONTRIBUTORS.md](./CONTRIBUTORS.md) for full contributor list.

**Co-maintained by:**
- jlucus <jlucus@users.noreply.github.com>
- 4eckd <4eckd@users.noreply.github.com>
