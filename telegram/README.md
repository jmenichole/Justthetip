# JustTheTip Telegram Bot

Non-custodial Solana tipping bot for Telegram.

## Overview

This directory contains the complete Telegram bot implementation for JustTheTip, enabling users to send Solana-based tips directly in Telegram chats.

## Architecture

```
telegram/
├── bot.js                    # Main bot class
├── telegram-bot-start.js     # Entry point (root)
├── commands/                 # Command handlers
│   ├── start.js
│   ├── help.js
│   ├── register.js
│   ├── balance.js
│   ├── tip.js
│   ├── wallet.js
│   ├── history.js
│   ├── price.js
│   ├── rain.js              # Mass tipping (groups)
│   ├── leaderboard.js       # Top tippers display
│   ├── settings.js          # Group configuration
│   └── admin.js             # Admin commands
├── middleware/               # Bot middleware
│   ├── auth.js              # Authentication
│   ├── rateLimit.js         # Rate limiting
│   └── logging.js           # Request logging
├── services/                 # Business logic
│   ├── notificationService.js
│   └── tippingService.js
└── handlers/                 # Event handlers
```

## Features

### ✅ Implemented

- ✅ Bot framework with Telegraf
- ✅ Command routing and middleware
- ✅ Wallet registration flow
- ✅ Balance checking
- ✅ Tipping functionality (mentions and replies)
- ✅ Transaction history
- ✅ Token price checking
- ✅ Rate limiting and security
- ✅ Notification system
- ✅ Database integration
- ✅ Group chat support with activity tracking
- ✅ Rain command (mass tipping to random active users)
- ✅ Leaderboards (group and global)
- ✅ Admin commands (ban, unban, stats)
- ✅ Group settings management

### 📋 Planned

- 📋 Mini app (Telegram Web Apps)
- 📋 Channel integration
- 📋 Advanced analytics
- 📋 Scheduled rain events

## Quick Start

### Prerequisites

- Node.js 18+
- Telegram bot token from @BotFather
- Solana RPC endpoint

### Setup

1. **Get a bot token**
   ```
   1. Open Telegram
   2. Search for @BotFather
   3. Send /newbot
   4. Follow instructions
   5. Copy the token
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add:
   # TELEGRAM_BOT_TOKEN=your_token_here
   # SOLANA_RPC_URL=https://api.devnet.solana.com
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the bot**
   ```bash
   npm run start:telegram
   ```

## Commands

### User Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Start the bot and see welcome message | `/start` |
| `/help` | Show help and command list | `/help` |
| `/register` | Register your Solana wallet | `/register` |
| `/wallet` | View wallet info and QR code | `/wallet` |
| `/balance` | Check your token balances | `/balance` |
| `/tip` | Send a tip to a user | `/tip @alice 10 SOL` |
| `/history` | View transaction history | `/history` |
| `/price` | Check token prices | `/price SOL` |

### Group Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/rain` | Mass tip random active users (groups only) | `/rain 100 BONK 10` |
| `/leaderboard` | View top tippers with rankings | `/leaderboard 7d` |
| `/settings` | Configure group settings (admin only) | `/settings` |
| `/stats` | View group statistics | `/stats` |

### Admin Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/admin` | Show admin panel (admin only) | `/admin` |
| `/ban` | Ban user from bot in group | `/ban @spammer reason` |
| `/unban` | Unban user from bot | `/unban @user` |

### Tipping Syntax

**Mention a user:**
```
/tip @username 10 SOL
/tip @alice 5.5 USDC
```

**Reply to a message:**
```
[Reply to user's message]
/tip 10 SOL
```

**Supported tokens:** SOL, USDC, BONK, USDT

## Group Features

### Rain Command

Distribute tips to multiple random active users in a group:

```
/rain <amount> <token> [recipient_count]
```

**Examples:**
- `/rain 100 BONK 10` - Send 100 BONK to 10 random active users
- `/rain 5 SOL` - Send 5 SOL to 5 random users (default count)

**Features:**
- Only works in group chats
- Selects from active users (last 24 hours)
- Recipients must have registered wallets
- Maximum 50 recipients per rain
- Shows USD value if available
- Displays all recipients before signing

**Group Settings:**
Admins can configure:
- `max_rain_recipients` - Maximum recipients (1-100)
- `enable_rain` - Enable/disable rain command

### Leaderboards

View top tippers with rankings and statistics:

```
/leaderboard [period]
```

**Periods:**
- `24h` - Last 24 hours
- `7d` - Last 7 days (default)
- `30d` - Last 30 days
- `all` - All time

**Displays:**
- 🥇🥈🥉 Top 3 with medals
- Total USD volume tipped
- Number of tips sent
- Most used token
- Ranking position

**Scope:**
- In groups: Shows group-specific leaderboard
- In private chat: Shows global leaderboard

### Group Settings

Admins can configure group behavior:

```
/settings
```

**Configurable Options:**
- `min_tip_amount` - Minimum tip amount (prevents spam)
- `allowed_tokens` - Comma-separated token whitelist
- `enable_tipping` - Enable/disable tipping in group
- `enable_leaderboard` - Show/hide leaderboard
- `enable_notifications` - Tip notifications
- `enable_rain` - Enable/disable rain command
- `max_rain_recipients` - Max users per rain (1-100)

**Example Configuration:**
```
min_tip_amount: 1.0
allowed_tokens: SOL,USDC,BONK
enable_rain: true
max_rain_recipients: 25
```

### Admin Commands

**Statistics (`/stats`):**
- Total tips and volume (all time, 24h, 7d)
- Active users count
- Registered users count
- Most popular token
- Top tipper

**Ban Management:**
```bash
/ban @username [reason]    # Ban user from bot in group
/unban @username           # Unban user
```

**Admin Panel (`/admin`):**
Interactive menu with quick access to:
- Group settings
- Statistics dashboard
- User management
- System status

## Development

### Project Structure

**bot.js** - Main bot class
- Initializes Telegraf
- Sets up middleware chain
- Registers command handlers
- Manages bot lifecycle

**Commands** - Handle user commands
- Parse input
- Validate data
- Execute business logic
- Send responses

**Middleware** - Request processing
- `auth.js` - Check wallet registration
- `rateLimit.js` - Prevent abuse
- `logging.js` - Log requests

**Services** - Business logic
- `notificationService.js` - Send notifications
- `tippingService.js` - Handle tip transactions

### Adding a New Command

1. Create handler in `commands/`:
```javascript
// commands/mycommand.js
async function myCommand(ctx) {
  await ctx.reply('Hello!');
}
module.exports = myCommand;
```

2. Register in `bot.js`:
```javascript
const myCommand = require('./commands/mycommand');
this.bot.command('mycommand', myCommand);
```

3. Add to bot commands menu in `bot.js`:
```javascript
await this.bot.telegram.setMyCommands([
  // ... existing commands
  { command: 'mycommand', description: 'My new command' }
]);
```

### Testing

```bash
# Start in development mode
npm run start:telegram:dev

# Test commands in Telegram
# 1. Send /start to your bot
# 2. Try different commands
# 3. Check logs
```

## Database

Telegram bot extends the existing database with additional tables:

**telegram_tips** - Tip transactions
- Tracks tip status (pending, signed, confirmed, failed)
- Stores Telegram chat and message info
- Links to sender/recipient

**telegram_chats** - Registered chats
- Chat metadata
- Settings and preferences

**registration_nonces** - Wallet registration
- Time-limited nonces for security
- Single-use verification

**telegram_group_settings** - Group configuration
- Per-group settings (min_tip, allowed_tokens, etc.)
- Feature toggles (rain, leaderboard, notifications)
- Max rain recipients configuration

**telegram_user_activity** - Activity tracking
- Tracks user messages per group
- Used for rain command recipient selection
- Last activity timestamps

**telegram_rain** - Rain tip records
- Mass tipping transaction history
- Recipient lists and amounts
- Status tracking (pending, signed, confirmed)

**telegram_banned_users** - Ban management
- Group-specific user bans
- Ban reasons and admin attribution
- Timestamp tracking

See `db/telegramExtensions.js` and `db/telegramGroupExtensions.js` for implementation details.

## Security

### Features

✅ **Rate Limiting**
- 10 requests/minute per user (default)
- 5 tips/minute per user
- 3 registrations/15 minutes per IP

✅ **Authentication**
- Middleware checks wallet registration
- Protected commands require auth

✅ **Input Validation**
- All inputs sanitized
- Amount and address validation
- Token whitelist

✅ **Non-Custodial**
- No private keys stored
- Users sign in their wallet
- Transactions on-chain

### Best Practices

1. **Never log sensitive data**
   - No private keys
   - No full wallet addresses in logs

2. **Validate all inputs**
   - Check amounts
   - Verify addresses
   - Sanitize strings

3. **Use rate limiting**
   - Prevents spam
   - Protects from abuse

4. **Secure webhooks**
   - Use HTTPS only
   - Validate webhook signature

## Deployment

### Development (Polling)

```bash
NODE_ENV=development npm run start:telegram
```

### Production (Webhooks)

1. **Set up webhook URL**
   ```bash
   TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
   TELEGRAM_USE_POLLING=false
   ```

2. **Deploy to Railway/Vercel**
   ```bash
   # Configure environment variables
   # Deploy code
   # Webhook auto-configured on start
   ```

3. **Verify webhook**
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```

## Monitoring

### Logs

All activity logged via Winston:
```javascript
logger.info('User command executed');
logger.error('Error processing tip');
```

### Metrics to Track

- Command usage frequency
- Tip success rate
- Error rates
- Response times
- Active users

## Troubleshooting

### Bot not responding

1. Check bot token is correct
2. Verify bot is running
3. Check logs for errors
4. Ensure RPC is accessible

### Tips failing

1. Check user has registered wallet
2. Verify sufficient balance
3. Check RPC connection
4. Review error logs

### Rate limit issues

1. Check rate limit config
2. Verify IP not blocked
3. Review request patterns

## Resources

- [Telegraf Documentation](https://telegraf.js.org/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [JustTheTip Docs](https://jmenichole.github.io/Justthetip/)

## Contributing

See main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### Telegram-Specific

- Follow existing command structure
- Add tests for new commands
- Update this README
- Document new features

## License

Custom MIT-based - See [LICENSE](../LICENSE)

---

**Version**: 1.0.0
**Author**: 4eckd
**Last Updated**: 2025-11-12
