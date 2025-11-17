/**
 * JustTheTip - API Linking Routes
 * RESTful endpoints for partner bot integration
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const express = require('express');
const router = express.Router();
const APILinkingService = require('../../src/services/apiLinkingService');

/**
 * Middleware to authenticate API requests
 */
async function authenticateAPI(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const apiSecret = req.headers['x-api-secret'];

  if (!apiKey || !apiSecret) {
    return res.status(401).json({
      error: 'Missing API credentials',
      message: 'Include X-API-Key and X-API-Secret headers'
    });
  }

  const apiService = new APILinkingService(req.app.locals.database);
  const credentials = await apiService.validateAPICredentials(apiKey, apiSecret);

  if (!credentials) {
    return res.status(401).json({
      error: 'Invalid API credentials',
      message: 'API key or secret is invalid'
    });
  }

  // Check rate limits
  const rateLimit = await apiService.checkRateLimit(apiKey, req.path);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: rateLimit.reason,
      retry_after: rateLimit.retry_after
    });
  }

  // Attach credentials to request
  req.apiCredentials = credentials;
  req.apiService = apiService;

  next();
}

/**
 * POST /api/v1/tip
 * Send a tip through the API
 */
router.post('/v1/tip', authenticateAPI, async (req, res) => {
  try {
    const { from_user_id, to_user_id, amount, currency, message } = req.body;

    // Validate input
    if (!from_user_id || !to_user_id || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['from_user_id', 'to_user_id', 'amount']
      });
    }

    // Log API request
    await req.apiService.logAPIRequest(req.apiCredentials.api_key, '/v1/tip', {
      transaction_amount: amount
    });

    // Process tip through JustTheTip's core system
    const tipResult = await req.app.locals.tipService.processTip({
      fromUserId: from_user_id,
      toUserId: to_user_id,
      amount: amount,
      currency: currency || 'SOL',
      message: message,
      source: 'api',
      partner_bot_id: req.apiCredentials.bot_id
    });

    res.json({
      success: true,
      transaction_id: tipResult.transaction_id,
      transaction_signature: tipResult.signature,
      amount: tipResult.amount,
      currency: tipResult.currency,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API tip error:', error);
    res.status(500).json({
      error: 'Transaction failed',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/tip/bulk
 * Send tips to multiple users at once (Business tier+)
 */
router.post('/v1/tip/bulk', authenticateAPI, async (req, res) => {
  try {
    // Check tier access
    if (!['business', 'enterprise'].includes(req.apiCredentials.tier)) {
      return res.status(403).json({
        error: 'Feature not available',
        message: 'Bulk tips require Business or Enterprise tier',
        upgrade_url: 'https://justthetip.bot/pricing'
      });
    }

    const { from_user_id, recipients, amount_per_user, message } = req.body;

    if (!from_user_id || !recipients || !Array.isArray(recipients) || !amount_per_user) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['from_user_id', 'recipients[]', 'amount_per_user']
      });
    }

    // Log API request
    await req.apiService.logAPIRequest(req.apiCredentials.api_key, '/v1/tip/bulk', {
      transaction_amount: amount_per_user * recipients.length
    });

    // Process bulk tips
    const results = await req.app.locals.tipService.processBulkTips({
      fromUserId: from_user_id,
      recipients: recipients,
      amountPerUser: amount_per_user,
      message: message,
      source: 'api',
      partner_bot_id: req.apiCredentials.bot_id
    });

    res.json({
      success: true,
      total_sent: results.successful,
      failed: results.failed,
      transactions: results.transactions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API bulk tip error:', error);
    res.status(500).json({
      error: 'Bulk transaction failed',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/balance
 * Get user's wallet balance
 */
router.get('/v1/balance/:user_id', authenticateAPI, async (req, res) => {
  try {
    const { user_id } = req.params;

    // Log API request
    await req.apiService.logAPIRequest(req.apiCredentials.api_key, '/v1/balance');

    const balance = await req.app.locals.walletService.getBalance(user_id);

    res.json({
      success: true,
      user_id: user_id,
      balance: balance.amount,
      currency: balance.currency,
      wallet_address: balance.wallet_address,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API balance error:', error);
    res.status(500).json({
      error: 'Failed to fetch balance',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/history
 * Get user's transaction history
 */
router.get('/v1/history/:user_id', authenticateAPI, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Log API request
    await req.apiService.logAPIRequest(req.apiCredentials.api_key, '/v1/history');

    const history = await req.app.locals.transactionService.getHistory(user_id, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      user_id: user_id,
      transactions: history.transactions,
      total: history.total,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API history error:', error);
    res.status(500).json({
      error: 'Failed to fetch history',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/airdrop
 * Create an airdrop (Business tier+)
 */
router.post('/v1/airdrop', authenticateAPI, async (req, res) => {
  try {
    // Check tier access
    if (!['business', 'enterprise'].includes(req.apiCredentials.tier)) {
      return res.status(403).json({
        error: 'Feature not available',
        message: 'Airdrops require Business or Enterprise tier'
      });
    }

    const { from_user_id, amount_per_user, qualifiers, max_recipients } = req.body;

    // Log API request
    await req.apiService.logAPIRequest(req.apiCredentials.api_key, '/v1/airdrop');

    const airdropResult = await req.app.locals.airdropService.createAirdrop({
      fromUserId: from_user_id,
      amountPerUser: amount_per_user,
      qualifiers: qualifiers,
      maxRecipients: max_recipients,
      source: 'api',
      partner_bot_id: req.apiCredentials.bot_id
    });

    res.json({
      success: true,
      airdrop_id: airdropResult.airdrop_id,
      recipients: airdropResult.recipients,
      total_amount: airdropResult.total_amount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API airdrop error:', error);
    res.status(500).json({
      error: 'Airdrop creation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/webhook/setup
 * Configure webhooks for transaction notifications
 */
router.post('/v1/webhook/setup', authenticateAPI, async (req, res) => {
  try {
    const { webhook_url, events } = req.body;

    if (!webhook_url) {
      return res.status(400).json({
        error: 'Missing webhook_url'
      });
    }

    // Store webhook configuration
    await req.app.locals.database.updateWebhookConfig(req.apiCredentials.api_key, {
      webhook_url: webhook_url,
      events: events || ['tip.completed', 'airdrop.completed', 'balance.updated'],
      webhook_secret: req.apiCredentials.webhook_secret
    });

    res.json({
      success: true,
      webhook_url: webhook_url,
      webhook_secret: req.apiCredentials.webhook_secret,
      events: events,
      message: 'Webhook configured successfully'
    });
  } catch (error) {
    console.error('API webhook setup error:', error);
    res.status(500).json({
      error: 'Webhook setup failed',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/user/stats
 * Get user statistics
 */
router.get('/v1/user/stats/:user_id', authenticateAPI, async (req, res) => {
  try {
    const { user_id } = req.params;

    // Log API request
    await req.apiService.logAPIRequest(req.apiCredentials.api_key, '/v1/user/stats');

    const stats = await req.app.locals.statsService.getUserStats(user_id);

    res.json({
      success: true,
      user_id: user_id,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/analytics
 * Get API usage analytics (Business tier+)
 */
router.get('/v1/analytics', authenticateAPI, async (req, res) => {
  try {
    // Check tier access
    if (!['business', 'enterprise'].includes(req.apiCredentials.tier)) {
      return res.status(403).json({
        error: 'Feature not available',
        message: 'Analytics require Business or Enterprise tier'
      });
    }

    const { period = 'month' } = req.query;

    const analytics = await req.apiService.getAPIUsageStats(
      req.apiCredentials.api_key,
      period
    );

    res.json({
      success: true,
      period: period,
      analytics: analytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
});

module.exports = router;
