# JustTheTip Smart Contract SDK

A TypeScript/JavaScript SDK for building non-custodial Discord bots on Solana with custom on-chain programs.

## Features

- **🔒 Non-custodial**: Users maintain full control of their funds
- **⚡ Smart Contracts**: All transactions through custom Solana programs built with Anchor  
- **🔗 PDAs**: Program Derived Addresses for user accounts and airdrops
- **🛠️ TypeScript SDK**: Fully typed with comprehensive documentation
- **📊 On-chain Stats**: Track tips sent, received, and leaderboards on-chain
- **🎁 Airdrops**: Create and claim multi-recipient airdrops with smart contracts

## Installation

```bash
npm install @solana/web3.js
```

## Usage

### Basic SDK Usage

```javascript
import { JustTheTipSDK } from './sdk.js';

// Initialize SDK
const sdk = new JustTheTipSDK('https://api.mainnet-beta.solana.com');

// Create tip instruction
const tipInstruction = sdk.createTipInstruction(
  senderWallet,
  recipientWallet, 
  0.1 // 0.1 SOL
);

// Generate PDA for Discord user
const userPDA = await sdk.generateUserPDA('discord_user_id');
```

### Discord Bot Integration

```javascript
import { JustTheTipSmartBot } from '../bot_smart_contract.js';

const bot = new JustTheTipSmartBot();
await bot.initialize();
```

## API Reference

### JustTheTipSDK

#### `constructor(rpcUrl?)`
Initialize the SDK with optional RPC URL.

#### `createTipInstruction(sender, recipient, amount)`
Creates a Solana instruction for tipping.

#### `generateUserPDA(discordUserId)`
Generates a Program Derived Address for a Discord user.

#### `getBalance(walletAddress)`
Gets the SOL balance of a wallet.

#### `createAirdropInstructions(sender, recipients)`
Creates multiple transfer instructions for airdrops.

## Smart Contract Development

The JustTheTip smart contracts are located in `/justthetip-contracts` and built using the Anchor framework.

### Program Features

- **User Accounts**: PDA-based user accounts tracking tips sent/received
- **SOL Tips**: Direct SOL transfers with on-chain statistics
- **SPL Token Tips**: Support for any SPL token
- **Airdrops**: Create multi-recipient airdrops with claim functionality
- **Events**: Emitted events for indexing and analytics

### Building the Program

```bash
cd justthetip-contracts

# Install dependencies
npm install

# Build the program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Program Structure

```
justthetip-contracts/
├── Anchor.toml           # Anchor workspace configuration
├── Cargo.toml            # Rust workspace configuration
├── programs/
│   └── justthetip/
│       ├── Cargo.toml    # Program dependencies
│       ├── Xargo.toml    # Build configuration
│       └── src/
│           └── lib.rs    # Main program code
├── tests/
│   └── justthetip.ts     # TypeScript tests
└── migrations/
    └── deploy.ts         # Deployment script
```

## Examples

See `example.js` for working code examples.

## Security

- Bot never handles private keys
- Users sign transactions in their own wallets
- All transactions are transparent on-chain
- Program uses Anchor's security features (constraints, checks)
- All operations validated on-chain