# 🎁 JustTheTip Airdrop System

## Overview
Airdrops allow **anyone** to reward active users with SOL. Users can create airdrops for any amount, set claim limits, and specify expiration times. Perfect for community rewards, giveaways, and engagement campaigns.

## Key Features

### ✅ Flexible & User-Friendly
- **Any amount**: $0.10 to $100.00 per claim
- **Any user limit**: 1 to 1,000 claims
- **Smart defaults**: 2-minute expiration if not specified
- **Custom messages**: Optional personal message for claimers
- **Server-locking**: Optionally restrict to server members only

### 🎯 Quick Claiming
- **React to claim**: Users click 🎁 reaction on announcement
- **Direct links**: Share claim URL anywhere
- **Instant processing**: Claims execute immediately for registered wallets
- **Auto-registration**: Unregistered users prompted to connect wallet first

### 📊 Management
- **Track airdrops**: View active airdrops with `/my-airdrops`
- **Real-time status**: See claims remaining and expiration
- **Transparent**: All transactions on Solana mainnet

## Usage Examples

### Quick Airdrop (2-minute default)
```
/airdrop amount:5 total_claims:10
```
Creates a $5 airdrop for 10 users, expires in 2 minutes.

### Custom Expiration
```
/airdrop amount:10 total_claims:50 expires_in:1h
```
Creates a $10 airdrop for 50 users, expires in 1 hour.

### Server-Locked with Message
```
/airdrop amount:20 total_claims:25 expires_in:24h message:"Thanks for being awesome!" require_server:true
```
Creates a $20 airdrop for 25 server members with custom message, expires in 24 hours.

### Large Campaign
```
/airdrop amount:2 total_claims:500 expires_in:7d
```
Creates a $2 airdrop for 500 users, expires in 7 days.

## Expiration Options

| Option | Duration | Best For |
|--------|----------|----------|
| `2m` (default) | 2 minutes | Quick rewards, flash drops |
| `5m` | 5 minutes | Short-term engagement |
| `15m` | 15 minutes | Meeting/event rewards |
| `30m` | 30 minutes | Active chat rewards |
| `1h` | 1 hour | Hourly giveaways |
| `6h` | 6 hours | Extended campaigns |
| `24h` | 24 hours | Daily rewards |
| `7d` | 7 days | Weekly campaigns |

## How It Works

### 1. Creator Creates Airdrop
```
Creator uses /airdrop command
↓
Bot validates balance (amount × claims + 5% fee buffer)
↓
Locks SOL in creator's wallet
↓
Posts announcement with 🎁 reaction
↓
Sends confirmation DM to creator
```

### 2. Users Claim
```
User reacts with 🎁 or visits claim link
↓
Bot checks: wallet registered? server member (if locked)?
↓
If registered: Instant claim → SOL sent
If unregistered: Prompt to register → Then claim
```

### 3. Expiration
```
Time expires OR all claims used
↓
Airdrop becomes inactive
↓
Remaining SOL stays in creator's wallet
```

## Command Reference

### `/airdrop` - Create an airdrop
**Required:**
- `amount`: USD per claim ($0.10-$100.00)
- `total_claims`: Max users (1-1000)

**Optional:**
- `expires_in`: Duration (default: 2m)
- `message`: Custom message (max 200 chars)
- `require_server`: Server members only (default: false)

**Example Output:**
```
🎁 Airdrop Available!
@username is rewarding active users!

💰 Amount per Claim: $5.00 (~0.0234 SOL)
👥 Claims Available: 10
⏰ Expires: in 2 minutes

🌐 Anyone can claim
```

### `/my-airdrops` - View your active airdrops
Shows all your currently active airdrops with:
- Claims used/remaining
- Expiration time
- Total value locked
- Claim rate

## Technical Implementation

### Files
- **Handler**: `src/commands/handlers/airdropHandler.js`
- **Commands**: `IMPROVED_SLASH_COMMANDS.js`
- **Database**: Requires `createAirdrop()`, `getUserAirdrops()`, `claimAirdrop()` methods
- **Claim Page**: `api/public/claim.html` (to be created)

### Database Schema (Required)
```sql
CREATE TABLE airdrops (
  id TEXT PRIMARY KEY,
  creatorId TEXT NOT NULL,
  creatorTag TEXT NOT NULL,
  creatorWallet TEXT NOT NULL,
  serverId TEXT,
  serverName TEXT,
  amountSolPerClaim REAL NOT NULL,
  amountUsdPerClaim REAL NOT NULL,
  totalClaims INTEGER NOT NULL,
  remainingClaims INTEGER NOT NULL,
  claimedBy TEXT DEFAULT '[]',
  customMessage TEXT,
  createdAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL,
  active INTEGER DEFAULT 1
);
```

### Next Steps
1. ✅ Handler implementation complete
2. ✅ Slash commands registered
3. ⏳ Add database methods
4. ⏳ Create claim page UI
5. ⏳ Add claim API endpoints
6. ⏳ Implement reaction listener
7. ⏳ Add auto-cleanup for expired airdrops

## Security Features

- **Balance validation**: Checks creator has sufficient SOL before creating
- **Fee buffer**: Adds 5% buffer for transaction fees
- **Nonce-based auth**: x402 Trustless Agent signature verification
- **Expiration enforcement**: Automatic deactivation after time limit
- **Double-claim prevention**: Tracks claimers in database
- **Rate limiting**: Prevents spam (to be implemented)

## FAQ

**Q: What happens if users don't claim all airdrops?**  
A: Unclaimed SOL remains in your wallet. Only claimed amounts are transferred.

**Q: Can I cancel an active airdrop?**  
A: Not yet - coming soon via `/my-airdrops` management interface.

**Q: Do I need to be online for claims to process?**  
A: No! Claims are processed automatically by the bot.

**Q: What if a user tries to claim twice?**  
A: Database tracks claimers - each user can only claim once per airdrop.

**Q: Can unregistered users claim?**  
A: They'll be prompted to register their wallet first using `/register-wallet`.

---

**Created**: November 13, 2025  
**Status**: Handler complete, database integration pending  
**Part of**: JustTheTip x402 Trustless Agent on Solana
