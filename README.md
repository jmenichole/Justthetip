# JustTheTip

Enterprise-ready, non-custodial Discord tipping and verification platform powered by Solana smart contracts. This repository houses the production bot, REST API, on-chain programs, and developer tooling required to mint verification NFTs, manage wallet-based tipping flows, and accept fiat payments through Coinbase Commerce.

---

## Table of Contents
1. [Platform Overview](#platform-overview)
2. [Key Capabilities](#key-capabilities)
3. [System Architecture](#system-architecture)
4. [Repository Layout](#repository-layout)
5. [Getting Started](#getting-started)
6. [Configuration](#configuration)
7. [Running the Stack](#running-the-stack)
8. [Solana Developer Toolkit](#solana-developer-toolkit)
9. [Coinbase Commerce Integration](#coinbase-commerce-integration)
10. [Discord Bot Operations](#discord-bot-operations)
11. [REST API Endpoints](#rest-api-endpoints)
12. [Testing & Quality](#testing--quality)
13. [Deployment Notes](#deployment-notes)
14. [Additional Resources](#additional-resources)

---

## Platform Overview
JustTheTip delivers a production-ready experience for communities that need provable tipping, wallet verification, and NFT-backed access inside Discord. The stack is fully non-custodial—users sign transactions in their own wallets—while administrators gain observability tools for Solana programs, NFT metadata, and payment state.

---

## Key Capabilities
- **Solana Program Suite** – Anchor-based programs inside `justthetip-contracts` provide deterministic PDAs and state tracking for Discord users.
- **Smart Contract Discord Bot** – `bot_smart_contract.js` exposes slash commands for wallet registration, on-chain tipping, and PDA inspection.
- **Verification NFT Minting** – The Express API mints verification NFTs via Metaplex when Discord users prove wallet ownership.
- **Developer Diagnostics** – `src/utils/solanaDevTools.js` supplies reusable helpers for RPC health, program accounts, devnet airdrops, and metadata inspection.
- **Fiat On-Ramp** – `src/utils/coinbaseClient.js` and `/api/payments/coinbase/*` endpoints integrate Coinbase Commerce for charge creation, polling, and webhook verification.
- **Extensive Documentation** – The `docs/` directory plus numerous deployment guides outline migrations, infrastructure, and operational playbooks.

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
        │                          MongoDB (verifications, tickets)
        │                                ↓
        └───────── Front-end / Docs (GitHub Pages deployment)
```

---

## Repository Layout
| Path | Description |
|------|-------------|
| `api/` | Express REST API for OAuth, NFT minting, Solana tooling, and Coinbase Commerce webhooks. |
| `bot_smart_contract.js` | Non-custodial Discord bot that relies on on-chain programs instead of wallet custody. |
| `bot.js` | Legacy custodial bot kept for backwards compatibility. |
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
- MongoDB instance (local or managed) if you require persistence beyond in-memory storage

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
| `MINT_AUTHORITY_KEYPAIR` | Recommended | Base58 secret key enabling NFT minting via Metaplex. |
| `VERIFIED_COLLECTION_ADDRESS` | Optional | Collection address to group verification NFTs. |
| `NFT_STORAGE_API_KEY` | Optional | Enables Arweave uploads via Metaplex irys storage adapter. |
| `DISCORD_CLIENT_ID` | Required | OAuth client used for the Discord login flow. |
| `DISCORD_CLIENT_SECRET` | Required | Secret for exchanging OAuth codes. |
| `DISCORD_REDIRECT_URI` | Required | Redirect URL registered with Discord. |
| `MONGODB_URI` | Optional | Connection string for persistent verification/ticket storage. |
| `COINBASE_COMMERCE_API_KEY` | Optional | Enables fiat charge creation and retrieval. |
| `COINBASE_COMMERCE_WEBHOOK_SECRET` | Optional | Required to validate Coinbase webhook signatures. |

Additional blockchain-specific guides live in the `/docs` and root-level `*_GUIDE.md` files.

---

## Running the Stack
| Command | Purpose |
|---------|---------|
| `npm run start` | Launches the Express API (`api/server.js`). |
| `npm run start:smart-contract` | Starts the non-custodial Discord bot after verifying smart-contract env requirements. |
| `npm run start:bot` | Runs the legacy custodial bot for backward compatibility testing. |
| `npm run demo:sdk` | Demonstrates Solana SDK usage via `contracts/example.js`. |
| `npm run build:contracts` | Builds the Anchor programs in `justthetip-contracts`. |
| `npm run test:contracts` | Executes Anchor integration tests. |
| `npm run deploy:devnet` / `deploy:mainnet` | Deploys the Solana program to the respective cluster. |

Services expect MongoDB and Solana RPC endpoints to be reachable from the execution environment.

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
- **Smart Contract Bot:** `bot_smart_contract.js` exposes slash commands such as `/register-wallet`, `/sc-tip`, `/sc-balance`, and `/generate-pda` using on-chain state instead of custodial balances.
- **Legacy Bot:** `bot.js` maintains backwards compatibility but should be phased out in favor of the non-custodial flow.
- **Command Registration:** Run `node register-commands.js` after updating slash commands to sync them with your Discord application.

Refer to `QUICKSTART_SOLANA.md`, `BOT_RAILWAY_SETUP.md`, and related guides for deployment targets like Railway or Docker.

---

## REST API Endpoints
The Express API (see `api/server.js`) provides:
- `GET /api/health` – Overall system health, Solana connection status, and Coinbase configuration hints.
- `GET /api/diag` – Sanitized diagnostics confirming RPC hosts and mint authority previews.
- `POST /api/discord/token` – Exchanges Discord OAuth codes for access tokens and user identity.
- `POST /api/mintBadge` – Mints verification NFTs after signature validation.
- `GET /api/verification/:discordId` – Retrieves verification status stored in MongoDB.
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
- The API can be hosted on services like Railway or Heroku; see `RAILWAY_*.md` and `DEPLOY_BACKEND.md` for environment-specific steps.
- Front-end assets are published via GitHub Pages (see `DOCUMENTATION_INDEX.md`).

### Smart Contracts
- Anchor deployments require cluster-specific keypairs and RPC URLs; consult `SOLANA_PROGRAM_GUIDE.md` and `MAINNET_DEPLOYMENT_GUIDE.md`.

### Security
- Production environments must secure secrets through managed secret stores and restrict webhook endpoints to HTTPS.
- Use Railway environment variables for all secrets (BOT_TOKEN, CLIENT_ID, MONGODB_URI, etc.)

---

## Additional Resources
- [GitHub Pages Landing Page](https://jmenichole.github.io/Justthetip/landing.html) – Live marketing site, verification walkthrough, and documentation portal.
- [COMPLETE_SETUP_GUIDE.md](./COMPLETE_SETUP_GUIDE.md) – End-to-end bot and API provisioning.
- [IMPLEMENTATION_SUMMARY_SOLANA.md](./IMPLEMENTATION_SUMMARY_SOLANA.md) – Program architecture and PDA design decisions.
- [CRYPTO_SUPPORT_GUIDE.md](./CRYPTO_SUPPORT_GUIDE.md) – Multi-chain wallet support notes.
- [USER_PAID_MINTING_SUMMARY.md](./USER_PAID_MINTING_SUMMARY.md) – Token-gated minting flows and UX considerations.

For further assistance, open an issue or contact the maintainers listed in `CONTRIBUTING.md`.
