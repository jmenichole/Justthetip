/**
 * JustTheTip - API Linking Service
 * Premium B2B feature for Discord bot developers to integrate tipping functionality
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const crypto = require('crypto');

/**
 * API Linking Service
 * Allows Discord bot developers to integrate JustTheTip's tipping functionality
 * into their own bots (e.g., Rumbles, Degens Against Decency, etc.)
 */
class APILinkingService {
  constructor(database) {
    this.database = database;
  }

  /**
   * Generate API credentials for a new partner bot
   * @param {string} userId - Discord user ID of the bot owner
   * @param {string} botId - Discord bot ID to link
   * @param {string} botName - Name of the bot
   * @param {string} tier - Subscription tier (developer, business, enterprise)
   * @returns {Object} API credentials
   */
  async generateAPICredentials(userId, botId, botName, tier = 'developer') {
    const apiKey = this._generateAPIKey();
    const apiSecret = this._generateAPISecret();
    const webhookSecret = this._generateWebhookSecret();

    const credentials = {
      api_key: apiKey,
      api_secret: apiSecret,
      webhook_secret: webhookSecret,
      bot_id: botId,
      bot_name: botName,
      owner_id: userId,
      tier: tier,
      created_at: new Date().toISOString(),
      status: 'active',
      rate_limits: this._getRateLimitsForTier(tier),
      endpoints_enabled: this._getEndpointsForTier(tier)
    };

    // Store in database
    await this.database.storeAPICredentials(credentials);

    return {
      api_key: apiKey,
      api_secret: apiSecret,
      webhook_secret: webhookSecret,
      documentation_url: 'https://docs.justthetip.bot/api',
      tier: tier,
      rate_limits: credentials.rate_limits
    };
  }

  /**
   * Validate API key and secret
   * @param {string} apiKey - API key
   * @param {string} apiSecret - API secret
   * @returns {Promise<Object|null>} API credentials if valid, null otherwise
   */
  async validateAPICredentials(apiKey, apiSecret) {
    const credentials = await this.database.getAPICredentials(apiKey);
    
    if (!credentials) {
      return null;
    }

    if (credentials.status !== 'active') {
      return null;
    }

    // Verify secret
    const hashedSecret = this._hashSecret(apiSecret);
    if (hashedSecret !== credentials.api_secret_hash) {
      return null;
    }

    return credentials;
  }

  /**
   * Check rate limits for API request
   * @param {string} apiKey - API key
   * @param {string} endpoint - Endpoint being accessed
   * @returns {Promise<Object>} Rate limit status
   */
  async checkRateLimit(apiKey, endpoint) {
    const credentials = await this.database.getAPICredentials(apiKey);
    
    if (!credentials) {
      return { allowed: false, reason: 'Invalid API key' };
    }

    const limits = credentials.rate_limits;
    const usage = await this.database.getAPIUsage(apiKey, endpoint);

    const now = Date.now();
    const windowStart = now - (60 * 1000); // 1 minute window

    // Count requests in current window
    const recentRequests = usage.filter(req => req.timestamp > windowStart);

    if (recentRequests.length >= limits.requests_per_minute) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded',
        retry_after: 60 - Math.floor((now - recentRequests[0].timestamp) / 1000)
      };
    }

    return { allowed: true };
  }

  /**
   * Log API request for analytics and billing
   * @param {string} apiKey - API key
   * @param {string} endpoint - Endpoint accessed
   * @param {Object} metadata - Request metadata
   */
  async logAPIRequest(apiKey, endpoint, metadata = {}) {
    await this.database.logAPIRequest({
      api_key: apiKey,
      endpoint: endpoint,
      timestamp: Date.now(),
      ...metadata
    });
  }

  /**
   * Get API usage statistics for billing
   * @param {string} apiKey - API key
   * @param {string} period - Time period ('day', 'week', 'month')
   * @returns {Promise<Object>} Usage statistics
   */
  async getAPIUsageStats(apiKey, period = 'month') {
    const usage = await this.database.getAPIUsage(apiKey, null, period);

    const stats = {
      total_requests: usage.length,
      successful_requests: usage.filter(r => r.success).length,
      failed_requests: usage.filter(r => !r.success).length,
      endpoints_used: {},
      transactions_processed: 0,
      volume_processed: 0
    };

    // Group by endpoint
    usage.forEach(request => {
      const endpoint = request.endpoint;
      if (!stats.endpoints_used[endpoint]) {
        stats.endpoints_used[endpoint] = 0;
      }
      stats.endpoints_used[endpoint]++;

      // Track financial metrics
      if (request.transaction_amount) {
        stats.transactions_processed++;
        stats.volume_processed += request.transaction_amount;
      }
    });

    return stats;
  }

  /**
   * Revoke API credentials
   * @param {string} apiKey - API key to revoke
   * @param {string} userId - User ID requesting revocation
   * @returns {Promise<boolean>} Success status
   */
  async revokeAPICredentials(apiKey, userId) {
    const credentials = await this.database.getAPICredentials(apiKey);
    
    if (!credentials || credentials.owner_id !== userId) {
      return false;
    }

    await this.database.updateAPICredentials(apiKey, { status: 'revoked' });
    return true;
  }

  // Private helper methods

  _generateAPIKey() {
    return 'jtt_' + crypto.randomBytes(32).toString('hex');
  }

  _generateAPISecret() {
    return crypto.randomBytes(64).toString('hex');
  }

  _generateWebhookSecret() {
    return 'whsec_' + crypto.randomBytes(32).toString('hex');
  }

  _hashSecret(secret) {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  _getRateLimitsForTier(tier) {
    const limits = {
      developer: {
        requests_per_minute: 60,
        requests_per_hour: 1000,
        requests_per_day: 10000,
        concurrent_requests: 5,
        burst_limit: 10
      },
      business: {
        requests_per_minute: 300,
        requests_per_hour: 10000,
        requests_per_day: 100000,
        concurrent_requests: 20,
        burst_limit: 50
      },
      enterprise: {
        requests_per_minute: 1000,
        requests_per_hour: 50000,
        requests_per_day: 1000000,
        concurrent_requests: 100,
        burst_limit: 200
      }
    };

    return limits[tier] || limits.developer;
  }

  _getEndpointsForTier(tier) {
    const endpoints = {
      developer: [
        'POST /api/v1/tip',
        'GET /api/v1/balance',
        'GET /api/v1/history',
        'POST /api/v1/webhook/setup',
        'GET /api/v1/user/stats'
      ],
      business: [
        'POST /api/v1/tip',
        'POST /api/v1/tip/bulk',
        'GET /api/v1/balance',
        'GET /api/v1/history',
        'POST /api/v1/airdrop',
        'POST /api/v1/webhook/setup',
        'GET /api/v1/user/stats',
        'GET /api/v1/analytics',
        'POST /api/v1/tip/schedule'
      ],
      enterprise: [
        'POST /api/v1/tip',
        'POST /api/v1/tip/bulk',
        'GET /api/v1/balance',
        'GET /api/v1/history',
        'POST /api/v1/airdrop',
        'POST /api/v1/triviadrop',
        'POST /api/v1/webhook/setup',
        'GET /api/v1/user/stats',
        'GET /api/v1/analytics',
        'POST /api/v1/tip/schedule',
        'POST /api/v1/custom/integration',
        'GET /api/v1/advanced/analytics',
        'POST /api/v1/white-label/config'
      ]
    };

    return endpoints[tier] || endpoints.developer;
  }
}

module.exports = APILinkingService;
