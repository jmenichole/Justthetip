'use strict';

const axios = require('axios');
const crypto = require('crypto');
const logger = require('./logger');

const API_BASE_URL = 'https://api.commerce.coinbase.com';

class CoinbaseClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.COINBASE_COMMERCE_API_KEY || null;
    this.webhookSecret = options.webhookSecret || process.env.COINBASE_COMMERCE_WEBHOOK_SECRET || null;
    this.apiVersion = options.apiVersion || '2022-01-11';

    this.http = axios.create({
      baseURL: API_BASE_URL,
      timeout: options.timeout || 15_000,
      headers: {
        'X-CC-Version': this.apiVersion,
        'Content-Type': 'application/json'
      }
    });

    if (this.apiKey) {
      this.http.defaults.headers.common['X-CC-Api-Key'] = this.apiKey;
    }
  }

  assertApiKey() {
    if (!this.apiKey) {
      throw new Error('Coinbase Commerce API key not configured');
    }
  }

  async createCharge(payload) {
    this.assertApiKey();

    const body = {
      name: payload.name,
      description: payload.description,
      pricing_type: payload.pricingType || 'fixed_price',
      local_price: payload.localPrice,
      metadata: payload.metadata || {},
      redirect_url: payload.redirectUrl,
      cancel_url: payload.cancelUrl,
      pricing: payload.pricing,
      payments: payload.payments
    };

    const summary = {
      name: body.name,
      amount: body.local_price ? body.local_price.amount : undefined,
      currency: body.local_price ? body.local_price.currency : undefined
    };
    logger.info('[coinbase] Creating charge', summary);
    const response = await this.http.post('/charges', body);
    return response.data.data;
  }

  async getCharge(chargeId) {
    this.assertApiKey();
    const response = await this.http.get(`/charges/${chargeId}`);
    return response.data.data;
  }

  verifyWebhookSignature(rawBody, signature, secret = this.webhookSecret) {
    if (!secret) {
      throw new Error('Coinbase Commerce webhook secret not configured');
    }

    if (!signature) {
      return false;
    }

    const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const computedBuffer = Buffer.from(computed, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (computedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuffer, signatureBuffer);
  }
}

module.exports = new CoinbaseClient();
module.exports.CoinbaseClient = CoinbaseClient;
