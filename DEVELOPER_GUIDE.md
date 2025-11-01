# JustTheTip Developer Guide

## Overview

JustTheTip is a non-custodial Solana-based Discord tipping bot that enables users to send and receive tips, micro-rewards, and community payouts using SPL tokens while maintaining full control of their private keys.

## Architecture

### Core Components

1. **Bot Layer** - Discord.js integration
   - `bot.js` - Custodial implementation (legacy, for testing)
   - `bot_smart_contract.js` - Non-custodial smart contract implementation (recommended)

2. **SDK Layer** - Solana blockchain interactions
   - `contracts/sdk.js` - Reusable SDK for smart contract operations
   - `contracts/example.js` - SDK usage examples

3. **Integration Layer** - External services
   - `src/utils/jupiterSwap.js` - Jupiter Aggregator for token swaps
   - `chains/solanaHelper.js` - Solana helper utilities

4. **Command Layer** - Bot command handlers
   - `src/commands/leaderboardCommand.js` - Leaderboard functionality
   - `src/commands/swapCommand.js` - Token swap commands
   - `src/commands/airdropCommand.js` - Airdrop functionality

5. **API Layer** - RESTful endpoints
   - `api/server.js` - Main API server
   - `api/adminRoutes.js` - Admin dashboard endpoints

6. **Database Layer** - Data persistence
   - `db/database.js` - PostgreSQL database operations
   - `db/schema.sql` - Database schema

## Development Setup

### Prerequisites

- Node.js v18 or higher
- PostgreSQL database (optional for testing)
- Discord Bot Token
- Solana RPC endpoint (Helius recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/jmenichole/Justthetip.git
cd Justthetip

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# BOT_TOKEN, DATABASE_URL, SOLANA_RPC_URL, etc.
```

### Running the Bot

```bash
# Start custodial bot (for testing)
npm run start:bot

# Start smart contract bot (recommended)
npm run start:smart-contract

# Start API server
npm start

# Run SDK demo
npm run demo:sdk
```

## Key Features Implemented

### 1. Non-Custodial Architecture

Users maintain full control of their private keys. The bot only generates unsigned transactions that users sign in their own wallets.

**Example:**
```javascript
const sdk = new JustTheTipSDK(rpcUrl);
const transaction = sdk.createTipInstruction(sender, recipient, amount);
// User signs this transaction in their wallet
```

### 2. Jupiter Swap Integration

Cross-token tipping via Jupiter Aggregator. Users can send one token and recipients receive another.

**Commands:**
- `/swap from to amount` - Convert tokens

**Example:**
```javascript
const jupiter = new JupiterSwap(rpcUrl);
const quote = await jupiter.getQuote(inputMint, outputMint, amount);
```

### 3. Leaderboard System

Track and display top tippers and recipients with database queries.

**Commands:**
- `/leaderboard` - View top tippers and recipients

**Features:**
- Top 10 tippers by volume
- Top 10 recipients by volume
- Real-time database queries
- Graceful handling of demo mode

### 4. Admin Dashboard API

RESTful API endpoints for analytics and monitoring.

**Endpoints:**
- `GET /api/admin/stats` - Overall bot statistics
- `GET /api/admin/top-tokens` - Top tokens this week
- `GET /api/admin/recent-activity` - Recent transactions
- `GET /api/admin/user/:userId` - User details
- `GET /api/admin/daily-stats` - Daily statistics

**Authentication:**
```bash
curl -H "X-Admin-Secret: YOUR_SECRET" https://api.example.com/api/admin/stats
```

### 5. SDK Features

**Transaction Creation:**
- SOL transfers
- SPL token transfers
- Multi-recipient airdrops
- Program Derived Addresses (PDAs)

**Queries:**
- Balance checks (SOL and SPL)
- Transaction status
- Address validation

**Example:**
```javascript
const sdk = new JustTheTipSDK(rpcUrl);

// Create tip
const tipTx = sdk.createTipInstruction(sender, recipient, 0.1);

// Generate PDA
const pda = sdk.generateUserPDA('discord_user_id');

// Check balance
const balance = await sdk.getBalance(walletAddress);
```

## Code Style Guidelines

### General

- Use **async/await** for asynchronous operations (no callbacks)
- Add JSDoc comments for all functions
- Follow ESLint rules (see `.eslintrc.json`)
- Use Prettier for formatting (see `.prettierrc.json`)

### Function Documentation

```javascript
/**
 * Brief description of function
 * 
 * @param {string} userId - Discord user ID
 * @param {number} amount - Amount in SOL
 * @returns {Promise<Object>} Transaction object
 */
async function createTransaction(userId, amount) {
  // Implementation
}
```

### Error Handling

Always handle errors gracefully:

```javascript
try {
  const result = await someOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error.message);
  return null; // Or throw if appropriate
}
```

## Testing

### Run Linter

```bash
npm run lint
```

### Run SDK Demo

```bash
npm run demo:sdk
```

### Manual Testing

1. Start the bot in a test Discord server
2. Use test commands with small amounts
3. Verify transactions on Solana explorer

## Security Considerations

### Private Keys

- **NEVER** store private keys in code
- Use environment variables for development only
- Production: Use AWS Secrets Manager, HashiCorp Vault, or similar

### Input Validation

All user inputs are validated:

```javascript
// Validate Solana address
if (!sdk.validateAddress(address)) {
  return interaction.reply({ content: '❌ Invalid address' });
}

// Validate amount
if (amount <= 0 || amount > MAX_AMOUNT) {
  return interaction.reply({ content: '❌ Invalid amount' });
}
```

### Rate Limiting

Commands implement rate limiting to prevent abuse:

```javascript
if (isRateLimited(userId, commandName)) {
  return interaction.reply({ 
    content: '⏳ Please wait before using this command again.',
    ephemeral: true 
  });
}
```

## Adding New Features

### 1. Create a Command Module

Create a new file in `src/commands/`:

```javascript
// src/commands/myCommand.js

/**
 * My Command Handler
 * 
 * @param {Object} interaction - Discord interaction
 * @param {Object} db - Database connection
 */
async function handleMyCommand(interaction, db) {
  try {
    // Implementation
  } catch (error) {
    console.error('Command error:', error);
    await interaction.reply({
      content: '❌ An error occurred.',
      ephemeral: true
    });
  }
}

module.exports = { handleMyCommand };
```

### 2. Register the Command

Add to the commands array in `bot.js` or `bot_smart_contract.js`:

```javascript
const commands = [
  // ... existing commands
  {
    name: 'mycommand',
    description: 'My new command',
    options: [
      { 
        name: 'param', 
        type: 3, 
        description: 'Parameter description', 
        required: true 
      }
    ]
  }
];
```

### 3. Add Command Handler

Import and use in the interaction handler:

```javascript
const { handleMyCommand } = require('./src/commands/myCommand');

// In the interaction handler
if (commandName === 'mycommand') {
  await handleMyCommand(interaction, db);
}
```

## API Integration

### Adding External APIs

1. Create a module in `src/utils/`
2. Use axios for HTTP requests
3. Handle errors gracefully
4. Cache responses when appropriate

Example:

```javascript
// src/utils/priceApi.js
const axios = require('axios');

async function getTokenPrice(symbol) {
  try {
    const response = await axios.get(`https://api.example.com/price/${symbol}`);
    return response.data.price;
  } catch (error) {
    console.error('Price API error:', error.message);
    return null;
  }
}

module.exports = { getTokenPrice };
```

## Database Operations

### Query Example

```javascript
// Get user balance
const result = await db.pool.query(
  'SELECT amount FROM balances WHERE user_id = $1 AND currency = $2',
  [userId, 'SOL']
);

const balance = result.rows[0]?.amount || 0;
```

### Transaction Example

```javascript
const client = await db.pool.connect();
try {
  await client.query('BEGIN');
  
  // Multiple queries here
  await client.query('UPDATE balances SET amount = amount - $1 WHERE user_id = $2', [amount, userId]);
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

## Deployment

### Environment Variables

Required:
- `BOT_TOKEN` - Discord bot token
- `CLIENT_ID` - Discord client ID
- `SOLANA_RPC_URL` - Solana RPC endpoint

Optional:
- `DATABASE_URL` - PostgreSQL connection string
- `MONGODB_URI` - MongoDB connection string (legacy)
- `SUPER_ADMIN_SECRET` - Admin API authentication

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use secure secrets management
- [ ] Enable SSL for database connections
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Test with small amounts first
- [ ] Set up backup and recovery

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow code style guidelines
4. Add tests if applicable
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Resources

- [Solana Documentation](https://docs.solana.com/)
- [Discord.js Guide](https://discordjs.guide/)
- [Jupiter Aggregator](https://docs.jup.ag/)
- [SPL Token Program](https://spl.solana.com/token)

## License

JustTheTip Custom License (Based on MIT) - see LICENSE file for details.

## Support

- GitHub Issues: [Report bugs](https://github.com/jmenichole/Justthetip/issues)
- Documentation: [Full docs](https://jmenichole.github.io/Justthetip/)

---

Built with ❤️ for the Solana developer community.
