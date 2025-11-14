# JustTheTip - Solana Trustless Agent for Discord

**x402 Hackathon 2025 Entry**

Non-custodial Discord tipping bot powered by Solana. Sign once, tip forever with SOL, USDC, BONK, and more. Works on mobile and desktop with full WalletConnect support.

## 🚀 Quick Start

**Users:** Add the bot to Discord and run `/register-wallet` to get started.  
**Developers:** See [Getting Started](#getting-started) below.

---

## 🌟 Key Features

### Trustless Agent Technology
- **Sign Once, Tip Forever** – One wallet signature enables tipping with all tokens
- **Multi-Token Support** – SOL (live), USDC, BONK, USDT (coming soon)
- **100% Non-Custodial** – Your keys never leave your wallet
- **Mobile & Desktop** – WalletConnect, Phantom, Solflare support

### Platform Capabilities
- **Solana Smart Contracts** – Anchor-based programs for on-chain state tracking
- **x402 Payment Protocol** – USDC micropayments for premium API features
- **Wallet Registration** – Cryptographic signature verification (base58 & base64)
- **NFT Verification** – Metaplex integration for verification badges
- **Developer Tools** – RPC health checks, devnet airdrops, metadata inspection
- **Coinbase Commerce** – Fiat on-ramp for crypto purchases

---

## Platform Overview

JustTheTip is a **Solana Trustless Agent** that enables friction-free cryptocurrency tipping in Discord communities. Users register their wallet once with a cryptographic signature, then tip with any supported token without signing again. The bot never holds user funds—all transactions are non-custodial and verifiable on-chain.

---

## System Architecture
```
┌─────────────────────┐     ┌────────────────────────┐
│ Discord Slash Bot   │ --> │ Express REST API        │ --> Solana RPC (mainnet/devnet)
│ (bot_smart_contract)│     │ (api/server.js)         │ --> Metaplex NFT tooling
└─────────────────────┘     │                        │
        ↑                   │                        │
        │                   │                        │ --> Coinbase Commerce (fiat)
        │                   └────────────────────────┘
        │                                ↓
        │                          SQLite (local storage, tips, transactions)
        │                                ↓
        └───────── Front-end / Docs (GitHub Pages deployment)
```

---

## Repository Layout
| Path | Description |
|------|-------------|
| `api/` | Express REST API for OAuth, NFT minting, Solana tooling, and Coinbase Commerce webhooks. |
| `bot_smart_contract.js` | Non-custodial Discord bot using Solana smart contracts instead of wallet custody. This is the main bot implementation. |
| `deprecated/` | Archived legacy code no longer in use (including old custodial bot). |
| `contracts/` | TypeScript SDK examples and helpers that interact with the on-chain programs. |
| `justthetip-contracts/` | Anchor workspace containing the Solana programs and test suite. |
| `src/utils/` | Shared utilities including logging, Solana dev tools, and Coinbase Commerce client helpers. |
| `docs/` & guides | Deployment, infrastructure, and quick-start documentation for multiple hosting targets. |

---

## Getting Started
### Prerequisites
- Node.js 18+ and npm 9+
- Anchor CLI (`anchor --version`) for building Solana programs
- Solana CLI configured with access to the desired cluster
- SQLite database (auto-created, zero configuration required)

### Installation
```bash
npm install
```

### Environment Bootstrap
Verify that the minimum set of environment variables is present before running any services:
```bash
npm run verify-env -- --smart-contract
```

---

## Configuration
Define configuration in a `.env` file (or your hosting provider). Key variables consumed by `api/server.js` include:

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLANA_CLUSTER` | Optional | Target cluster (`mainnet-beta`, `devnet`, etc.). Defaults to `mainnet-beta`. |
| `SOLANA_RPC_URL` | Optional | Custom RPC endpoint for the primary cluster. |
| `SOLANA_DEVNET_RPC_URL` | Optional | Overrides devnet RPC when using developer tools or airdrops. |
| `WALLETCONNECT_PROJECT_ID` | **Required** | Project ID from https://cloud.reown.com/ for mobile wallet support. Without this, users will see raw WalletConnect URIs. See [WalletConnect Setup Guide](./docs/WALLETCONNECT_SETUP.md). |
| `MINT_AUTHORITY_KEYPAIR` | Recommended | Base58 secret key enabling NFT minting via Metaplex. |
| `VERIFIED_COLLECTION_ADDRESS` | Optional | Collection address to group verification NFTs. |
| `NFT_STORAGE_API_KEY` | Optional | Enables Arweave uploads via Metaplex irys storage adapter. |
| `DISCORD_CLIENT_ID` | Required | OAuth client used for the Discord login flow. |
| `DISCORD_CLIENT_SECRET` | Required | Secret for exchanging OAuth codes. |
| `DISCORD_REDIRECT_URI` | Required | Redirect URL registered with Discord. |
| `COINBASE_COMMERCE_API_KEY` | Optional | Enables fiat charge creation and retrieval. |
| `COINBASE_COMMERCE_WEBHOOK_SECRET` | Optional | Required to validate Coinbase webhook signatures. |

Additional blockchain-specific guides live in the `/docs` and root-level `*_GUIDE.md` files.

---

## Running the Stack
| Command | Purpose |
|---------|---------|
| `npm run start` | Launches the Express API (`api/server.js`). |
| `npm run start:bot` | Starts the non-custodial Discord bot after verifying environment requirements. |
| `npm run start:smart-contract` | Alternative command to start the non-custodial Discord bot. |
| `npm run demo:sdk` | Demonstrates Solana SDK usage via `contracts/example.js`. |
| `npm run build:contracts` | Builds the Anchor programs in `justthetip-contracts`. |
| `npm run test:contracts` | Executes Anchor integration tests. |
| `npm run deploy:devnet` / `deploy:mainnet` | Deploys the Solana program to the respective cluster. |

Services expect Solana RPC endpoints to be reachable from the execution environment. Database is stored locally using SQLite.

---

## Solana Developer Toolkit
`src/utils/solanaDevTools.js` centralizes Solana connectivity, Metaplex configuration, and diagnostics used by the API:
- Connection pooling per cluster with `getStatus()` observability exposed at `GET /api/solana/devtools/status`.
- Program account introspection via `GET /api/solana/devtools/program/:programId/accounts`.
- Devnet/testnet airdrops through `POST /api/solana/devtools/airdrop` (guarded against mainnet usage).
- NFT metadata retrieval with `GET /api/solana/devtools/nft/:mintAddress`.

These helpers can be imported into scripts or bots to reuse the same RPC session and mint authority caching logic.

---

## Coinbase Commerce Integration
Enable fiat onboarding with Coinbase Commerce credentials:
- `POST /api/payments/coinbase/charges` creates charges for premium features or NFT mints.
- `GET /api/payments/coinbase/charges/:id` polls payment state.
- `POST /api/payments/coinbase/webhook` validates webhook signatures using the shared secret before processing events.

`src/utils/coinbaseClient.js` wraps Axios with Coinbase headers, performs timing-safe webhook verification, and is reusable for other services.

---

## Discord Bot Operations
- **Smart Contract Bot:** `bot_smart_contract.js` exposes slash commands such as `/register-wallet`, `/balance`, `/sc-tip`, `/sc-balance`, `/support`, and `/generate-pda` using on-chain state instead of custodial balances.
- **Command Registration:** Run `node register-commands.js` after updating slash commands to sync them with your Discord application.

Refer to `QUICKSTART_SOLANA.md`, `BOT_RAILWAY_SETUP.md`, and related guides for deployment targets like Railway or Docker.

---

## REST API Endpoints
The Express API (see `api/server.js`) provides:
- `GET /api/health` – Overall system health, Solana connection status, and Coinbase configuration hints.
- `GET /api/diag` – Sanitized diagnostics confirming RPC hosts and mint authority previews.
- `POST /api/discord/token` – Exchanges Discord OAuth codes for access tokens and user identity.
- `POST /api/mintBadge` – Mints verification NFTs after signature validation.
- `GET /api/verification/:discordId` – Retrieves verification status.
- `POST /api/ticket` & `GET /api/tickets/:discordId` – Minimal support ticket intake and history.
- Solana developer tooling and Coinbase Commerce routes described above.

Each handler is written with explicit validation and produces JSON responses suitable for front-end integration.

---

## Testing & Quality
| Command | Description |
|---------|-------------|
| `npm test` | Runs Jest unit tests. |
| `npm run lint` | Executes ESLint using the repository's security-focused configuration. |
| `npm run audit` | Audits npm dependencies for vulnerabilities. |
| `npm run test:contracts` | Runs Anchor-based integration tests for the Solana programs. |

CI/CD pipelines should run linting, unit tests, and contract tests before deployment.

---

## Deployment Notes

### Discord Bot Deployment
- **Quick Start**: See [RAILWAY_QUICK_REFERENCE.md](./RAILWAY_QUICK_REFERENCE.md) for fast Railway deployment
- **Complete Guide**: [RAILWAY_DEPLOYMENT_INSTRUCTIONS.md](./RAILWAY_DEPLOYMENT_INSTRUCTIONS.md) has step-by-step instructions
- **Troubleshooting**: [RAILWAY_BOT_CHECKLIST.md](./RAILWAY_BOT_CHECKLIST.md) includes verification checklist
- **Fix Guide**: [FIX_SUMMARY.md](./FIX_SUMMARY.md) documents common issues and solutions

### API Server Deployment
- The API can be hosted on services like Railway, Vercel, or Heroku; see `RAILWAY_*.md` and `DEPLOY_BACKEND.md` for environment-specific steps.
- For Vercel deployment, the repository includes a `vercel.json` configuration file that handles API routing and static file serving.
- Front-end assets are published via GitHub Pages (see `DOCUMENTATION_INDEX.md`).

### Smart Contracts
- Anchor deployments require cluster-specific keypairs and RPC URLs; consult `SOLANA_PROGRAM_GUIDE.md` and `MAINNET_DEPLOYMENT_GUIDE.md`.

### Security
- Production environments must secure secrets through managed secret stores and restrict webhook endpoints to HTTPS.
- Use Railway environment variables for all secrets (DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, etc.)

---

## Additional Resources
- [GitHub Pages Landing Page](https://jmenichole.github.io/Justthetip/landing.html) – Live marketing site, verification walkthrough, and documentation portal.
- [COMPLETE_SETUP_GUIDE.md](./COMPLETE_SETUP_GUIDE.md) – End-to-end bot and API provisioning.
- [IMPLEMENTATION_SUMMARY_SOLANA.md](./IMPLEMENTATION_SUMMARY_SOLANA.md) – Program architecture and PDA design decisions.
- [CRYPTO_SUPPORT_GUIDE.md](./CRYPTO_SUPPORT_GUIDE.md) – Multi-chain wallet support notes.
- [USER_PAID_MINTING_SUMMARY.md](./USER_PAID_MINTING_SUMMARY.md) – Token-gated minting flows and UX considerations.

For further assistance, open an issue or contact the maintainers listed in `CONTRIBUTING.md`.
