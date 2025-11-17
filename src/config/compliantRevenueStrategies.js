/**
 * JustTheTip - Compliant Revenue Strategies
 * Ecosystem-based monetization without touching user funds
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

/**
 * COMPLIANT REVENUE MODEL
 * 
 * This file documents revenue strategies that DON'T trigger money transmission regulations
 * by avoiding touching, holding, or taking a cut of user funds.
 */

// =====================================
// 1. SUBSCRIPTION REVENUE (Primary)
// =====================================
const SUBSCRIPTION_REVENUE = {
  description: 'User pays for features, not per-transaction fees',
  models: {
    premium_monthly: {
      price: 4.99,
      margin: 0.90, // Discord takes 10%
      monthly_revenue_per_user: 4.49,
      what_user_gets: [
        'Private tips (no public announcement)',
        'Custom triviadrop timers',
        'Zero fees on their transactions (we cover network fees)',
        'Priority support'
      ],
      compliance_note: 'NOT a percentage of tips. Fixed monthly fee for features.'
    }
  }
};

// =====================================
// 2. MARKETPLACE / ECOSYSTEM REFERRALS
// =====================================
const ECOSYSTEM_REFERRAL_REVENUE = {
  description: 'External partners pay us for bringing them users/volume',
  
  partners: {
    magic_link: {
      type: 'Wallet Creation Referral',
      revenue: 'Magic.link pays per wallet created through our referral',
      implementation: 'Add referral parameter to Magic SDK initialization',
      estimated_payout: '$0.50 - $2.00 per wallet created',
      compliance_note: 'Partner pays us, not user. No impact on transaction.'
    },

    helius_rpc: {
      type: 'RPC Volume Referral',
      revenue: 'Helius pays for RPC request volume we generate',
      implementation: 'Use Helius RPC endpoint with referral parameter',
      estimated_payout: '$0.0001 - $0.0005 per RPC call',
      compliance_note: 'We get paid for API usage, not user transactions.'
    },

    triton_rpc: {
      type: 'RPC Volume Referral',
      revenue: 'Triton pays for transaction volume routed through their nodes',
      implementation: 'Configure Solana connection to use Triton RPC',
      estimated_payout: 'Variable based on volume',
      compliance_note: 'Infrastructure provider pays us, not users.'
    },

    jupiter_dex: {
      type: 'Swap Routing Referral',
      revenue: 'Jupiter DEX pays referral fees for fiat → SOL swaps',
      implementation: 'Route fiat onramps through Jupiter aggregator with referral code',
      estimated_payout: '0.01% - 0.1% of swap volume (Jupiter pays this, not user)',
      compliance_note: 'DEX pays us for routing users to them.'
    },

    coinbase_onramp: {
      type: 'Fiat Onramp Referral',
      revenue: 'Coinbase pays for fiat → crypto conversions',
      implementation: 'Use Coinbase Commerce API with partner code',
      estimated_payout: '$1 - $5 per successful onramp',
      compliance_note: 'Coinbase pays referral fee, not charged to user.'
    },

    solana_pay: {
      type: 'Payment Processing Affiliate',
      revenue: 'Solana Pay merchant referrals',
      implementation: 'Affiliate hooks in Solana Pay SDK',
      estimated_payout: 'Variable based on merchant volume',
      compliance_note: 'Merchant/ecosystem pays, not individual users.'
    }
  },

  implementation_example: {
    magic_link: `
      // When user creates wallet
      const magic = new Magic(MAGIC_API_KEY, {
        extensions: [new SolanaExtension()],
        referralCode: 'JUSTTHETIP_REF_2025' // Magic pays us per signup
      });
      
      // User pays nothing extra, we get paid by Magic
    `,

    helius_rpc: `
      // Configure Solana connection
      const connection = new Connection(
        'https://mainnet.helius-rpc.com/?api-key=YOUR_KEY&ref=justthetip',
        'confirmed'
      );
      
      // Helius tracks our volume and pays us monthly
      // User sees no difference, pays normal network fees
    `,

    jupiter_swap: `
      // When user buys SOL with fiat
      const swapResult = await jupiterAggregator.swap({
        inputMint: 'USD',
        outputMint: 'SOL',
        amount: userAmount,
        referralAccount: 'YOUR_REFERRAL_WALLET', // Jupiter pays us from their fees
        slippageBps: 50
      });
      
      // User gets best swap rate, we get referral fee from Jupiter
    `
  }
};

// =====================================
// 3. TIP ROUND-UP FEATURE (OPT-IN)
// =====================================
const TIP_ROUNDUP_REVENUE = {
  description: 'User voluntarily adds extra amount to support the bot',
  
  how_it_works: {
    user_sends: 5.00,
    bot_suggests: 'Want to round up to $5.10 to support JustTheTip?',
    user_chooses: 'Yes',
    recipient_gets: 5.00,
    bot_gets: 0.10,
    compliance_note: 'This is a SEPARATE transaction, not a percentage of the tip'
  },

  implementation: {
    step1: 'User initiates tip of $5.00',
    step2: 'Bot shows confirmation with optional round-up',
    step3: 'If user agrees, TWO separate transactions occur:',
    transaction1: '$5.00 from user → recipient (unchanged)',
    transaction2: '$0.10 from user → bot wallet (separate donation)',
    key_point: 'The original tip amount NEVER changes. Round-up is additional.',
  },

  suggested_amounts: {
    small_tips: {
      tip_range: '$0.01 - $1.00',
      roundup: '$0.05',
      user_message: 'Round up by $0.05 to support JustTheTip?'
    },
    medium_tips: {
      tip_range: '$1.01 - $10.00',
      roundup: '$0.10',
      user_message: 'Round up by $0.10 to support JustTheTip?'
    },
    large_tips: {
      tip_range: '$10.01+',
      roundup: '$0.25',
      user_message: 'Round up by $0.25 to support JustTheTip?'
    }
  },

  compliance_requirements: {
    must_be_optional: 'Default is NO. User must explicitly opt-in.',
    must_be_separate: 'Two distinct transactions. Original tip unchanged.',
    must_be_disclosed: 'Clear message that extra amount goes to bot development.',
    can_be_disabled: 'User can disable round-up prompts in settings.',
    no_pressure: 'No penalties or reduced features for declining.'
  }
};

// =====================================
// 4. STREAMER INTEGRATION REVENUE SPLITS
// =====================================
const STREAMER_REVENUE_SPLITS = {
  description: 'Streamers pay for enhanced features, share service fee revenue',
  
  what_streamers_get: {
    custom_commands: 'Branded tip commands (!tip @streamer)',
    leaderboard: 'Real-time on-stream donor leaderboard',
    overlays: 'OBS overlays showing tips in real-time',
    hybrid_flows: 'Kick/Discord integrated tipping',
    analytics: 'Donor analytics and insights',
    branding: 'Custom colors, emojis, messages'
  },

  what_you_get: {
    model: 'Service fee revenue share',
    streamer_fee: {
      description: 'Streamer adds $0.10 service fee per tip on their channel',
      user_tips: 5.00,
      service_fee: 0.10, // Added by streamer, not you
      total_user_pays: 5.10,
      recipient_gets: 5.00,
      fee_split: {
        streamer_keeps: 0.05, // 50% of service fee
        bot_gets: 0.05, // 50% of service fee
        compliance_note: 'You get % of SERVICE FEE, not % of tip amount'
      }
    }
  },

  pricing_tiers: {
    basic_streamer: {
      monthly_fee: 9.99,
      features: 'Basic overlays, leaderboard, analytics',
      revenue_split: 'Streamer keeps 100% of service fees'
    },
    pro_streamer: {
      monthly_fee: 29.99,
      features: 'All Basic + custom branding, advanced analytics',
      revenue_split: '50/50 split of service fees with bot'
    },
    enterprise_streamer: {
      monthly_fee: 99.99,
      features: 'All Pro + dedicated support, custom integrations',
      revenue_split: '70/30 split (streamer gets 70%)'
    }
  },

  compliance_note: 'Streamer chooses to add service fee. You split that fee, not the tip itself.'
};

// =====================================
// WHAT YOU MUST AVOID (REGULATORY)
// =====================================
const REGULATORY_DONT_DO = {
  never_do_these: [
    {
      action: '❌ Taking a cut of the actual tip',
      example: 'User tips $5, we take $0.05 (1%), recipient gets $4.95',
      why_bad: 'This is LITERALLY money transmission. Requires licenses in all 50 states.',
      penalty: 'Federal prosecution, massive fines, potential jail time'
    },
    {
      action: '❌ Holding user funds for even 1 minute',
      example: 'User deposits $100, we hold it, user tips from balance',
      why_bad: 'Triggers custodial licensing requirements. You become a bank.',
      penalty: 'SEC/FinCEN violations, state money transmitter violations'
    },
    {
      action: '❌ Routing funds through bot-owned wallet',
      example: 'User → Bot Wallet → Recipient',
      why_bad: 'Instant red flag. You are transmitting money.',
      penalty: 'Money Services Business violations, potential criminal charges'
    },
    {
      action: '❌ Changing the blockchain "amount" from sender → recipient',
      example: 'User sends 5 SOL, recipient gets 4.95 SOL, we keep 0.05',
      why_bad: 'Money transmitter territory. You modified the transaction.',
      penalty: 'State and federal money transmission violations'
    },
    {
      action: '❌ Converting currencies (even temporarily)',
      example: 'User sends USD, we convert to SOL, send to recipient',
      why_bad: 'This is money transmission AND currency exchange.',
      penalty: 'Double regulatory violation. Very bad.'
    }
  ],

  safe_alternatives: [
    {
      instead_of: 'Taking 1% of tips',
      do_this: 'Charge $4.99/month subscription for premium features',
      why_safe: 'Fixed fee for services, not tied to transaction amounts'
    },
    {
      instead_of: 'Holding user funds',
      do_this: 'Use non-custodial wallets (user owns keys)',
      why_safe: 'User always controls their own funds'
    },
    {
      instead_of: 'Routing through your wallet',
      do_this: 'Direct peer-to-peer transactions (user → recipient)',
      why_safe: 'You just facilitate, never touch funds'
    },
    {
      instead_of: 'Taking % of tip amount',
      do_this: 'Optional round-up (separate transaction)',
      why_safe: 'User explicitly chooses to donate separately'
    }
  ]
};

// =====================================
// IMPLEMENTATION ARCHITECTURE
// =====================================
const COMPLIANT_ARCHITECTURE = {
  transaction_flow: {
    step1: 'User commands: /tip @recipient 5.00',
    step2: 'Bot shows confirmation: "Send 5 SOL to @recipient?"',
    step3: 'Optional: "Round up by $0.10 to support JustTheTip? [Yes] [No]"',
    step4a_if_no_roundup: {
      transactions: [
        'Transaction 1: 5.00 SOL directly from user wallet → recipient wallet'
      ],
      bot_role: 'Just signs transaction on behalf of user (non-custodial)',
      bot_never_touches: 'The 5.00 SOL never enters bot wallet'
    },
    step4b_if_yes_roundup: {
      transactions: [
        'Transaction 1: 5.00 SOL directly from user wallet → recipient wallet',
        'Transaction 2: 0.10 SOL directly from user wallet → bot support wallet'
      ],
      bot_role: 'Signs both transactions, but as separate operations',
      bot_never_touches: 'The 5.00 SOL still never enters bot wallet'
    }
  },

  wallet_architecture: {
    user_wallets: 'Non-custodial. User owns private keys (via Magic.link or their own wallet)',
    bot_role: 'Bot has permission to sign on user behalf, but never custody',
    transaction_signing: 'User approves, bot executes, blockchain settles',
    fund_flow: 'Always direct: User → Recipient (never through intermediary)',
    support_wallet: 'Separate wallet for round-ups and donations (clearly disclosed)'
  },

  revenue_tracking: {
    subscriptions: 'Discord SKU system handles this',
    referrals: 'Partner dashboards track and pay out',
    roundups: 'On-chain transaction history (transparent)',
    streamer_splits: 'Manual invoicing or automated smart contract splits'
  }
};

// =====================================
// PROJECTED REVENUE BREAKDOWN
// =====================================
const REVENUE_PROJECTIONS = {
  at_1000_users: {
    subscriptions: {
      premium_users: 50, // 5% conversion
      revenue_per_month: 50 * 4.49, // $224.50
      annual: '$2,694'
    },
    ecosystem_referrals: {
      new_wallets_per_month: 100,
      rpc_volume: '1M requests',
      swap_referrals: 20,
      estimated_monthly: '$150 - $300',
      annual: '$1,800 - $3,600'
    },
    tip_roundups: {
      tips_per_month: 2000,
      roundup_rate: 0.20, // 20% of users opt-in
      avg_roundup: 0.10,
      monthly_revenue: 2000 * 0.20 * 0.10, // $40
      annual: '$480'
    },
    streamer_integrations: {
      streamers: 2,
      subscription_revenue: 2 * 29.99, // $59.98
      service_fee_splits: '$50 - $100',
      monthly_revenue: '$110 - $160',
      annual: '$1,320 - $1,920'
    },
    total_monthly: '$524 - $684',
    total_annual: '$6,294 - $8,694',
    costs: '$50/month infrastructure',
    profit_monthly: '$474 - $634',
    profit_annual: '$5,694 - $7,694'
  },

  at_10000_users: {
    subscriptions: '$22,450/month',
    ecosystem_referrals: '$1,500 - $3,000/month',
    tip_roundups: '$400/month',
    streamer_integrations: '$1,000 - $2,000/month',
    total_monthly: '$25,350 - $27,850',
    total_annual: '$304,200 - $334,200',
    costs: '$200/month infrastructure',
    profit_monthly: '$25,150 - $27,650',
    profit_annual: '$301,800 - $331,800'
  }
};

module.exports = {
  SUBSCRIPTION_REVENUE,
  ECOSYSTEM_REFERRAL_REVENUE,
  TIP_ROUNDUP_REVENUE,
  STREAMER_REVENUE_SPLITS,
  REGULATORY_DONT_DO,
  COMPLIANT_ARCHITECTURE,
  REVENUE_PROJECTIONS
};
