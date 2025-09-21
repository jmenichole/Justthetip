# JustTheTip Smart Contract SDK

A TypeScript/JavaScript SDK for building non-custodial Discord bots on Solana.

## Features

- **🔒 Non-custodial**: Users maintain full control of their funds
- **⚡ Smart Contracts**: All transactions through Solana programs  
- **🔗 PDAs**: Program Derived Addresses for advanced features
- **🛠️ TypeScript SDK**: Fully typed with comprehensive documentation

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

## Examples

See `example.js` for working code examples.

## Security

- Bot never handles private keys
- Users sign transactions in their own wallets
- All transactions are transparent on-chain