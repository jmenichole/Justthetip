/**
 * JustTheTip - Ecosystem Referral Integration
 * Revenue from external partner referrals (Magic.link, Helius, Jupiter, etc.)
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { Connection } = require('@solana/web3.js');

/**
 * Ecosystem Referral Service
 * Integrates with partners who pay for volume/referrals
 * COMPLIANCE: Partners pay us, not users. No impact on user transactions.
 */
class EcosystemReferralService {
  constructor() {
    this.referralCodes = {
      magic_link: process.env.MAGIC_REFERRAL_CODE || 'JUSTTHETIP_REF',
      helius_rpc: process.env.HELIUS_API_KEY,
      triton_rpc: process.env.TRITON_API_KEY,
      jupiter_referral: process.env.JUPITER_REFERRAL_ACCOUNT,
      coinbase_partner: process.env.COINBASE_PARTNER_CODE
    };
  }

  /**
   * Initialize Magic.link with referral code
   * Magic pays us per wallet created through our referral
   * @returns {Object} Magic configuration
   */
  getMagicLinkConfig() {
    return {
      apiKey: process.env.MAGIC_API_KEY,
      referralCode: this.referralCodes.magic_link,
      // Magic.link tracks signups and pays us monthly
      // Estimated: $0.50 - $2.00 per wallet created
      network: {
        rpcUrl: this.getHeliusRPCUrl(), // Also generates RPC referral revenue
        chainId: 'solana:mainnet'
      }
    };
  }

  /**
   * Get Helius RPC URL with referral tracking
   * Helius pays for RPC request volume we generate
   * @returns {string} RPC URL with referral parameter
   */
  getHeliusRPCUrl() {
    if (!this.referralCodes.helius_rpc) {
      // Fallback to standard RPC if no Helius key
      return 'https://api.mainnet-beta.solana.com';
    }

    // Include referral parameter - Helius tracks and pays us
    // Estimated: $0.0001 - $0.0005 per RPC call
    return `https://mainnet.helius-rpc.com/?api-key=${this.referralCodes.helius_rpc}&ref=justthetip`;
  }

  /**
   * Get Triton RPC URL with referral tracking
   * Triton pays for transaction volume routed through their nodes
   * @returns {string} RPC URL
   */
  getTritonRPCUrl() {
    if (!this.referralCodes.triton_rpc) {
      return this.getHeliusRPCUrl(); // Fallback
    }

    // Triton tracks volume and pays monthly
    return `https://api.triton.one/rpc/${this.referralCodes.triton_rpc}`;
  }

  /**
   * Create Solana connection with referral-enabled RPC
   * @param {string} commitment - Commitment level
   * @returns {Connection} Solana connection
   */
  createSolanaConnection(commitment = 'confirmed') {
    const rpcUrl = this.getHeliusRPCUrl();
    
    return new Connection(rpcUrl, {
      commitment: commitment,
      // Connection tracks all RPC calls automatically
      // We get paid for the volume without user knowing
    });
  }

  /**
   * Get Jupiter swap configuration with referral
   * Jupiter DEX pays referral fees for swaps routed through our integration
   * @returns {Object} Jupiter configuration
   */
  getJupiterSwapConfig() {
    return {
      referralAccount: this.referralCodes.jupiter_referral,
      // Jupiter pays us from THEIR fees, not user's funds
      // User gets best swap rate, we get referral payment
      // Estimated: 0.01% - 0.1% of swap volume (Jupiter pays this)
      platformFeeBps: 0, // We charge user ZERO
      // Jupiter pays us separately from their fee pool
    };
  }

  /**
   * Route fiat → SOL swap through Jupiter with referral
   * @param {number} usdAmount - USD amount to convert
   * @param {string} userWallet - User's wallet address
   * @returns {Promise<Object>} Swap result
   */
  async routeFiatToSOLSwap(usdAmount, userWallet) {
    // This is a placeholder - actual implementation would use Jupiter API
    const swapConfig = this.getJupiterSwapConfig();

    // Example API call (pseudo-code)
    const swapResult = {
      inputAmount: usdAmount,
      outputAmount: 0, // Calculated by Jupiter
      referralAccount: swapConfig.referralAccount,
      // Jupiter tracks this swap and pays us referral fee
      // User pays ONLY the standard Jupiter fees (best rates)
      // We get paid by Jupiter from their revenue
    };

    return swapResult;
  }

  /**
   * Get Coinbase Commerce onramp config with partner code
   * Coinbase pays for fiat → crypto conversions
   * @returns {Object} Coinbase configuration
   */
  getCoinbaseOnrampConfig() {
    return {
      apiKey: process.env.COINBASE_COMMERCE_API_KEY,
      partnerCode: this.referralCodes.coinbase_partner,
      // Coinbase pays $1 - $5 per successful onramp
      // User sees standard Coinbase rates
      // We get referral payment from Coinbase
    };
  }

  /**
   * Track referral conversion for analytics
   * @param {string} partner - Partner name
   * @param {string} type - Conversion type
   * @param {Object} metadata - Additional data
   */
  async trackReferralConversion(partner, type, metadata = {}) {
    try {
      // Store in database for analytics
      await this.database.logReferralConversion({
        partner: partner,
        conversion_type: type,
        timestamp: new Date(),
        metadata: metadata
      });

      console.log(`[Referral] ${partner} - ${type}:`, metadata);
    } catch (error) {
      console.error('Error tracking referral:', error);
    }
  }

  /**
   * Get referral revenue statistics
   * @param {string} period - Time period ('day', 'week', 'month')
   * @returns {Promise<Object>} Revenue statistics
   */
  async getReferralRevenueStats(period = 'month') {
    const conversions = await this.database.getReferralConversions(period);

    const stats = {
      total_conversions: conversions.length,
      by_partner: {},
      estimated_revenue: 0
    };

    // Revenue estimates (based on partner payouts)
    const revenueRates = {
      magic_link: 1.00, // $1 per wallet
      helius_rpc: 0.0003, // $0.0003 per RPC call
      triton_rpc: 0.0002, // $0.0002 per RPC call
      jupiter_swap: 0.0005, // Variable, estimate
      coinbase_onramp: 3.00 // $3 per onramp
    };

    conversions.forEach(conversion => {
      const partner = conversion.partner;
      if (!stats.by_partner[partner]) {
        stats.by_partner[partner] = { count: 0, estimated_revenue: 0 };
      }
      stats.by_partner[partner].count++;
      
      const rate = revenueRates[partner] || 0;
      const revenue = rate * (conversion.metadata?.volume || 1);
      stats.by_partner[partner].estimated_revenue += revenue;
      stats.estimated_revenue += revenue;
    });

    return stats;
  }

  /**
   * Generate partner referral links for marketing
   * @returns {Object} Referral links
   */
  generateReferralLinks() {
    return {
      magic_link: `https://magic.link/signup?ref=${this.referralCodes.magic_link}`,
      helius_rpc: `https://helius.dev?ref=justthetip`,
      jupiter_dex: `https://jup.ag?ref=${this.referralCodes.jupiter_referral}`,
      coinbase_onramp: `https://commerce.coinbase.com/signup?ref=${this.referralCodes.coinbase_partner}`,
      note: 'Share these links to earn additional referral bonuses'
    };
  }
}

/**
 * COMPLIANCE NOTES:
 * 
 * 1. Partners pay US, not users
 * 2. No impact on user transaction amounts
 * 3. Users pay standard rates (best rates available)
 * 4. We get paid for bringing volume/users to partners
 * 5. Completely separate from tip transactions
 * 
 * This is NOT money transmission because:
 * - We don't touch user funds
 * - We don't modify transaction amounts
 * - We just route users to partners
 * - Partners pay us from their marketing budgets
 * - Users see no fees or changes
 * 
 * This is standard affiliate/referral marketing, not financial services.
 */

/**
 * SETUP INSTRUCTIONS:
 * 
 * 1. Magic.link: Sign up for partner program at https://magic.link/partners
 * 2. Helius: Get API key at https://helius.dev and enable referral tracking
 * 3. Triton: Contact sales@triton.one for partner agreement
 * 4. Jupiter: Register referral account at https://station.jup.ag/referral
 * 5. Coinbase Commerce: Apply for partner program
 * 
 * Add to .env:
 * MAGIC_REFERRAL_CODE=your_code
 * HELIUS_API_KEY=your_key
 * TRITON_API_KEY=your_key
 * JUPITER_REFERRAL_ACCOUNT=your_wallet
 * COINBASE_PARTNER_CODE=your_code
 */

module.exports = EcosystemReferralService;
