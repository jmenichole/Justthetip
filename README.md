# JustTheTip - Discord Solana Tipping Bot

A Discord bot that enables seamless Solana (SOL) tipping and airdrops with automatic wallet creation for users.

## 🚀 Features

- **On-Demand Wallet Creation** - Automatically creates Solana wallets when users receive their first tip or airdrop
- **Secure Encryption** - Private keys encrypted with AES-256-GCM
- **Discord Integration** - Slash commands for tipping, airdrops, and wallet management
- **User-Friendly** - No complex setup required for recipients
- **Transaction Tracking** - Full transaction history and verification
- **🤖 Intelligent FAQ Bot** - Natural language question answering with 20+ FAQs
- **💬 Natural Language Processing** - Process transactions using natural conversation
- **📊 Automated Reports** - Generate transaction reports with analytics
- **🎯 Contextual Help** - Smart assistance based on user intent

## ✨ New Intelligent Features

### Intelligent FAQ Bot
Ask questions naturally and get instant answers:
- "How do I create a wallet?"
- "Is JustTheTip safe?"
- "What are the fees?"

Use `/faq` to browse categories or search for specific topics.

### Natural Language Transactions
Talk to the bot naturally:
- "send 0.5 SOL to @friend"
- "what's my balance?"
- "show my transaction history"

The bot understands your intent and helps you complete actions.

### Automated Reports
Generate detailed transaction reports:
- `/report period:this_week` - Weekly activity summary
- `/report period:this_month` - Monthly statistics
- Analytics including top tippers, volume, and trends

See [Intelligent Features Documentation](docs/INTELLIGENT_FEATURES.md) for details.

## 🏗️ Architecture

### Core Components

```
├── db/
│   ├── db.js                 # SQLite database connection
│   └── walletManager.js      # On-demand wallet creation & management
├── utils/
│   └── walletHelper.js       # Helper functions for tip/airdrop commands
├── examples/
│   └── tipCommandIntegration.js  # Example command implementation
└── scripts/
    └── migrateToOnDemand.js  # Migration from pre-gen system
```

### Database Schema

```sql
-- User wallets with encrypted private keys
CREATE TABLE user_wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,           -- Discord user ID
    wallet_address TEXT NOT NULL,           -- Solana public key
    wallet_id TEXT UNIQUE NOT NULL,         -- Internal wallet UUID
    private_key_encrypted TEXT NOT NULL,    -- AES-256-GCM encrypted private key
    network TEXT DEFAULT 'solana',
    auth_method TEXT DEFAULT 'auto-generated',
    created_at INTEGER NOT NULL,
    created_trigger TEXT DEFAULT 'manual',  -- 'tip', 'airdrop', 'manual'
    discord_username TEXT,
    user_email TEXT,
    last_used_at INTEGER
);
```

## 🔧 Setup

### Prerequisites
- Node.js 16+
- Discord Bot Token
- Solana RPC endpoint
- SQLite3

### Installation

```bash
# Clone repository
git clone https://github.com/jmenichole/Justthetip.git
cd Justthetip

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```env
# Discord
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta

# Security
WALLET_ENCRYPTION_KEY=your_32_byte_encryption_key_here

# Database
DATABASE_PATH=./data/bot.db
```

### Migration (if upgrading from pre-gen system)

```bash
node scripts/migrateToOnDemand.js
```

## 💡 Usage

### For Bot Developers

#### Basic Tip Command Integration

```javascript
const walletHelper = require('./utils/walletHelper');

// In your tip command
async function handleTip(interaction, recipient, amount) {
    // Ensure recipient has wallet (creates if needed)
    const walletResult = await walletHelper.ensureWalletForTip(recipient.id, {
        username: recipient.username
    });

    if (!walletResult.success) {
        return interaction.reply(walletResult.message);
    }

    // Process transaction to walletResult.wallet.wallet_address
    const txResult = await processTransaction(amount, walletResult.wallet.wallet_address);
    
    // Notify user if wallet was auto-created
    if (walletResult.created) {
        await notifyNewWallet(recipient, walletResult.wallet);
    }
}
```

#### Airdrop Integration

```javascript
// For airdrop commands
const walletResult = await walletHelper.ensureWalletForAirdrop(userId, userData);
```

#### Wallet Management

```javascript
const walletManager = require('./db/walletManager');

// Check if user has wallet
const wallet = walletManager.getUserWallet(userId);

// Get private key for transactions (be careful!)
const privateKey = walletManager.getUserPrivateKey(userId);

// Get wallet statistics
const stats = walletManager.getWalletStats();
```

#### Intelligent Features Integration

```javascript
// FAQ Service
const { searchFAQ, analyzeIntent } = require('./src/services/faqService');

// Search FAQs
const results = searchFAQ('how to create wallet');

// Analyze user intent
const intent = analyzeIntent('what is my balance?');

// Natural Language Service
const { processNaturalLanguage } = require('./src/services/naturalLanguageService');

// Process natural language message
const intent = processNaturalLanguage('send 0.5 SOL to @user');

// Report Service
const { generateUserReport } = require('./src/services/reportService');

// Generate transaction report
const report = await generateUserReport(userId, transactions, 'this_week');
```

### For End Users

#### Discord Commands

**Core Commands:**
```
/tip @user 0.1              # Tip user 0.1 SOL (creates wallet if needed)
/airdrop 0.05 50            # Airdrop 0.05 SOL to 50 claimers
/register-magic             # Create wallet with Discord OAuth
/status                     # Check your connection and balance
/logs                       # View transaction history
/disconnect-wallet          # Unlink your wallet
/support <issue>            # Report issues
```

**New Intelligent Commands:**
```
/faq                        # Browse FAQ categories
/faq query:<question>       # Search FAQs (e.g., "how to tip")
/faq category:tipping       # View FAQs by category
/report                     # Generate weekly transaction report
/report period:this_month   # Generate monthly report
```

**Natural Language (DM or @mention):**
```
"How do I create a wallet?"    # Get FAQ answer
"what's my balance?"           # Check balance
"send 0.5 SOL to @friend"      # Initiate tip
"show my transactions"         # View history
"generate my weekly report"    # Create report
```

## 🔒 Security Features

### Encryption
- **AES-256-GCM** encryption for private keys
- **Unique IV** for each encryption operation
- **Authentication tags** prevent tampering
- **Environment-based keys** for production security

### Best Practices
- Private keys never stored in plaintext
- Automatic wallet creation reduces user error
- Transaction verification and logging
- Rate limiting on wallet operations

## 🛠️ Development

### Key Classes

#### WalletManager (`db/walletManager.js`)
```javascript
class WalletManager {
    // Create wallet when user receives tip/airdrop
    async createWalletForUser(userId, userData, trigger)
    
    // Check if user has existing wallet
    getUserWallet(userId)
    
    // Get decrypted private key for transactions
    getUserPrivateKey(userId)
    
    // Generate new Solana keypair
    generateSolanaWallet()
}
```

#### WalletHelper (`utils/walletHelper.js`)
```javascript
class WalletHelper {
    // Ensure wallet exists for tip recipient
    async ensureWalletForTip(userId, userData)
    
    // Ensure wallet exists for airdrop recipient  
    async ensureWalletForAirdrop(userId, userData)
    
    // Get formatted wallet info
    getUserWalletInfo(userId)
}
```

### Testing

```bash
# Run tests
npm test

# Test wallet creation
node -e "
const wm = require('./db/walletManager');
wm.initializeWalletTables();
console.log('Tables initialized');
"

# Test encryption/decryption
node -e "
const wm = require('./db/walletManager');
const key = 'test_private_key_here';
const encrypted = wm.encryptPrivateKey(key);
const decrypted = wm.decryptPrivateKey(encrypted);
console.log('Encryption test:', key === decrypted ? 'PASS' : 'FAIL');
"
```

## 📊 Monitoring

### Wallet Statistics
```javascript
const stats = walletManager.getWalletStats();
// Returns: { total, tipCreated, airdropCreated, createdToday }
```

### Database Queries
```sql
-- Check wallet creation triggers
SELECT created_trigger, COUNT(*) FROM user_wallets GROUP BY created_trigger;

-- Recent wallet activity
SELECT * FROM user_wallets WHERE created_at > datetime('now', '-7 days');
```

## 🚨 Important Notes

### Migration from Pre-Generation System
If upgrading from the old pre-generation wallet system:
1. Run `node scripts/migrateToOnDemand.js`
2. Update all tip/airdrop commands to use `walletHelper`
3. Remove old `pregenWalletDb.js` references

### Production Deployment
- Set strong `WALLET_ENCRYPTION_KEY` (32 bytes)
- Use secure Solana RPC endpoint
- Enable database backups
- Monitor wallet creation rates
- Implement transaction fee management

### User Experience Flow
1. User receives tip/airdrop without wallet
2. Bot automatically creates encrypted wallet
3. User gets notification with wallet address
4. Bot sends transaction to new wallet
5. User can manage wallet with Discord commands

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## 🔗 Links

- **GitHub Repository**: [github.com/jmenichole/Justthetip](https://github.com/jmenichole/Justthetip)
- **Documentation**: [GitHub Pages](https://jmenichole.github.io/Justthetip)
- **API Server**: [Vercel Deployment](https://justthetip.vercel.app)

---

*Built with ❤️ for the Solana community*