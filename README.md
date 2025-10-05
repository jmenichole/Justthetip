# JustTheTip - Professional Solana Smart Contract SDK ⚡

> **Enterprise-grade non-custodial Discord bot development platform.** Build sophisticated blockchain applications with zero private key management using production-ready Solana smart contracts.

**🔥 ENTERPRISE FOCUS: Advanced Solana smart contract architecture with TypeScript SDK**

---

## 🚀 Professional Solana Smart Contract Platform

### Why Choose JustTheTip SDK

| Traditional Custodial Bots | JustTheTip Smart Contract SDK |
|---------------------------|-------------------------------|
| Bot controls private keys | Users maintain full custody    |
| Database balance tracking | Real-time on-chain queries    |
| Centralized risk exposure | Decentralized by design       |
| Limited scalability      | Enterprise-grade architecture  |

### 🏢 Enterprise Architecture Benefits

- **🔒 Non-custodial Design**: Zero private key exposure with user-controlled signing
- **⚡ Solana Smart Contracts**: Advanced Program Derived Address (PDA) implementation  
- **🛠️ Professional TypeScript SDK**: Comprehensive type safety and developer documentation
- **🌐 Production Ready**: Battle-tested on Solana mainnet with enterprise security
- **📊 Advanced Transaction Management**: Sophisticated instruction creation and state management

---

## 📦 Professional SDK Integration

### 1. Production Dependencies
```bash
npm install @solana/web3.js @solana/spl-token discord.js
mkdir -p logs contracts
```

### 2. Enterprise Smart Contract Demo
```bash
npm run demo:sdk
```

### 3. Deploy Production Discord Bot
```bash
npm run start:smart-contract
```

---

## 🏗️ Smart Contract Architecture Options

### Enterprise Smart Contract Implementation (Recommended)
```bash
node bot_smart_contract.js
```
- ✅ **Non-custodial Architecture**: Zero private key exposure
- ✅ **Solana Smart Contract Powered**: Production-ready blockchain integration
- ✅ **Program Derived Addresses**: Advanced deterministic account generation
- ✅ **Enterprise Security**: Bank-grade transaction handling

### Legacy Implementation (Deprecated)
```bash
node bot.js
```
- ⚠️ **Custodial Risk**: Bot manages private keys
- ⚠️ **Centralized Architecture**: Single point of failure
- ⚠️ **Limited Scalability**: Database-dependent operations

---

## 🔧 Professional Smart Contract Commands

### Production User Interface
- `/register-wallet <address>` - Enterprise wallet registration for smart contract operations
- `/sc-tip @user <amount>` - Generate professional smart contract transaction instructions  
- `/sc-balance` - Real-time on-chain balance queries via Solana RPC
- `/generate-pda` - Advanced Program Derived Address generation
- `/sc-info` - Comprehensive smart contract architecture documentation

### Professional Architecture Features
- **🔐 Wallet Registration**: Enterprise-grade Solana address validation and storage
- **⚡ Smart Contract Instructions**: Generate unsigned transactions for client-side signing
- **🌐 On-chain Integration**: Direct Solana mainnet queries with RPC optimization
- **🔗 PDA Management**: Advanced deterministic address generation for cross-program invocations

---

## 🏢 Enterprise Developer SDK

### Professional TypeScript Integration
```typescript
import { JustTheTipSDK } from './contracts/sdk.js';

// Enterprise SDK initialization
const sdk = new JustTheTipSDK('https://api.mainnet-beta.solana.com');

// Professional smart contract instruction generation
const tipInstruction = sdk.createTipInstruction(
  senderWallet,
  recipientWallet, 
  0.1 // 0.1 SOL
);

// Advanced Program Derived Address generation
const userPDA = await sdk.generateUserPDA('discord_user_id');
```

### Enterprise Discord Bot Integration
```javascript
import { JustTheTipSmartBot } from './bot_smart_contract.js';

const bot = new JustTheTipSmartBot();
await bot.initialize();
```

---

## 📚 Documentation

### SDK Documentation
- [Smart Contract SDK](./contracts/README.md) - Complete SDK documentation
- [Example Usage](./contracts/example.js) - Working code examples
- [Bot Implementation](./bot_smart_contract.js) - Full Discord bot example

### Web Interface
- Professional developer-focused theme
- Smart contract architecture explanations  
- Solana-focused branding and messaging
- TypeScript SDK documentation

---

## 🔄 Migration Guide

### From Custodial to Smart Contract

1. **Users Register Wallets**
   ```bash
   /register-wallet YOUR_SOLANA_ADDRESS
   ```

2. **Replace Custodial Commands**
   - `!tip` → `/sc-tip`
   - `!balance` → `/sc-balance`  
   - Database balances → On-chain queries

3. **Smart Contract Architecture**
   - No more private key management
   - Users sign transactions in their wallets
   - Bot generates transaction instructions only

---

## 🌟 Advanced Features

### Program Derived Addresses
```javascript
// Generate unique PDA for each Discord user
const userPDA = await sdk.generateUserPDA(discordUserId);
```

### Custom Smart Contract Instructions
```javascript
// Build custom instructions for advanced features
const customInstruction = sdk.createCustomInstruction(params);
```

### Multi-Recipient Airdrops  
```javascript
// Create airdrop to multiple recipients
const recipients = [
  { pubkey: wallet1, amount: 0.1 },
  { pubkey: wallet2, amount: 0.1 }
];
const instructions = sdk.createAirdropInstructions(sender, recipients);
```

---

## 🔒 Security

### Smart Contract Benefits
- **No Private Key Storage**: Bot never handles private keys
- **User-Controlled**: All transactions signed by users
- **Transparent**: All transactions on Solana blockchain
- **Auditable**: Smart contract code is verifiable

### Network Fees
- **Transaction Cost**: ~0.000005 SOL per transaction
- **No Service Fees**: SDK usage is completely free
- **User Pays**: Transaction fees paid by transaction signer

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/smart-contracts`)
3. Test smart contract implementation
4. Submit pull request

---

## 📄 License

JustTheTip Custom License (Based on MIT with Commercial Sale Restrictions) - see [LICENSE](LICENSE) for details.

---

**Built with ❤️ for the Solana developer community**

---

## Features

- 🔐 **Non-custodial** — You control your keys, we never store them
- ⚡ **Slash Commands** — Modern Discord interface with `/tip`, `/withdraw`, `/balance`, etc.
- 🪙 **Multi-Chain Support** — Solana (SOL), USDC, Litecoin (LTC), with ETH/XRP/TRX coming soon
- 🎯 **Interactive Button Airdrops** — Click buttons to collect, no `/collect` command needed!
- 💵 **Dollar-Based Airdrops** — Create airdrops with USD amounts (e.g., $5.00) for better UX
- 📊 **Portfolio Balance View** — See crypto amounts AND USD values with total portfolio worth
- 🔄 **Refresh Button** — Update your balance display with one click
- 🔒 **Enterprise Security** — X.509 certificate authentication, encrypted database
- 💰 **Fee System** — 0.5% operational fee with Helius rebate optimization
- 📝 **Tax Tracking** — Transaction records for compliance reporting

---

## 🚀 Recent Updates

**September 13, 2025** - Major UX improvements released!

- 💵 **Dollar-Based Airdrops**: Create airdrops with USD amounts ($5.00) for better user experience
- 📊 **Enhanced Portfolio Balance**: Shows total USD value, coin emojis, and interactive refresh
- 🎯 **Removed `/collect` Command**: Streamlined to button-only airdrop collection  
- 🔄 **Interactive Refresh**: Update balance displays with one click

📖 **[View Full Update Details →](RECENT_UPDATES.md)**

---

## Supported Cryptocurrencies

| Currency | Symbol | Status | Network |
|----------|--------|---------|---------|
| Solana | SOL | ✅ Active | Solana Mainnet |
| USD Coin | USDC | ✅ Active | Solana (SPL Token) |
| Litecoin | LTC | ✅ Active | Litecoin Mainnet |
| Ethereum | ETH | 🔄 Coming Soon | Ethereum Mainnet |
| Ripple | XRP | 🔄 Coming Soon | XRP Ledger |
| Tron | TRX | 🔄 Coming Soon | Tron Mainnet |

---

## Bot Commands

### Essential Commands
- `/tip @user amount currency` — Send crypto to another user
- `/balance` — Check your portfolio with crypto amounts AND USD values 💎
- `/withdraw address amount currency` — Send crypto to external wallet
- `/registerwallet currency address` — Register your wallet addresses
- `/deposit` — Get instructions for adding funds

### Enhanced Features
- `/airdrop amount currency` — Create airdrop with USD amounts (e.g., $5.00 worth of SOL)
- 🎁 **Collect Button** — Click buttons to collect from airdrops (no `/collect` command needed!)
- 🔄 **Balance Refresh** — Update your portfolio view with one click
- `/burn amount currency` — Donate to support bot development
- `/help` — Complete command reference

### New Portfolio Balance Display
Your `/balance` command now shows:
- **Total Portfolio Value** in USD 
- **Individual coin balances** with both crypto amounts and USD values
- **Coin emojis** for easy identification (☀️ SOL, 💚 USDC, 🚀 LTC)
- **Interactive refresh button** for real-time updates

### Supported Commands Format
All commands use dropdown menus for currency selection (SOL, USDC, LTC)

---

## Tech Stack

- **Backend:** Node.js + Express
- **Discord:** Discord.js v14 with Slash Commands
- **Database:** PostgreSQL with ACID transactions (migrated from MongoDB for real money compliance)
- **Blockchain:** 
  - Solana Web3.js + SPL Token
  - Litecoin Core + BitcoinJS
  - Helius RPC for Solana optimization
- **Deployment:** PM2 Process Manager
- **Security:** 
  - ACID-compliant transactions for financial operations
  - Indexed queries for high performance
  - Secrets management ready (AWS Secrets Manager / HashiCorp Vault compatible)
  - Encrypted connections

---

## Legal Compliance

### 📋 Required Documents
- [Terms of Service](TERMS.md) - User agreements and disclaimers
- [Privacy Policy](PRIVACY.md) - Data collection and usage
- [Custom License](LICENSE) - Software licensing (MIT-based, commercial sale restricted)

### ⚠️ Important Disclaimers
- **Non-Custodial:** We never store or control your private keys
- **No Financial Advice:** Bot functionality is not financial advice
- **User Responsibility:** You are responsible for tax compliance and security
- **Regulatory Compliance:** Ensure compliance with local cryptocurrency regulations

---

## Quick Start

1. **Invite Bot** — Add JustTheTip Bot to your Discord server
2. **Set Up Wallets** — Use `/registerwallet` to connect your crypto addresses  
3. **Fund Bot** — Send crypto to your deposit addresses via `/deposit`
4. **Start Tipping!** — Use `/tip @user amount currency` to send crypto

### Environment Setup (Self-Hosting)

```bash
# Clone repository
git clone https://github.com/jmenichole/Justthetip.git
cd Justthetip

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys and database credentials

# Deploy slash commands
node deploy-commands.js

# Start bot
npm start
```

### Required Environment Variables

```env
BOT_TOKEN=your_discord_bot_token
DATABASE_URL=postgresql://username:password@host:port/justthetip
SOLANA_RPC_URL=your_helius_rpc_endpoint

# ⚠️ SECURITY WARNING: For production, use AWS Secrets Manager or HashiCorp Vault
# Development only (NOT FOR PRODUCTION with real money):
SOL_PRIVATE_KEY=[64,byte,array,format]
LTC_WALLET_KEY=your_litecoin_private_key
```

**Security Note:** Private keys should NEVER be stored in environment variables for production deployments handling real money. Use secure secrets management services like AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, or Google Cloud Secret Manager.

---

## Documentation

- **[🚀 Recent Updates](RECENT_UPDATES.md)** - Latest features and changes
- **[🛠️ Deployment Guide](DEPLOYMENT_GUIDE.md)** - Complete setup instructions
- **[⚖️ Terms of Service](terms.md)** - Legal terms and user agreements
- **[🔒 Privacy Policy](privacy.md)** - Data handling and privacy information
- **[📊 Full Documentation Site](https://jmenichole.github.io/Justthetip/)** - Complete documentation

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the JustTheTip Custom License (based on MIT with commercial sale restrictions) - see the [LICENSE](LICENSE) file for details.

---

## Support & Community

- **Issues:** [GitHub Issues](https://github.com/jmenichole/Justthetip/issues)
- **Documentation:** [Complete docs site](https://jmenichole.github.io/Justthetip/)

Built with ❤️ by degenerate developers, for degenerate Discord communities.

**Remember: This bot handles real cryptocurrency. Always test with small amounts first!**