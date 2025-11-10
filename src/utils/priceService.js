/**
 * JustTheTip - Price Service
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * 
 * This file is part of JustTheTip.
 * 
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * See LICENSE file in the project root for full license information.
 * 
 * SPDX-License-Identifier: MIT
 * 
 * This software may not be sold commercially without permission.
 */

'use strict';

const axios = require('axios');
const logger = require('./logger');

// Cache for price data
let priceCache = {
  SOL: 20, // Default fallback price
  lastUpdated: 0,
  cacheDuration: 60000, // 1 minute cache
};

/**
 * Fetch current SOL price from CoinGecko API
 * @returns {Promise<number>} Current SOL price in USD
 */
async function fetchSolPrice() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'solana',
        vs_currencies: 'usd',
      },
      timeout: 5000,
    });

    if (response.data && response.data.solana && response.data.solana.usd) {
      const price = response.data.solana.usd;
      logger.info(`[PriceService] Fetched SOL price: $${price}`);
      return price;
    }

    throw new Error('Invalid response from CoinGecko API');
  } catch (error) {
    logger.error(`[PriceService] Failed to fetch SOL price: ${error.message}`);
    return null;
  }
}

/**
 * Get current SOL price with caching
 * @returns {Promise<number>} Current SOL price in USD
 */
async function getSolPrice() {
  const now = Date.now();
  
  // Return cached price if still valid
  if (priceCache.lastUpdated && (now - priceCache.lastUpdated) < priceCache.cacheDuration) {
    return priceCache.SOL;
  }

  // Fetch new price
  const newPrice = await fetchSolPrice();
  
  if (newPrice !== null) {
    priceCache.SOL = newPrice;
    priceCache.lastUpdated = now;
    return newPrice;
  }

  // Return cached price as fallback
  logger.warn('[PriceService] Using cached/default SOL price as fallback');
  return priceCache.SOL;
}

/**
 * Convert USD amount to SOL
 * @param {number} usdAmount - Amount in USD
 * @returns {Promise<number>} Equivalent amount in SOL
 */
async function convertUsdToSol(usdAmount) {
  const solPrice = await getSolPrice();
  return usdAmount / solPrice;
}

/**
 * Convert SOL amount to USD
 * @param {number} solAmount - Amount in SOL
 * @returns {Promise<number>} Equivalent amount in USD
 */
async function convertSolToUsd(solAmount) {
  const solPrice = await getSolPrice();
  return solAmount * solPrice;
}

module.exports = {
  getSolPrice,
  convertUsdToSol,
  convertSolToUsd,
  fetchSolPrice,
};
