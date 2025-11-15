# JustTheTip - Kick Integration Plan

**Document Version:** 1.0  
**Date:** 2025-11-15  
**Status:** Planning Phase  

---

## Executive Summary

This document outlines the comprehensive plan to integrate JustTheTip bot with Kick.com streaming platform, mirroring the successful Discord implementation while adding platform-specific optimizations and improvements.

---

## 1. Current Discord Implementation Analysis

### 1.1 Core Features (Fully Functional)

#### Wallet Management
- **`/register-wallet`** - x402 Trustless Agent registration
  - One-time signature proves ownership
  - Non-custodial (keys never leave user's wallet)
  - Supports Phantom, Solflare, mobile wallets via WalletConnect
  - 10-minute expiring registration links with UUID nonces
  
- **`/disconnect-wallet`** - Wallet unlinking
- **`/register-magic`** - Magic Link embedded wallet integration

#### Tipping System
- **`/tip @user $amount`** - P2P cryptocurrency tips
  - USD input → automatic SOL conversion
  - Min: $0.10, Max: $100.00
  - Solana Pay URLs for direct transfers
  - Pending tips system for unregistered users
  - Transaction tracking with signatures

#### Airdrop System
- **`/airdrop`** - Create claimable tip pools
  - Per-user amount configuration
  - Max claims limit (1-1000)
  - Time expiration (2min - 7 days)
  - Server-restricted or global
  - Custom messages
  - Creator management via `/my-airdrops`

#### Utility Commands
- **`/help`** - Command documentation
- **`/status`** - Bot health & wallet connection status
- **`/logs`** - Transaction history (DM'd to user)
- **`/support`** - Issue reporting
- **`/donate`** - Developer support

### 1.2 Technical Architecture

#### Database Schema (SQLite/PostgreSQL)
```sql
-- Core tables
users (discord_user_id, wallet_address, created_at)
tips (sender_id, recipient_id, amount, token, signature, status, timestamp)
pending_tips (sender_id, recipient_username, amount, expires_at, notified)
airdrops (creator_id, amount_per_claim, max_claims, expires_at, message, server_restricted)
airdrop_claims (airdrop_id, claimer_id, claimed_at)
```

#### Key Technologies
- **Discord.js v14** - Bot framework
- **Solana Web3.js** - Blockchain interaction
- **Express** - REST API server
- **WalletConnect v2** - Mobile wallet support
- **x402 Protocol** - Trustless agent implementation
- **Solana Pay** - Payment standard for QR codes & deep links

---

## 2. Kick Platform Integration Design

### 2.1 Kick-Specific Database Schema

**Already Created:** `db/migrations/003_kick_integration.sql`

#### New Tables (7 total)

1. **`kick_users`** - Kick user registry
   - `kick_user_id` (primary)
   - `kick_username`
   - `discord_user_id` (optional cross-platform linking)
   - `wallet_address`
   - Activity tracking fields

2. **`kick_channels`** - Channel configuration
   - `channel_id`, `channel_slug`
   - `streamer_kick_user_id`
   - `bot_enabled`, `minimum_tip_amount`
   - `tip_notifications_enabled`
   - JSONB settings for flexibility

3. **`kick_tips`** - Completed tips
   - Sender/recipient tracking
   - Channel context
   - Solana signature verification
   - Status tracking (completed/pending/failed/refunded)

4. **`kick_pending_tips`** - Unregistered user tips
   - 24-hour expiration system
   - Notification tracking

5. **`passkeys`** - WebAuthn/FIDO2 authentication
   - Platform-agnostic (Discord + Kick)
   - Hardware security key support
   - Biometric authentication

6. **`kick_oauth_tokens`** - Encrypted OAuth storage
   - AES-256 encrypted access/refresh tokens
   - Expiration tracking
   - Token rotation support

7. **`kick_registration_tokens`** - Temporary registration links
   - Time-limited wallet linking
   - One-time use tokens

#### Views & Functions
- **`kick_channel_leaderboard`** - Top tippers per channel
- **Cleanup functions** - Expired tips & tokens
- **Timestamp triggers** - Auto-update `updated_at`

### 2.2 Kick Command Mapping

| Discord Command | Kick Equivalent | Status | Notes |
|-----------------|-----------------|--------|-------|
| `/register-wallet` | `/tip-register` | 🔴 TODO | Use passkey for mobile-friendly auth |
| `/tip @user $5` | `!tip @username $5` | 🔴 TODO | Chat command (Kick doesn't have slash commands) |
| `/airdrop` | `!airdrop` | 🔴 TODO | Channel-scoped by default |
| `/my-airdrops` | `!my-airdrops` | 🔴 TODO | Show creator's airdrops |
| `/status` | `!tipstatus` | 🔴 TODO | Wallet & bot status |
| `/logs` | `!tiplogs` | 🔴 TODO | PM transaction history |
| `/help` | `!tiphelp` | 🔴 TODO | Command list |
| `/support` | `!tipsupport` | 🔴 TODO | Issue reporting |
| `/donate` | `!tipdonate` | 🔴 TODO | Developer support |

**Key Differences:**
- Kick uses chat commands (`!command`) instead of Discord slash commands (`/command`)
- Kick chat is channel-centric (always in streamer's channel)
- User mentions work differently (`@username` vs Discord's user ID)

### 2.3 Authentication Flow

#### Kick OAuth 2.1 Integration

```
1. User runs: !tip-register
2. Bot replies with registration link (in chat or DM)
3. User clicks link → Kick OAuth consent screen
4. Kick redirects to bot's callback URL with auth code
5. Bot exchanges code for access token
6. Bot stores encrypted token in kick_oauth_tokens table
7. User connects Solana wallet (same flow as Discord)
8. Bot associates kick_user_id ↔ wallet_address
9. Registration complete - user can now tip
```

**Security Requirements:**
- HTTPS-only callback URLs
- State parameter for CSRF protection
- PKCE (Proof Key for Code Exchange) for mobile security
- Token encryption at rest (AES-256-GCM)
- Automatic token refresh before expiration

#### Passkey Enhancement (Optional)

For streamers who want passwordless auth:
- WebAuthn/FIDO2 registration flow
- Hardware security key support
- Platform authenticator (Face ID, Touch ID, Windows Hello)
- Stored in `passkeys` table

---

## 3. Kick-Specific Features & Improvements

### 3.1 Channel Integration

**Streamer Dashboard Features:**
- Enable/disable bot per channel
- Set minimum tip amount
- Configure tip notification style
  - Silent (no chat message)
  - Minimal (username + amount)
  - Full (username + amount + message)
  - Animated (on-stream overlay via API)
- Tip leaderboard visibility settings
- Auto-thank donors in chat

**Implementation:**
```javascript
// Channel settings stored in kick_channels.settings (JSONB)
{
  "notifications": {
    "enabled": true,
    "style": "full", // silent|minimal|full|animated
    "threshold": 5.00, // Only show tips >= $5
    "sound": true
  },
  "leaderboard": {
    "enabled": true,
    "period": "monthly", // daily|weekly|monthly|alltime
    "top_n": 10
  },
  "auto_messages": {
    "thank_tipper": "Thanks {username} for the ${amount} tip! 💜",
    "first_time_tipper": "Welcome first-time tipper {username}! 🎉"
  }
}
```

### 3.2 Chat Commands (Kick-Specific)

Unlike Discord's slash commands, Kick uses traditional chat commands:

```
!tip @username $5 [message]       - Send tip to user
!tip-register                      - Start wallet registration
!tipstatus                         - Check wallet connection
!tiplogs                           - View your tip history (PM)
!airdrop $5 50 10m                - Create airdrop ($5 ea, 50 claims, 10 min)
!claim                            - Claim from active airdrop
!leaderboard                      - Show top tippers in channel
!tiphelp                          - Show command help
```

**Bot Mention Support:**
```
@JustTheTip tip @username $5      - Alternative syntax
```

### 3.3 Stream Integration APIs

**Kick API Endpoints to Use:**
- `GET /channels/{slug}` - Channel info & streamer details
- `GET /channels/{slug}/chatroom` - Chat room connection details
- `WebSocket /chatrooms/{id}` - Real-time chat events
- `POST /messages` - Send chat messages (bot responses)
- `GET /users/{username}` - User profile lookup

**Proposed Features:**
1. **On-Stream Alerts** (via Kick API if available)
   - Display tip notifications on stream overlay
   - Animated graphics for large tips
   - Text-to-speech for tip messages

2. **Chat Moderation Integration**
   - Tip-gated commands (must have tipped to use)
   - VIP status for top tippers
   - Auto-mod exceptions for donors

3. **Analytics Dashboard**
   - Total tips received per stream
   - Top tippers leaderboard
   - Tip velocity (tips per hour)
   - Geographic distribution (blockchain data)

### 3.4 Cross-Platform Features

**Discord ↔ Kick Linking:**
- Users can link Discord & Kick accounts
- Single wallet serves both platforms
- Cross-platform tip history
- Unified leaderboards

**Implementation:**
```sql
-- Link via kick_users.discord_user_id
UPDATE kick_users 
SET discord_user_id = '123456789' 
WHERE kick_user_id = 'kick_abc';

-- Query combined tips
SELECT 
  COALESCE(d.amount, 0) + COALESCE(k.amount, 0) as total_tipped
FROM discord_tips d
FULL OUTER JOIN kick_tips k ON d.wallet_address = k.wallet_address;
```

---

## 4. Security & Compliance

### 4.1 OAuth Token Security

**Encryption Strategy:**
```javascript
// Token encryption (AES-256-GCM)
const algorithm = 'aes-256-gcm';
const key = process.env.TOKEN_ENCRYPTION_KEY; // 32 bytes
const iv = crypto.randomBytes(16);

function encryptToken(token) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}
```

**Token Rotation:**
- Refresh tokens automatically before expiration
- Invalidate old tokens after rotation
- Log all token operations for audit trail

### 4.2 Rate Limiting

```javascript
// Per-user rate limits
const tipLimiter = {
  window: 60 * 1000,      // 1 minute
  max_tips: 5,            // 5 tips per minute
  max_amount: 500.00      // $500 max per minute
};

const registrationLimiter = {
  window: 3600 * 1000,    // 1 hour
  max_attempts: 3         // 3 registration attempts per hour
};
```

### 4.3 Anti-Abuse Measures

1. **Minimum Account Age** - Require Kick account to be 7+ days old
2. **Wallet Verification** - Require minimum 0.01 SOL balance
3. **Transaction Monitoring** - Flag suspicious patterns
4. **Channel Moderation** - Allow streamers to ban users from tipping
5. **Cooldown Periods** - 5-second cooldown between tips

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2) ⏳
- [x] Database schema creation (003_kick_integration.sql)
- [x] Setup script (scripts/kick-setup.js)
- [ ] Kick OAuth client implementation
- [ ] Token encryption service
- [ ] Basic user registration flow
- [ ] WebSocket chat connection

### Phase 2: Core Commands (Weeks 3-4)
- [ ] `!tip` command with USD → SOL conversion
- [ ] `!tip-register` with wallet connection
- [ ] `!tipstatus` and `!tiplogs`
- [ ] Pending tips system for unregistered users
- [ ] Transaction signature verification

### Phase 3: Advanced Features (Weeks 5-6)
- [ ] `!airdrop` and `!claim` commands
- [ ] Channel leaderboard (`!leaderboard`)
- [ ] Streamer dashboard (web UI)
- [ ] Channel settings (notifications, minimums)
- [ ] Cross-platform linking (Discord ↔ Kick)

### Phase 4: Polish & Launch (Weeks 7-8)
- [ ] On-stream alert integration
- [ ] Analytics dashboard
- [ ] Comprehensive testing
- [ ] Documentation for streamers
- [ ] Beta launch with select streamers
- [ ] Public launch

---

## 6. Discord Bot Audit & Improvements

### 6.1 Known Issues

✅ **Working Correctly:**
- Wallet registration flow
- Basic tipping functionality
- Airdrop creation & claiming
- Transaction tracking
- WalletConnect integration

⚠️ **Needs Testing:**
- Magic Link integration (`/register-magic`)
- Support ticket system (`/support`)
- Transaction log DMs (`/logs`)
- Multi-token support (USDC, BONK)
- Pending tips expiration cleanup

🔴 **Known Issues:**
- No automated cleanup of expired pending tips (manual SQL required)
- No transaction failure notifications
- Rate limiting not enforced on all commands
- Airdrop expiration doesn't auto-refund creator

### 6.2 Proposed Simplifications

#### Command Consolidation
```
Before:                    After:
/register-wallet      →    /wallet register
/disconnect-wallet    →    /wallet disconnect
/register-magic       →    /wallet magic <token>
                          /wallet status (replaces /status)
```

#### Unified Tip Management
```
Before:                    After:
/tip                  →    /tip send @user $5
/logs                 →    /tip history
                          /tip pending (show unclaimed tips)
```

#### Airdrop Improvements
```
/airdrop create $5 100 24h "Happy holidays!"
/airdrop list              (replaces /my-airdrops)
/airdrop cancel <id>       (new - refund & close)
/airdrop stats <id>        (new - claims analytics)
```

#### Better Error Messages
- Add "Try `/help <command>`" to all error messages
- Include troubleshooting tips inline
- Link to FAQ for common issues

### 6.3 Code Quality Improvements

**Add Missing Tests:**
```javascript
// tests/commands/tip.test.js
describe('Tip Command', () => {
  test('prevents self-tipping', async () => {
    // Test implementation
  });
  
  test('validates USD amount range', async () => {
    // Test $0.10 - $100.00 validation
  });
  
  test('requires wallet registration', async () => {
    // Test unregistered user rejection
  });
});
```

**Better Error Handling:**
```javascript
// Wrap all blockchain calls in try-catch
try {
  const signature = await sendTransaction();
  await confirmTransaction(signature);
} catch (error) {
  if (error.message.includes('insufficient funds')) {
    return reply('❌ Insufficient SOL balance. Need at least 0.01 SOL for transaction fees.');
  }
  // Log error for debugging
  logger.error('Transaction failed', { error, userId, amount });
  return reply('❌ Transaction failed. Please try again or contact support.');
}
```

---

## 7. API Endpoints Specification

### 7.1 Kick Registration Flow

```http
POST /api/kick/auth/register
Content-Type: application/json

{
  "kick_user_id": "12345",
  "kick_username": "streamername",
  "oauth_code": "ABC123...",
  "state": "csrf_token"
}

Response:
{
  "success": true,
  "registration_token": "reg_XYZ789",
  "wallet_registration_url": "https://justthetip.vercel.app/sign.html?token=reg_XYZ789"
}
```

### 7.2 Channel Configuration

```http
GET /api/kick/channels/{channel_id}/settings
Authorization: Bearer {kick_oauth_token}

Response:
{
  "channel_id": "123",
  "channel_slug": "streamername",
  "bot_enabled": true,
  "minimum_tip_amount": 1.00,
  "notifications": {
    "enabled": true,
    "style": "full",
    "threshold": 5.00
  },
  "leaderboard": {
    "enabled": true,
    "period": "monthly"
  }
}
```

```http
PATCH /api/kick/channels/{channel_id}/settings
Authorization: Bearer {kick_oauth_token}
Content-Type: application/json

{
  "minimum_tip_amount": 5.00,
  "notifications": {
    "style": "animated"
  }
}
```

### 7.3 Tipping API

```http
POST /api/kick/tips
Authorization: Bearer {kick_oauth_token}
Content-Type: application/json

{
  "sender_kick_user_id": "12345",
  "recipient_username": "streamername",
  "amount_usd": 5.00,
  "message": "Great stream!",
  "channel_id": "123"
}

Response:
{
  "success": true,
  "tip_id": "tip_ABC123",
  "solana_pay_url": "solana:Hxro2N2vJe7bRxChMAWWQuqgmgqYLdCDZ3oBZCz6oUxA?amount=...",
  "amount_sol": 0.0234,
  "sol_price_usd": 213.50,
  "signature": null,  // Set after user confirms
  "status": "pending"
}
```

---

## 8. Testing Plan

### 8.1 Unit Tests

```bash
npm test -- tests/kick/
```

**Coverage Requirements:**
- Kick OAuth flow: 90%+
- Tip command handlers: 95%+
- Database operations: 85%+
- Token encryption: 100%

### 8.2 Integration Tests

1. **End-to-End Registration**
   - User clicks registration link
   - Completes OAuth
   - Connects wallet
   - Appears in `kick_users` table

2. **End-to-End Tipping**
   - User A tips User B
   - Transaction confirmed on-chain
   - Tip recorded in database
   - Both users notified

3. **Airdrop Flow**
   - Creator makes airdrop
   - Multiple users claim
   - Max claims enforced
   - Expiration works correctly

### 8.3 Load Testing

**Scenarios:**
- 100 simultaneous tips per minute
- 1000 chat commands per second
- 50 concurrent wallet registrations
- Database query performance under load

**Tools:**
- Artillery.io for API load testing
- k6 for WebSocket stress testing
- PostgreSQL EXPLAIN ANALYZE for query optimization

---

## 9. Documentation Requirements

### 9.1 User Documentation

- **Kick Streamer Guide** - How to add bot to channel
- **Tipper Guide** - How to register & send tips
- **FAQ** - Common issues & solutions
- **Video Tutorials** - Screen recordings for visual learners

### 9.2 Developer Documentation

- **API Reference** - All endpoints with examples
- **WebSocket Events** - Chat message format
- **Database Schema** - ERD diagrams
- **Deployment Guide** - Railway/Heroku setup
- **Contributing Guide** - How to submit PRs

---

## 10. Monitoring & Analytics

### 10.1 Metrics to Track

**Business Metrics:**
- Total tips volume (USD)
- Active users (daily/monthly)
- Average tip amount
- Retention rate (repeat tippers)
- Channel adoption rate

**Technical Metrics:**
- API response time (p50, p95, p99)
- Database query latency
- WebSocket connection stability
- Transaction success rate
- Error rate by endpoint

**Blockchain Metrics:**
- Average transaction confirmation time
- Gas fees paid
- Failed transactions
- Wallet registration success rate

### 10.2 Alerting

**Critical Alerts (PagerDuty):**
- Database connection failures
- Solana RPC downtime
- OAuth token service errors
- Transaction failure rate > 5%

**Warning Alerts (Slack):**
- High API latency (>500ms)
- Increased error rate
- Low SOL balance in operational wallet
- Expired tokens not refreshing

---

## 11. Cost Analysis

### 11.1 Infrastructure Costs

| Service | Provider | Monthly Cost | Notes |
|---------|----------|--------------|-------|
| Bot Hosting | Railway | $5-20 | Based on usage |
| API Hosting | Vercel | $0-20 | Free tier likely sufficient |
| Database | Supabase | $0-25 | Free tier → Pro as needed |
| Solana RPC | Helius | $0-100 | Free tier → Growth |
| Monitoring | Sentry | $0-26 | Developer plan |
| **Total** | | **$5-191/mo** | Scales with usage |

### 11.2 Transaction Costs

- **Solana Transaction Fee:** ~0.000005 SOL ($0.001 @ $200/SOL)
- **Bot's Cost Per Tip:** $0.001 (negligible)
- **Monthly at 10K tips:** $10 in transaction fees

**Revenue Model Options:**
1. **Donation-based** - Voluntary tips to bot wallet
2. **Premium Features** - Channel analytics dashboard ($5/mo)
3. **Transaction Fee** - 1% fee on tips (opt-in for premium features)

---

## 12. Success Metrics

### 12.1 Launch Goals (Month 1)

- [ ] 10+ streamers actively using bot
- [ ] 100+ registered users
- [ ] $500+ in total tips volume
- [ ] 99% uptime
- [ ] <500ms average response time

### 12.2 Growth Goals (Month 3)

- [ ] 50+ active channels
- [ ] 1,000+ registered users
- [ ] $10,000+ in tips volume
- [ ] 5+ cross-platform users (Discord + Kick)
- [ ] Positive user feedback (NPS > 50)

### 12.3 Long-Term Vision (Year 1)

- [ ] Multi-platform support (Twitch, YouTube Live)
- [ ] Mobile app for tippers
- [ ] NFT badge rewards for top tippers
- [ ] Multi-currency support (USDC, BONK, ETH)
- [ ] Fiat on-ramp integration (Coinbase Commerce)

---

## Appendix A: Environment Variables

```bash
# Kick API Configuration
KICK_CLIENT_ID=your_kick_client_id
KICK_CLIENT_SECRET=your_kick_client_secret
KICK_REDIRECT_URI=https://api.yourbot.com/kick/auth/callback

# Token Encryption
TOKEN_ENCRYPTION_KEY=your_32_byte_base64_key

# Passkey Configuration (Optional)
PASSKEY_RP_NAME="JustTheTip Bot"
PASSKEY_RP_ID="yourbot.com"
PASSKEY_ORIGIN=https://yourbot.com

# Existing Solana/Discord vars (unchanged)
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
DISCORD_BOT_TOKEN=...
# ... etc
```

---

## Appendix B: Kick API Resources

**Official Documentation:**
- OAuth 2.1: https://dev.kick.com/oauth
- REST API: https://dev.kick.com/api
- WebSocket Chat: https://dev.kick.com/chat

**Community Resources:**
- Kick Bot Library: https://github.com/kick-community/kick-bot-js
- Chat Message Parser: https://github.com/kick-chat/parser

---

## Appendix C: Migration Checklist

For streamers migrating from other tip bots:

- [ ] Export existing tip history (if possible)
- [ ] Import to JustTheTip database
- [ ] Notify community of bot change
- [ ] Update chat commands in channel description
- [ ] Test bot with small tips first
- [ ] Gradually increase minimum tip amount
- [ ] Monitor for issues during first week
- [ ] Collect feedback from community

---

## Conclusion

This plan provides a comprehensive roadmap for integrating JustTheTip with Kick.com while maintaining feature parity with Discord and adding platform-specific enhancements. The modular approach allows for iterative development and testing.

**Next Steps:**
1. Review and approve this plan
2. Set up Kick Developer Account
3. Begin Phase 1 implementation
4. Recruit beta testers (streamers)
5. Launch MVP within 8 weeks

---

**Document Owner:** JustTheTip Development Team  
**Last Updated:** 2025-11-15  
**Version:** 1.0
