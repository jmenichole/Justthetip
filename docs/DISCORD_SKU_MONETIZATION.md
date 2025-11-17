# Discord SKU Monetization Setup Guide

## Overview
JustTheTip uses Discord's native monetization features (SKUs - Stock Keeping Units) to offer premium features without extracting fees from user transactions.

## Revenue Model Philosophy
**Core Principle:** Keep transaction fees under $0.07 for free users, $0 for premium users.

### Fee Breakdown
| User Tier | Network Fee | Bot Fee | Total Fee | Who Pays Network Fee |
|-----------|-------------|---------|-----------|---------------------|
| Free | ~$0.005 | $0 | ~$0.005 | User |
| Premium | ~$0.005 | $0 | $0 | Bot (covered by subscription) |
| Optional Model | ~$0.005 | 0.5% (max $0.065) | Max $0.07 | User (free) / Bot (premium) |

## Discord SKU Setup

### 1. Monthly Subscriptions

#### Premium ($4.99/month)
**Target Audience:** Individual users who want enhanced features  
**Discord Revenue Share:** 10% ($0.50)  
**Your Revenue:** 90% ($4.49)

**Features:**
- ✅ Private tip announcements (no public notifications)
- ✅ Custom triviadrop timers (10-120 seconds)
- ✅ Fee-free transactions (bot covers network fees)
- ✅ Priority support
- ✅ Custom tip messages
- ✅ Up to 20 triviadrop rounds
- ✅ Up to 50 winners per round
- ✅ Advanced airdrop qualifiers
- ✅ Remove "Powered by JustTheTip" footer

**Implementation:**
```javascript
// Discord Developer Portal Setup
{
  name: "JustTheTip Premium",
  type: "SUBSCRIPTION",
  interval: "MONTH",
  price: 4.99,
  currency: "USD",
  sku_flags: ["AVAILABLE_FOR_PURCHASE"]
}
```

#### Pro ($9.99/month)
**Target Audience:** Power users, community managers  
**Your Revenue:** $8.99/month

**Additional Features:**
- All Premium features
- Bulk tips (multiple users at once)
- Scheduled tips and airdrops
- Custom bot branding
- Transaction analytics dashboard
- CSV export
- Unlimited triviadrop rounds/winners
- Priority transaction processing
- Dedicated account manager

### 2. Consumable Purchases (One-time, depletes)

#### Fee-Free Tip Bundles
```
- 10 tips: $0.99 (saves ~$0.05 in fees)
- 50 tips: $3.99 (saves ~$0.25 in fees) ⭐ Best Value
```

**Use Case:** Users who occasionally want fee-free tips without monthly subscription

#### Private Tip Bundles
```
- 25 private tips: $1.99
```

**Use Case:** Users who want privacy for specific occasions (birthdays, special events)

#### Priority Support Tickets
```
- 1 ticket: $4.99
```

**Use Case:** Urgent issues requiring immediate attention

### 3. Durable Purchases (One-time, permanent)

#### Custom Embed Colors ($2.99)
Permanently customize tip announcement colors to match your brand

#### Vanity Wallet Tag ($4.99)
Get a custom tag like @whale, @generous, @cryptoknight

## Implementation Guide

### Step 1: Register Discord SKUs

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Navigate to "Monetization" tab
4. Create each SKU with details above
5. Note the SKU IDs for your code

### Step 2: Implement Entitlement Checking

```javascript
const { checkPremiumFeature, useConsumable } = require('./src/config/discordSKUs');

// Check subscription feature
const hasPrivateTips = await checkPremiumFeature(userId, 'private_tips', database);

// Use consumable
const usedConsumable = await useConsumable(userId, 'fee_free_tips', database);
```

### Step 3: Database Schema

```sql
-- User premium status
CREATE TABLE user_premium (
  user_id VARCHAR(255) PRIMARY KEY,
  tier VARCHAR(50), -- 'premium_monthly' or 'pro_monthly'
  sku_id VARCHAR(255),
  started_at TIMESTAMP,
  expires_at TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Consumable balances
CREATE TABLE user_consumables (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  feature VARCHAR(50), -- 'fee_free_tips', 'private_tips'
  balance INTEGER DEFAULT 0,
  purchased_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Durable purchases
CREATE TABLE user_durables (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  feature VARCHAR(50), -- 'custom_colors', 'vanity_tag'
  purchased_at TIMESTAMP,
  settings JSONB, -- Feature-specific settings
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### Step 4: Discord Webhook Integration

```javascript
// Handle Discord entitlement events
app.post('/discord/webhooks', async (req, res) => {
  const { type, data } = req.body;
  
  switch (type) {
    case 'ENTITLEMENT_CREATE':
      // User purchased/subscribed
      await grantEntitlement(data.user_id, data.sku_id);
      break;
      
    case 'ENTITLEMENT_UPDATE':
      // Subscription renewed
      await updateEntitlement(data.user_id, data.sku_id);
      break;
      
    case 'ENTITLEMENT_DELETE':
      // Subscription cancelled/expired
      await revokeEntitlement(data.user_id, data.sku_id);
      break;
  }
  
  res.sendStatus(200);
});
```

## Pricing Strategy

### Why These Prices?

**Premium at $4.99:**
- Affordable for most users
- Covers fee-free transactions (avg ~$0.005 per tip)
- Need ~10-15 tips/month to break even on fees alone
- Value proposition clear vs buying consumables

**Pro at $9.99:**
- 2x Premium price for 10x features
- Targets high-volume users
- Analytics and bulk operations justify price
- Community manager use case

**Consumables at <$5:**
- Impulse purchase price point
- Alternative to subscription for casual users
- Good for trying before subscribing
- Gift-able (future feature)

### Break-Even Analysis

**Monthly Costs:**
```
Infrastructure: $50/month (estimated)
  - Database: $20
  - API hosting: $20
  - Monitoring: $10

Break-even subscribers: 10-15 Premium users
Revenue at 100 Premium users: ~$450/month
Profit margin at 100 users: ~88% ($400 profit)
```

### Scaling

At different user counts:
- 50 Premium: $225/month revenue, $175 profit
- 100 Premium: $450/month revenue, $400 profit
- 500 Premium: $2,250/month revenue, $2,200 profit
- 1000 Premium: $4,500/month revenue, $4,450 profit

## Additional Premium Features (Suggested)

### Cosmetic ($0 cost to implement)
- Custom emoji reactions
- Animated announcements
- Profile badges
- Custom sounds
- Leaderboard highlighting

### Utility (Low cost)
- Transaction receipts via DM
- Auto-generated reports
- Tax export (CSV/PDF)
- Budget limits & alerts
- Transaction scheduling

### Social (Medium cost)
- Private tipping groups
- Leaderboards
- Achievement badges
- Tipping streaks
- Social verification badges

### Advanced (Higher cost)
- API access
- Webhook notifications
- White-label instances
- Custom integrations

## Marketing Recommendations

### Value Messaging
1. **"Save on fees"** - Emphasize fee-free transactions
2. **"Privacy matters"** - Private tips for sensitive moments
3. **"Support the bot"** - Help keep it free for everyone
4. **"Premium features"** - Unlock advanced capabilities

### Conversion Funnel
1. User tries free tier → loves it
2. Hits free tier limitation (public tips, 30s timer)
3. Sees upgrade prompt with clear value
4. Converts to Premium ($4.99) or buys consumable ($0.99)
5. Later upgrades to Pro ($9.99) for advanced features

### Upsell Opportunities
- After 10 tips: "You've saved $0.50 in fees! Upgrade to Premium for unlimited fee-free tips"
- After triviadrop: "Want custom timers? Try Premium for $4.99/month"
- In DMs: "Want private tips? Get 25 for just $1.99"

## Legal & Compliance

### Discord Terms of Service
- ✅ No gambling or lottery features
- ✅ No NFT minting (optional, not required)
- ✅ Clear pricing and feature descriptions
- ✅ Proper refund policy
- ✅ No misleading claims

### Refund Policy (Suggested)
```
Subscriptions: Cancel anytime, no refunds for partial months
Consumables: No refunds after use, full refund if unused within 48 hours
Durables: No refunds after 48 hours
```

## Success Metrics

### Key Performance Indicators
- **Conversion Rate:** % of free users who subscribe (Target: 5-10%)
- **ARPU:** Average Revenue Per User (Target: $1-2/month across all users)
- **LTV:** Lifetime Value (Target: $50-100)
- **Churn Rate:** % who cancel (Target: <10%/month)
- **Consumable Purchase Rate:** % who buy at least one (Target: 15-20%)

### Monitoring
```javascript
// Track conversions
await analytics.track('premium_upgrade', {
  user_id: userId,
  from_tier: 'free',
  to_tier: 'premium_monthly',
  revenue: 4.99
});

// Track feature usage
await analytics.track('feature_used', {
  user_id: userId,
  feature: 'private_tips',
  tier: 'premium'
});
```

## Conclusion

This monetization strategy:
- ✅ Keeps transaction fees under $0.07 (meets requirement)
- ✅ Provides clear value to premium users
- ✅ Maintains free tier usability
- ✅ Creates sustainable revenue
- ✅ Scales profitably
- ✅ Respects user trust (no hidden fees)

Start with Premium tier and Fee-Free bundles. Add Pro tier once you have 50+ Premium subscribers. Introduce durables and additional consumables based on user feedback.
