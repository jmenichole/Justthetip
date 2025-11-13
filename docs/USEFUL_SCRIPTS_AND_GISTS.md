# Useful Scripts and Code Snippets

**Version:** 1.0.0
**Last Updated:** 2025-11-11

This document contains useful scripts, code snippets, and gists for JustTheTip development.

---

## Table of Contents

- [Development Scripts](#development-scripts)
- [Database Utilities](#database-utilities)
- [Solana Helpers](#solana-helpers)
- [Discord Bot Utilities](#discord-bot-utilities)
- [Testing Utilities](#testing-utilities)
- [Debugging Snippets](#debugging-snippets)

---

## Development Scripts

### Quick Environment Setup

```bash
# Complete project setup
npm install
npm run setup-hooks
npm run kick-setup
npm test
npm run lint
```

### Clean and Rebuild

```bash
# Deep clean and reinstall
npm run clean -- --deep
npm install
npm run build:contracts
npm test
```

### Development Workflow

```bash
# Start development environment
npm run start:bot    # Start Discord bot
npm run start        # Start API server

# Or run both with PM2
pm2 start ecosystem.config.js
```

---

## Database Utilities

### Database Reset (Development Only)

```javascript
// scripts/db-reset.js
const db = require('./db/db');

async function resetDatabase() {
  console.log('⚠️  Resetting database...');

  // Drop all tables
  await db.query('DROP SCHEMA public CASCADE');
  await db.query('CREATE SCHEMA public');

  // Run migrations
  const fs = require('fs');
  const migrations = fs.readdirSync('./db/migrations').sort();

  for (const migration of migrations) {
    const sql = fs.readFileSync(`./db/migrations/${migration}`, 'utf8');
    await db.query(sql);
    console.log(`✅ Applied ${migration}`);
  }

  console.log('✅ Database reset complete');
}

resetDatabase().catch(console.error);
```

### Database Backup

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_20251111_120000.sql
```

### Query Database Status

```javascript
// Check database connection and size
async function checkDatabase() {
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  await client.connect();

  const result = await client.query(`
    SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
  `);

  console.table(result.rows);
  await client.end();
}
```

---

## Solana Helpers

### Check Wallet Balance

```javascript
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

async function checkBalance(address) {
  const connection = new Connection(process.env.SOLANA_RPC_URL);
  const publicKey = new PublicKey(address);

  const balance = await connection.getBalance(publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  return balance;
}
```

### Airdrop SOL (Devnet Only)

```javascript
async function airdropSol(address, amount = 1) {
  const connection = new Connection('https://api.devnet.solana.com');
  const publicKey = new PublicKey(address);

  const signature = await connection.requestAirdrop(
    publicKey,
    amount * LAMPORTS_PER_SOL
  );

  await connection.confirmTransaction(signature);
  console.log(`✅ Airdropped ${amount} SOL to ${address}`);
}
```

### Get Token Accounts

```javascript
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');

async function getTokenAccounts(walletAddress) {
  const connection = new Connection(process.env.SOLANA_RPC_URL);
  const publicKey = new PublicKey(walletAddress);

  const accounts = await connection.getParsedTokenAccountsByOwner(
    publicKey,
    { programId: TOKEN_PROGRAM_ID }
  );

  for (const account of accounts.value) {
    const data = account.account.data.parsed.info;
    console.log(`Token: ${data.mint}`);
    console.log(`Amount: ${data.tokenAmount.uiAmount}`);
  }
}
```

---

## Discord Bot Utilities

### Send Embed Message

```javascript
const { EmbedBuilder } = require('discord.js');

function createSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0x10b981)
    .setTimestamp()
    .setFooter({ text: 'JustTheTip Bot' });
}

// Usage
await interaction.reply({ embeds: [createSuccessEmbed('Success!', 'Operation completed')] });
```

### Paginated Leaderboard

```javascript
async function createPaginatedLeaderboard(interaction, data, pageSize = 10) {
  const pages = Math.ceil(data.length / pageSize);
  let currentPage = 0;

  const generateEmbed = (page) => {
    const start = page * pageSize;
    const end = start + pageSize;
    const pageData = data.slice(start, end);

    const embed = new EmbedBuilder()
      .setTitle('🏆 Leaderboard')
      .setDescription(pageData.map((entry, i) =>
        `${start + i + 1}. ${entry.username} - ${entry.score}`
      ).join('\n'))
      .setFooter({ text: `Page ${page + 1} of ${pages}` });

    return embed;
  };

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId('prev').setLabel('◀').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('next').setLabel('▶').setStyle(ButtonStyle.Primary)
    );

  const message = await interaction.reply({
    embeds: [generateEmbed(currentPage)],
    components: [row],
    fetchReply: true
  });

  const collector = message.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async i => {
    if (i.customId === 'prev' && currentPage > 0) currentPage--;
    if (i.customId === 'next' && currentPage < pages - 1) currentPage++;

    await i.update({ embeds: [generateEmbed(currentPage)] });
  });
}
```

### Rate Limit User Commands

```javascript
const cooldowns = new Map();

function checkCooldown(userId, commandName, cooldownSeconds = 5) {
  const key = `${userId}-${commandName}`;
  const now = Date.now();

  if (cooldowns.has(key)) {
    const expirationTime = cooldowns.get(key) + (cooldownSeconds * 1000);

    if (now < expirationTime) {
      const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
      return { allowed: false, timeLeft };
    }
  }

  cooldowns.set(key, now);
  return { allowed: true };
}
```

---

## Testing Utilities

### Mock Discord Interaction

```javascript
function createMockInteraction(options = {}) {
  return {
    user: { id: options.userId || '123', username: options.username || 'testuser' },
    options: {
      getUser: (name) => options.targetUser || { id: '456', username: 'recipient' },
      getString: (name) => options[name] || '1.0',
      getInteger: (name) => options[name] || 1
    },
    reply: jest.fn(),
    deferReply: jest.fn(),
    editReply: jest.fn(),
    channel: { id: '789' },
    guild: { id: '012', name: 'Test Server' }
  };
}

// Usage in tests
const interaction = createMockInteraction({ userId: 'user123', amount: '5.0' });
await handleTipCommand(interaction);
expect(interaction.reply).toHaveBeenCalled();
```

### Mock Database

```javascript
function createMockDatabase() {
  const data = {
    users: new Map(),
    tips: []
  };

  return {
    getUser: jest.fn((userId) => data.users.get(userId)),
    createUser: jest.fn((user) => {
      data.users.set(user.id, user);
      return user;
    }),
    recordTip: jest.fn((tip) => {
      data.tips.push(tip);
      return tip;
    }),
    reset: () => {
      data.users.clear();
      data.tips = [];
    }
  };
}
```

---

## Debugging Snippets

### Debug Logger

```javascript
const debug = require('debug')('justthetip:debug');

// Usage
debug('Processing tip: %o', { from: 'user1', to: 'user2', amount: 1.5 });

// Enable debug output
// NODE_ENV=development DEBUG=justthetip:* npm start
```

### Performance Timer

```javascript
class PerformanceTimer {
  constructor(label) {
    this.label = label;
    this.start = Date.now();
  }

  log(checkpoint) {
    const elapsed = Date.now() - this.start;
    console.log(`[${this.label}] ${checkpoint}: ${elapsed}ms`);
  }

  end() {
    this.log('Complete');
  }
}

// Usage
const timer = new PerformanceTimer('TipCommand');
timer.log('Started validation');
// ... validation code
timer.log('Validation complete');
// ... blockchain transaction
timer.end();
```

### Error Reporter

```javascript
function reportError(error, context = {}) {
  console.error('❌ Error:', error.message);
  console.error('📍 Context:', JSON.stringify(context, null, 2));
  console.error('📚 Stack:', error.stack);

  // Optional: Send to error tracking service
  // Sentry.captureException(error, { extra: context });
}

// Usage
try {
  await processPayment(amount, recipient);
} catch (error) {
  reportError(error, {
    function: 'processPayment',
    amount,
    recipient,
    userId: interaction.user.id
  });
}
```

---

## Useful One-Liners

### Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Count Lines of Code

```bash
find . -name '*.js' -not -path './node_modules/*' | xargs wc -l | tail -1
```

### Find Large Files

```bash
find . -type f -size +1M -not -path './node_modules/*' -exec ls -lh {} \;
```

### Check Node Module Sizes

```bash
du -sh node_modules/* | sort -hr | head -10
```

### Generate Solana Keypair

```bash
solana-keygen new --outfile ~/.config/solana/test-wallet.json
```

---

## Environment Variable Templates

### Development .env

```bash
# Quick development setup
cp .env.example .env

# Then set:
DISCORD_BOT_TOKEN=your_bot_token
SOLANA_RPC_URL=https://api.devnet.solana.com
DATABASE_URL=sqlite://dev.db
NODE_ENV=development
```

### Production .env

```bash
# Production essentials
DISCORD_BOT_TOKEN=production_token
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
DATABASE_URL=postgresql://user:pass@host:5432/db
NODE_ENV=production
FRONTEND_URL=https://yourapp.com
```

---

## Gist Links

Useful external gists and snippets:

- [Solana Transaction Builder](https://gist.github.com/example) - Coming soon
- [Discord Embed Templates](https://gist.github.com/example) - Coming soon
- [Rate Limiter Implementations](https://gist.github.com/example) - Coming soon

---

## Contributing Scripts

Have a useful script or snippet? Add it to this document!

1. Fork the repository
2. Add your script to the appropriate section
3. Include a clear description and usage example
4. Submit a pull request

---

**Last Updated:** 2025-11-11
**Maintained by:** jlucus, 4eckd
