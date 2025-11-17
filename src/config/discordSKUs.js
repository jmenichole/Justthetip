/**
 * JustTheTip - Discord SKU Configuration
 * Monetized premium features setup for Discord
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

/**
 * Discord SKU (Stock Keeping Unit) Configuration
 * These are the premium subscription tiers and one-time purchases
 */

const DISCORD_SKUS = {
  // Monthly Subscriptions
  subscriptions: {
    premium_monthly: {
      sku_id: 'justthetip_premium_month',
      name: 'JustTheTip Premium',
      description: 'Unlock premium features: private tips, custom timers, fee-free transactions, and more',
      price: 4.99, // Discord's 90/10 split (Bot gets $4.49)
      currency: 'USD',
      type: 'subscription',
      interval: 'monthly',
      features: [
        'Private tip announcements (no public notifications)',
        'Custom triviadrop timers (10-120 seconds)',
        'Fee-free transactions (bot covers network fees)',
        'Priority support',
        'Custom tip messages',
        'Up to 20 triviadrop rounds',
        'Up to 50 winners per round',
        'Advanced airdrop qualifiers (tipping history, tenure, etc.)',
        'Remove "Powered by JustTheTip" footer from embeds'
      ],
      limits: {
        private_tips: true,
        custom_timers: true,
        fee_free: true,
        max_triviadrop_rounds: 20,
        max_winners_per_round: 50,
        airdrop_qualifiers: ['all']
      }
    },

    pro_monthly: {
      sku_id: 'justthetip_pro_month',
      name: 'JustTheTip Pro',
      description: 'For power users and community managers',
      price: 9.99, // Discord's 90/10 split (Bot gets $8.99)
      currency: 'USD',
      type: 'subscription',
      interval: 'monthly',
      features: [
        'All Premium features',
        'Bulk tips (tip multiple users at once)',
        'Scheduled tips and airdrops',
        'Custom bot branding (avatar, name in embeds)',
        'Transaction analytics dashboard',
        'CSV export of all transactions',
        'Unlimited triviadrop rounds',
        'Unlimited winners per round',
        'Priority transaction processing',
        'Dedicated account manager'
      ],
      limits: {
        private_tips: true,
        custom_timers: true,
        fee_free: true,
        bulk_tips: true,
        scheduled_operations: true,
        custom_branding: true,
        analytics_dashboard: true,
        max_triviadrop_rounds: 999,
        max_winners_per_round: 999,
        airdrop_qualifiers: ['all']
      }
    }
  },

  // One-time Purchases (Consumables)
  consumables: {
    fee_free_bundle_10: {
      sku_id: 'justthetip_feefree_10',
      name: 'Fee-Free Bundle (10 tips)',
      description: 'Get 10 fee-free tips - we cover the network fees',
      price: 0.99,
      currency: 'USD',
      type: 'consumable',
      quantity: 10,
      feature: 'fee_free_tips'
    },

    fee_free_bundle_50: {
      sku_id: 'justthetip_feefree_50',
      name: 'Fee-Free Bundle (50 tips)',
      description: 'Get 50 fee-free tips - best value!',
      price: 3.99,
      currency: 'USD',
      type: 'consumable',
      quantity: 50,
      feature: 'fee_free_tips'
    },

    private_tip_bundle_25: {
      sku_id: 'justthetip_private_25',
      name: 'Private Tips Bundle (25 tips)',
      description: 'Send 25 tips privately without public announcements',
      price: 1.99,
      currency: 'USD',
      type: 'consumable',
      quantity: 25,
      feature: 'private_tips'
    },

    priority_support_ticket: {
      sku_id: 'justthetip_support',
      name: 'Priority Support Ticket',
      description: 'Get priority support for urgent issues',
      price: 4.99,
      currency: 'USD',
      type: 'consumable',
      quantity: 1,
      feature: 'priority_support'
    }
  },

  // One-time Purchases (Durables)
  durables: {
    custom_embed_color: {
      sku_id: 'justthetip_color',
      name: 'Custom Embed Colors',
      description: 'Permanently customize your tip announcement colors',
      price: 2.99,
      currency: 'USD',
      type: 'durable',
      feature: 'custom_colors'
    },

    vanity_wallet_tag: {
      sku_id: 'justthetip_vanity',
      name: 'Vanity Wallet Tag',
      description: 'Get a custom vanity tag for your wallet (e.g., @whale, @generous)',
      price: 4.99,
      currency: 'USD',
      type: 'durable',
      feature: 'vanity_tag'
    }
  },

  // API Linking Subscriptions (B2B for Bot Developers)
  api_linking: {
    api_developer_monthly: {
      sku_id: 'justthetip_api_developer',
      name: 'JustTheTip API - Developer',
      description: 'API access for bot developers: Basic endpoints, 60 req/min, 10K req/day',
      price: 4.99, // Same as Premium (includes Premium features)
      currency: 'USD',
      type: 'subscription',
      interval: 'monthly',
      features: [
        'All Premium user features included',
        'API access for your Discord bot',
        'Basic tip operations via API',
        'Balance checking and history',
        'Webhook support',
        '60 requests/minute',
        '10,000 requests/day',
        'Email support',
        'API documentation access'
      ],
      rate_limits: {
        requests_per_minute: 60,
        requests_per_hour: 1000,
        requests_per_day: 10000,
        concurrent_requests: 5
      },
      endpoints: [
        'POST /api/v1/tip',
        'GET /api/v1/balance',
        'GET /api/v1/history',
        'POST /api/v1/webhook/setup',
        'GET /api/v1/user/stats'
      ]
    },

    api_business_monthly: {
      sku_id: 'justthetip_api_business',
      name: 'JustTheTip API - Business',
      description: 'API access for established bots: Bulk operations, 300 req/min, 100K req/day',
      price: 9.99, // Same as Pro (includes Pro features)
      currency: 'USD',
      type: 'subscription',
      interval: 'monthly',
      features: [
        'All Pro user features included',
        'All Developer API features',
        'Bulk tip operations',
        'Airdrop creation via API',
        'Scheduled operations',
        'Analytics dashboard',
        '300 requests/minute',
        '100,000 requests/day',
        'Priority support',
        '99.5% uptime SLA'
      ],
      rate_limits: {
        requests_per_minute: 300,
        requests_per_hour: 10000,
        requests_per_day: 100000,
        concurrent_requests: 20
      },
      endpoints: [
        'POST /api/v1/tip',
        'POST /api/v1/tip/bulk',
        'GET /api/v1/balance',
        'GET /api/v1/history',
        'POST /api/v1/airdrop',
        'POST /api/v1/webhook/setup',
        'GET /api/v1/user/stats',
        'GET /api/v1/analytics',
        'POST /api/v1/tip/schedule'
      ]
    },

    api_enterprise_custom: {
      sku_id: 'justthetip_api_enterprise',
      name: 'JustTheTip API - Enterprise',
      description: 'Custom API solution for large-scale bots: White-label, 1K req/min, 1M req/day',
      price: null, // Custom pricing - contact sales
      currency: 'USD',
      type: 'subscription',
      interval: 'custom',
      features: [
        'All Business API features',
        'Triviadrop creation via API',
        'White-label options (no JustTheTip branding)',
        'Custom integrations',
        'Dedicated account manager',
        '1,000 requests/minute',
        '1,000,000 requests/day',
        'Custom rate limits available',
        'Priority transaction processing',
        '99.9% uptime SLA'
      ],
      rate_limits: {
        requests_per_minute: 1000,
        requests_per_hour: 50000,
        requests_per_day: 1000000,
        concurrent_requests: 100
      },
      endpoints: [
        'All Business endpoints',
        'POST /api/v1/triviadrop',
        'POST /api/v1/custom/integration',
        'GET /api/v1/advanced/analytics',
        'POST /api/v1/white-label/config'
      ],
      notes: 'Requires manual approval. Contact api-sales@justthetip.bot for pricing.'
    }
  }
};

/**
 * Fee structure to keep user costs under $0.07 per transaction
 * Network fees on Solana are ~$0.00025, so we have room for ~$0.06975 in bot fees
 */
const FEE_STRUCTURE = {
  free_tier: {
    // Standard users pay network fees only
    network_fee: 0.00025, // SOL (~$0.005 at $200/SOL)
    bot_fee_percentage: 0, // 0% bot fee
    bot_fee_max: 0,
    total_max_fee_usd: 0.005, // Just network fee
    note: 'Free tier users only pay Solana network fees (~$0.005)'
  },

  premium_tier: {
    // Premium users get fee-free transactions (bot covers all fees)
    network_fee: 0, // Covered by bot
    bot_fee_percentage: 0,
    bot_fee_max: 0,
    total_max_fee_usd: 0,
    note: 'Premium subscribers get 100% fee-free transactions'
  },

  recommended_model: {
    // Alternative: Small percentage fee for free users (still under $0.07)
    network_fee: 0.00025,
    bot_fee_percentage: 0.5, // 0.5% fee
    bot_fee_max_usd: 0.065, // Cap at $0.065 to stay under $0.07 total
    total_max_fee_usd: 0.07,
    note: 'Optional: 0.5% fee (max $0.065) + network fee. Premium users exempt.'
  }
};

/**
 * Suggested additional premium features that don't impact transaction fees
 */
const ADDITIONAL_PREMIUM_FEATURES = {
  cosmetic: [
    'Custom emoji reactions on tips',
    'Animated tip announcements',
    'Custom success messages',
    'Profile badges (whale, generous, active)',
    'Leaderboard highlighting',
    'Custom notification sounds'
  ],

  utility: [
    'Transaction receipts via DM',
    'Weekly/monthly transaction reports (auto-generated)',
    'Tax export (CSV/PDF for tax purposes)',
    'Multi-signature wallet support',
    'Wallet import/export',
    'Transaction scheduling',
    'Recurring tips (daily/weekly/monthly)',
    'Budget limits and spending alerts'
  ],

  social: [
    'Private tipping groups',
    'Tip leaderboards (server-wide)',
    'Achievement badges',
    'Tipping streaks',
    'Tip reactions and comments',
    'Social proof (verified generous badge)'
  ],

  analytics: [
    'Detailed transaction history',
    'Spending insights and trends',
    'Top tipped users dashboard',
    'Community analytics (for admins)',
    'Export transaction data',
    'Tax reporting tools'
  ],

  advanced: [
    'API access for custom integrations',
    'Webhook notifications',
    'Custom bot commands',
    'White-label bot instance',
    'Priority transaction queue',
    'Advanced airdrop targeting'
  ]
};

/**
 * Revenue model explanation
 */
const REVENUE_MODEL = {
  description: 'Sustainable revenue without extracting from user tips',
  
  revenue_sources: [
    {
      source: 'Premium Subscriptions',
      monthly_revenue: '$4.99 - $9.99 per user',
      margin: '~90% (Discord takes 10%)',
      notes: 'Primary revenue source. No impact on transaction fees.'
    },
    {
      source: 'Consumable Purchases',
      average_order: '$1.99 - $3.99',
      margin: '~90%',
      notes: 'Fee-free bundles, private tip bundles. One-time purchases.'
    },
    {
      source: 'Durable Purchases',
      average_order: '$2.99 - $4.99',
      margin: '~90%',
      notes: 'Cosmetic upgrades, vanity features. Permanent unlocks.'
    },
    {
      source: 'Transaction Fees (Optional)',
      fee: '0.5% (max $0.065)',
      margin: '100%',
      notes: 'Only on free tier. Premium exempt. Keeps total under $0.07.'
    }
  ],

  cost_structure: [
    {
      cost: 'Solana Network Fees',
      amount: '~$0.00025 per transaction',
      who_pays: 'User (free tier) or Bot (premium tier)',
      notes: 'Very low due to Solana efficiency'
    },
    {
      cost: 'Discord Hosting',
      amount: 'Free (within limits)',
      notes: 'Discord hosts bots for free'
    },
    {
      cost: 'Database & Infrastructure',
      amount: '$20-50/month (estimated)',
      notes: 'Supabase/Railway/Vercel free tiers or minimal paid'
    },
    {
      cost: 'Premium User Fee Coverage',
      amount: 'Variable (~$0.00025 per premium transaction)',
      notes: 'Covered by subscription revenue'
    }
  ],

  profitability: {
    break_even: '~10-15 premium subscribers',
    calculation: '10 users × $4.99 × 90% = $44.91/month revenue - $50 costs ≈ break even',
    scaling: 'Highly profitable with scale. 100 users = ~$450/month profit'
  }
};

/**
 * Check if user has premium feature access
 * @param {string} userId - User's Discord ID
 * @param {string} feature - Feature to check
 * @param {Object} database - Database instance
 * @returns {Promise<boolean>} True if user has access
 */
async function checkPremiumFeature(userId, feature, database) {
  try {
    // TODO: Query database for user's premium status and entitlements
    // For now, return false (free tier)
    const userPremium = await database.getUserPremiumStatus(userId);
    
    if (!userPremium || !userPremium.active) {
      return false;
    }

    // Check if user's tier includes the feature
    const tier = DISCORD_SKUS.subscriptions[userPremium.tier];
    if (!tier) return false;

    switch (feature) {
      case 'private_tips':
        return tier.limits.private_tips === true;
      case 'custom_timers':
        return tier.limits.custom_timers === true;
      case 'fee_free':
        return tier.limits.fee_free === true;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking premium feature:', error);
    return false;
  }
}

/**
 * Use consumable entitlement (e.g., fee-free tip)
 * @param {string} userId - User's Discord ID
 * @param {string} feature - Feature to consume
 * @param {Object} database - Database instance
 * @returns {Promise<boolean>} True if successfully consumed
 */
async function useConsumable(userId, feature, database) {
  try {
    // TODO: Decrement user's consumable balance in database
    const balance = await database.getConsumableBalance(userId, feature);
    
    if (balance <= 0) {
      return false;
    }

    await database.decrementConsumable(userId, feature, 1);
    return true;
  } catch (error) {
    console.error('Error using consumable:', error);
    return false;
  }
}

module.exports = {
  DISCORD_SKUS,
  FEE_STRUCTURE,
  ADDITIONAL_PREMIUM_FEATURES,
  REVENUE_MODEL,
  checkPremiumFeature,
  useConsumable
};
