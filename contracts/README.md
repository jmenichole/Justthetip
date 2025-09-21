# JustTheTip Smart Contract SDK

A developer-focused SDK for building non-custodial Discord bots on Solana. Enable tipping, airdrops, and token management through smart contracts without handling private keys.

## 🚀 Quick Start

```javascript
import { JustTheTipSDK } from './contracts/sdk.js';
import { PublicKey } from '@solana/web3.js';

// Initialize SDK
const sdk = new JustTheTipSDK('https://api.mainnet-beta.solana.com');

// Create a tip instruction
const tipInstruction = sdk.createTipInstruction(
  senderWallet,
  recipientWallet,
  0.1 // 0.1 SOL
);
```

## 🏗️ Architecture

### Smart Contract Approach
- **Program Derived Addresses (PDAs)**: Each Discord user gets a unique PDA
- **Non-custodial**: No private key management by the bot
- **Direct on-chain**: All transactions execute through smart contracts
- **User-signed**: Users sign transactions in their own wallets

### Traditional vs Smart Contract Bot

| Traditional (Custodial) | Smart Contract (Non-custodial) |
|------------------------|--------------------------------|
| Bot holds private keys | Users hold their own keys |
| Database balance tracking | On-chain balance queries |
| Bot executes transfers | Users sign transactions |
| Custody risk | No custody risk |

## 📦 SDK Features

### Core Functions

```javascript
// Generate Program Derived Address for Discord user
const userPDA = await sdk.generateUserPDA('discord_user_id');

// Create tip transaction instruction
const tipInstruction = sdk.createTipInstruction(sender, recipient, amount);

// Create airdrop instructions for multiple recipients
const airdropInstructions = sdk.createAirdropInstructions(sender, recipients);

// Get wallet balance from Solana network
const balance = await sdk.getBalance(walletPubkey);

// Validate Solana address
const isValid = sdk.isValidAddress(address);
```

### Discord Bot Integration

```javascript
class SmartContractDiscordBot {
  constructor() {
    this.sdk = new JustTheTipSDK(process.env.SOL_RPC_URL);
  }

  async handleTipCommand(senderId, recipientId, amount) {
    // Get registered wallet addresses
    const senderWallet = await this.getUserWallet(senderId);
    const recipientWallet = await this.getUserWallet(recipientId);

    // Create smart contract instruction
    const instruction = this.sdk.createTipInstruction(
      new PublicKey(senderWallet),
      new PublicKey(recipientWallet),
      amount
    );

    // Return unsigned transaction for user to sign
    return this.sdk.createTransaction([instruction]);
  }
}
```

## 🔧 Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install @solana/web3.js @solana/spl-token discord.js
   ```

2. **Environment Setup**
   ```env
   SOL_RPC_URL=https://api.mainnet-beta.solana.com
   BOT_TOKEN=your_discord_bot_token
   MONGODB_URI=your_mongodb_connection_string
   ```

3. **Run Example**
   ```bash
   node contracts/example.js
   ```

## 🎯 Use Cases

### Discord Bot Commands

- `/register-wallet <address>` - Register Solana wallet
- `/tip-sol @user <amount>` - Create tip transaction  
- `/balance` - Check on-chain wallet balance
- `/airdrop <amount> @role` - Mass distribution to Discord role

### Smart Contract Features

- **Zero Private Keys**: Bot never handles private keys
- **Program Derived Addresses**: Unique addresses per Discord user
- **Direct On-chain**: All balances and transactions on Solana
- **User Controlled**: Users sign all transactions

## 🔒 Security Benefits

1. **No Custody Risk**: Users maintain full control of funds
2. **No Private Key Exposure**: Bot only generates transaction instructions
3. **Transparent**: All transactions visible on Solana blockchain
4. **Auditable**: Smart contract logic is open and verifiable

## 🛠️ Development

### File Structure
```
contracts/
├── sdk.js              # Core SDK functionality
├── smartContractBot.js # Discord bot implementation
├── example.js          # Usage examples
└── README.md          # This file
```

### Example Bot Implementation

The `smartContractBot.js` file demonstrates a complete Discord bot that:
- Registers user wallet addresses in database
- Generates smart contract transaction instructions
- Returns unsigned transactions for users to sign
- Queries on-chain balances directly

### Testing

```bash
# Run SDK example
node contracts/example.js

# Test smart contract bot (requires Discord bot setup)
node contracts/smartContractBot.js
```

## 🌟 Next Steps

1. Deploy custom Solana program for advanced features
2. Integrate wallet adapter for seamless user experience  
3. Add SPL token support for custom tokens
4. Implement role-based permissions and token gating

## 📚 Documentation

For complete documentation and advanced usage, visit the full repository.

---

Built with ❤️ for the Solana developer community