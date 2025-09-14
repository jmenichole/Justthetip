# JustTheTip 🤏💸

> A self-custodial Discord crypto tipping bot — built for degenerates, by degenerates. Supports multiple cryptocurrencies with real blockchain transactions. Fast, flexible, and just the tip. So smooth you'll hardly feel it.

**⚠️ LEGAL DISCLAIMER: This bot is non-custodial and provided "as is" without warranties. Users are responsible for their own wallets and compliance with local laws. By using this bot, you agree to the [Terms of Service](TERMS.md) and [Privacy Policy](PRIVACY.md).**

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
- **Database:** MongoDB with X.509 Authentication
- **Blockchain:** 
  - Solana Web3.js + SPL Token
  - Litecoin Core + BitcoinJS
  - Helius RPC for Solana optimization
- **Deployment:** PM2 Process Manager
- **Security:** Certificate-based authentication, encrypted connections

---

## Legal Compliance

### 📋 Required Documents
- [Terms of Service](TERMS.md) - User agreements and disclaimers
- [Privacy Policy](PRIVACY.md) - Data collection and usage
- [MIT License](LICENSE) - Software licensing

### �� Important Disclaimers
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
git clone https://github.com/Mischief-Manager-inc/justthetip.git
cd justthetip

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
SOL_PRIVATE_KEY=[64,byte,array,format]
LTC_WALLET_KEY=your_litecoin_private_key
MONGODB_URI=your_mongodb_connection_string
SOLANA_RPC_URL=your_helius_rpc_endpoint
```

---

## Documentation

- **[🚀 Recent Updates](RECENT_UPDATES.md)** - Latest features and changes
- **[🛠️ Deployment Guide](DEPLOYMENT_GUIDE.md)** - Complete setup instructions
- **[⚖️ Terms of Service](TERMS.md)** - Legal terms and user agreements
- **[🔒 Privacy Policy](PRIVACY.md)** - Data handling and privacy information
- **[📊 Full Documentation Site](https://mischief-manager-inc.github.io/justthetip/)** - Complete documentation

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support & Community

- **Discord:** [Join our community server](https://discord.gg/your-server)
- **Issues:** [GitHub Issues](https://github.com/Mischief-Manager-inc/justthetip/issues)
- **Documentation:** [Complete docs site](https://mischief-manager-inc.github.io/justthetip/)

Built with ❤️ by degenerate developers, for degenerate Discord communities.

**Remember: This bot handles real cryptocurrency. Always test with small amounts first!**
