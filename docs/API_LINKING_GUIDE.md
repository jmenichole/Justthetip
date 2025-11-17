# JustTheTip API Linking - Complete Guide for Discord Bot Developers

## Overview

JustTheTip's API Linking feature allows other Discord bot developers (like those behind Rumbles, Degens Against Decency, and similar community bots) to integrate powerful tipping functionality into their own bots **without building the infrastructure themselves**.

This is a **premium B2B monetized feature** that provides a complete API for tips, airdrops, trivia drops, and wallet management.

---

## 🎯 What Can You Build?

With JustTheTip's API, you can add these features to your bot:

- **Tip Users**: Let your users send SOL tips through your bot
- **Bulk Tips**: Tip multiple users at once (e.g., tournament winners)
- **Airdrops**: Distribute tokens to qualified users
- **Triviadrops**: Run trivia games with crypto prizes
- **Wallet Management**: Check balances, transaction history
- **Analytics**: Track tipping patterns, user engagement
- **Webhooks**: Get real-time notifications of transactions

### Example Use Cases

**🎮 Gaming Bots (e.g., Rumbles)**
- Tip winners of matches or tournaments
- Prize pools for competitions
- Reward active players

**🎲 Entertainment Bots (e.g., Degens Against Decency)**
- Reward engagement in games
- Community challenges with prizes
- Fun tipping mechanics

**💼 Community Management Bots**
- Reward helpful community members
- Incentivize engagement
- Moderate rewards

---

## 💰 Pricing Tiers

### Developer Tier - $4.99/month
Perfect for small bots or testing

**Rate Limits:**
- 60 requests/minute
- 1,000 requests/hour
- 10,000 requests/day
- 5 concurrent requests

**Features:**
- ✅ Basic tip operations
- ✅ Balance checking
- ✅ Transaction history
- ✅ Webhook support
- ✅ Email support
- ✅ API documentation

**Best For:** Small community bots, testing, personal projects

---

### Business Tier - $9.99/month
For established bots with active communities

**Rate Limits:**
- 300 requests/minute
- 10,000 requests/hour
- 100,000 requests/day
- 20 concurrent requests

**Features:**
- ✅ All Developer features
- ✅ Bulk tip operations
- ✅ Airdrop creation
- ✅ Scheduled operations
- ✅ Analytics dashboard
- ✅ Priority support
- ✅ 99.5% uptime SLA

**Best For:** Popular bots with 1,000+ users, gaming communities, NFT projects

---

### Enterprise Tier - Custom Pricing
For large-scale operations

**Rate Limits:**
- 1,000 requests/minute
- 50,000 requests/hour
- 1,000,000 requests/day
- 100 concurrent requests

**Features:**
- ✅ All Business features
- ✅ Triviadrop creation
- ✅ White-label options
- ✅ Custom integrations
- ✅ Dedicated account manager
- ✅ 99.9% uptime SLA
- ✅ Custom rate limits
- ✅ Advanced analytics
- ✅ Priority transaction processing

**Best For:** Large bots with 10,000+ users, professional projects, multi-bot networks

---

## 🚀 Quick Start

### 1. Get API Credentials

In Discord (requires Premium subscription):

```
/api-link create bot_id:YOUR_BOT_ID bot_name:YOUR_BOT_NAME tier:developer
```

You'll receive:
- **API Key**: `jtt_abc123...`
- **API Secret**: `secret_xyz789...`
- **Webhook Secret**: `whsec_def456...`

⚠️ **IMPORTANT**: Save these immediately! They won't be shown again.

### 2. Store Credentials Securely

Add to your bot's `.env` file:

```env
JUSTTHETIP_API_KEY=jtt_abc123...
JUSTTHETIP_API_SECRET=secret_xyz789...
JUSTTHETIP_WEBHOOK_SECRET=whsec_def456...
```

### 3. Make Your First API Call

**Example: Send a Tip**

```javascript
const axios = require('axios');

async function sendTip(fromUserId, toUserId, amount) {
  try {
    const response = await axios.post('https://api.justthetip.bot/api/v1/tip', {
      from_user_id: fromUserId,
      to_user_id: toUserId,
      amount: amount,
      currency: 'SOL',
      message: 'Great job!'
    }, {
      headers: {
        'X-API-Key': process.env.JUSTTHETIP_API_KEY,
        'X-API-Secret': process.env.JUSTTHETIP_API_SECRET,
        'Content-Type': 'application/json'
      }
    });

    console.log('Tip sent!', response.data);
    return response.data;
  } catch (error) {
    console.error('Tip failed:', error.response?.data || error.message);
  }
}

// Usage in your Discord bot
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!tip')) {
    const args = message.content.split(' ');
    const userId = args[1].replace(/[<@!>]/g, '');
    const amount = parseFloat(args[2]);

    await sendTip(message.author.id, userId, amount);
    message.reply('✅ Tip sent!');
  }
});
```

---

## 📚 API Reference

### Base URL
```
https://api.justthetip.bot
```

### Authentication
All requests require headers:
```
X-API-Key: your_api_key
X-API-Secret: your_api_secret
```

---

### Endpoints

#### 1. Send Tip
```http
POST /api/v1/tip
```

**Request Body:**
```json
{
  "from_user_id": "123456789",
  "to_user_id": "987654321",
  "amount": 0.5,
  "currency": "SOL",
  "message": "Great work!"
}
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "tx_abc123",
  "transaction_signature": "5KJp...",
  "amount": 0.5,
  "currency": "SOL",
  "timestamp": "2025-11-17T10:00:00Z"
}
```

---

#### 2. Bulk Tips (Business+)
```http
POST /api/v1/tip/bulk
```

**Request Body:**
```json
{
  "from_user_id": "123456789",
  "recipients": ["111111111", "222222222", "333333333"],
  "amount_per_user": 1.0,
  "message": "Tournament winners!"
}
```

**Response:**
```json
{
  "success": true,
  "total_sent": 3,
  "failed": 0,
  "transactions": [
    {"user_id": "111111111", "status": "success", "tx_id": "tx_1"},
    {"user_id": "222222222", "status": "success", "tx_id": "tx_2"},
    {"user_id": "333333333", "status": "success", "tx_id": "tx_3"}
  ]
}
```

---

#### 3. Get Balance
```http
GET /api/v1/balance/:user_id
```

**Response:**
```json
{
  "success": true,
  "user_id": "123456789",
  "balance": 5.25,
  "currency": "SOL",
  "wallet_address": "ABC123...",
  "timestamp": "2025-11-17T10:00:00Z"
}
```

---

#### 4. Transaction History
```http
GET /api/v1/history/:user_id?limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "user_id": "123456789",
  "transactions": [
    {
      "id": "tx_1",
      "type": "sent",
      "amount": 0.5,
      "to_user_id": "987654321",
      "timestamp": "2025-11-17T09:00:00Z"
    }
  ],
  "total": 150
}
```

---

#### 5. Create Airdrop (Business+)
```http
POST /api/v1/airdrop
```

**Request Body:**
```json
{
  "from_user_id": "123456789",
  "amount_per_user": 0.1,
  "qualifiers": [
    {"type": "role", "role_id": "555555555"},
    {"type": "active", "min_messages": 10}
  ],
  "max_recipients": 100
}
```

---

#### 6. Setup Webhooks
```http
POST /api/v1/webhook/setup
```

**Request Body:**
```json
{
  "webhook_url": "https://your-bot.com/webhook",
  "events": ["tip.completed", "airdrop.completed"]
}
```

**Webhook Payload Example:**
```json
{
  "event": "tip.completed",
  "data": {
    "transaction_id": "tx_abc123",
    "from_user_id": "123456789",
    "to_user_id": "987654321",
    "amount": 0.5,
    "timestamp": "2025-11-17T10:00:00Z"
  },
  "signature": "hmac_sha256_signature"
}
```

---

## 🛡️ Security Best Practices

### 1. Store Credentials Securely
```javascript
// ❌ DON'T: Hardcode credentials
const API_KEY = 'jtt_abc123...';

// ✅ DO: Use environment variables
const API_KEY = process.env.JUSTTHETIP_API_KEY;
```

### 2. Verify Webhook Signatures
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### 3. Handle Rate Limits
```javascript
async function callAPIWithRetry(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

---

## 📊 Monitoring & Analytics

### Check API Usage
```
/api-link usage api_key:YOUR_KEY period:month
```

Returns:
- Total requests
- Success rate
- Transaction volume
- Top endpoints used

### View Real-Time Status
```
/api-link status api_key:YOUR_KEY
```

---

## 💡 Example Integrations

### Gaming Bot - Tournament Rewards

```javascript
// After tournament ends
async function rewardTournamentWinners(winners) {
  const prizePool = 10; // 10 SOL total
  const prizePerWinner = prizePool / winners.length;

  const result = await axios.post('https://api.justthetip.bot/api/v1/tip/bulk', {
    from_user_id: TOURNAMENT_ORGANIZER_ID,
    recipients: winners.map(w => w.userId),
    amount_per_user: prizePerWinner,
    message: '🏆 Tournament winner! Congratulations!'
  }, {
    headers: {
      'X-API-Key': process.env.JUSTTHETIP_API_KEY,
      'X-API-Secret': process.env.JUSTTHETIP_API_SECRET
    }
  });

  return result.data;
}
```

### Community Bot - Daily Active Rewards

```javascript
// Reward active community members daily
async function rewardActiveMembers() {
  const activeUsers = await getActiveUsersToday(); // Your logic

  const result = await axios.post('https://api.justthetip.bot/api/v1/airdrop', {
    from_user_id: COMMUNITY_WALLET_ID,
    amount_per_user: 0.05,
    qualifiers: [
      { type: 'active', min_messages: 10 },
      { type: 'role', role_id: MEMBER_ROLE_ID }
    ],
    max_recipients: 50
  }, {
    headers: {
      'X-API-Key': process.env.JUSTTHETIP_API_KEY,
      'X-API-Secret': process.env.JUSTTHETIP_API_SECRET
    }
  });

  return result.data;
}
```

---

## 🆘 Support

### Developer Support (Included)
- **Email**: api-support@justthetip.bot
- **Response Time**: Within 24 hours
- **Documentation**: https://docs.justthetip.bot

### Business Support (Priority)
- **Email**: priority@justthetip.bot
- **Discord**: Private support channel
- **Response Time**: Within 4 hours

### Enterprise Support (Dedicated)
- **Dedicated Account Manager**
- **Private Slack/Discord channel**
- **Phone support available**
- **Response Time**: Within 1 hour

---

## 🔄 Migration Guide

### From Manual Integration

If you built your own tipping system, here's how to migrate:

**Before (Your Code):**
```javascript
// Your custom wallet system
const wallet = await createWallet(userId);
await sendSOL(fromWallet, toWallet, amount);
await trackTransaction(fromUser, toUser, amount);
```

**After (JustTheTip API):**
```javascript
// Just one API call
await axios.post('https://api.justthetip.bot/api/v1/tip', {
  from_user_id: fromUserId,
  to_user_id: toUserId,
  amount: amount
}, { headers: { ... } });
```

**Benefits:**
- ✅ No wallet management needed
- ✅ No transaction tracking needed
- ✅ No security concerns
- ✅ Automatic fee optimization
- ✅ Built-in analytics

---

## 📈 Scaling Your Integration

### Tips for High-Volume Bots

1. **Use Bulk Operations**: Batch tips together when possible
2. **Implement Caching**: Cache balance checks for 1-2 minutes
3. **Queue Requests**: Don't overwhelm the API with simultaneous calls
4. **Monitor Usage**: Track your API usage to avoid rate limits
5. **Upgrade Tier**: Move to Business/Enterprise as you grow

### Performance Benchmarks

| Tier | Recommended Users | Max Throughput |
|------|-------------------|----------------|
| Developer | <1,000 | 1 tip/sec |
| Business | 1,000-10,000 | 5 tips/sec |
| Enterprise | 10,000+ | 15+ tips/sec |

---

## ❓ FAQ

**Q: Do I need to handle wallets?**
A: No! JustTheTip manages all wallets automatically.

**Q: What about transaction fees?**
A: JustTheTip handles all fees. Your users pay max $0.07 per transaction (usually ~$0.005).

**Q: Can I white-label it?**
A: Yes, with Enterprise tier. Your users won't see JustTheTip branding.

**Q: What if my bot is in multiple servers?**
A: One API key works across all servers. Your rate limits apply globally.

**Q: Can I test before subscribing?**
A: Contact us for a 7-day free trial: api-support@justthetip.bot

**Q: Do you support other chains?**
A: Currently Solana only. More chains coming soon!

---

## 🎉 Ready to Get Started?

1. **Subscribe to Premium**: Choose your tier
2. **Create API Credentials**: `/api-link create`
3. **Read the Docs**: https://docs.justthetip.bot
4. **Build Something Awesome**: Integrate tipping into your bot!

**Need Help?** Join our developer Discord: https://discord.gg/justthetip-dev

---

*Made with 💜 by the JustTheTip team*
