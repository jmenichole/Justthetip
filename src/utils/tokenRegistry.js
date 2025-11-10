/**
 * Token Registry - Supported Solana tokens for JustTheTip
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

/**
 * Supported tokens for tipping on JustTheTip
 * Each token includes mint address, decimals, name, and symbol
 */
const SUPPORTED_TOKENS = {
  SOL: {
    mint: 'So11111111111111111111111111111111111111112', // Wrapped SOL
    decimals: 9,
    name: 'Solana',
    symbol: 'SOL',
    isNative: true, // SOL is the native token
    coingeckoId: 'solana'
  },
  USDC: {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Mainnet USDC
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
    isNative: false,
    coingeckoId: 'usd-coin'
  },
  BONK: {
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // Mainnet BONK
    decimals: 5,
    name: 'Bonk',
    symbol: 'BONK',
    isNative: false,
    coingeckoId: 'bonk'
  },
  USDT: {
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // Mainnet USDT
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
    isNative: false,
    coingeckoId: 'tether'
  }
};

/**
 * Get token info by symbol
 * @param {string} symbol - Token symbol (e.g., 'SOL', 'USDC')
 * @returns {Object|null} Token info or null if not found
 */
function getTokenInfo(symbol) {
  const upperSymbol = symbol.toUpperCase();
  return SUPPORTED_TOKENS[upperSymbol] || null;
}

/**
 * Check if a token is supported
 * @param {string} symbol - Token symbol
 * @returns {boolean} True if supported
 */
function isTokenSupported(symbol) {
  return !!getTokenInfo(symbol);
}

/**
 * Get all supported token symbols
 * @returns {string[]} Array of supported token symbols
 */
function getSupportedTokens() {
  return Object.keys(SUPPORTED_TOKENS);
}

/**
 * Get token mint address
 * @param {string} symbol - Token symbol
 * @returns {string|null} Mint address or null
 */
function getTokenMint(symbol) {
  const token = getTokenInfo(symbol);
  return token ? token.mint : null;
}

/**
 * Get token decimals
 * @param {string} symbol - Token symbol
 * @returns {number|null} Decimals or null
 */
function getTokenDecimals(symbol) {
  const token = getTokenInfo(symbol);
  return token ? token.decimals : null;
}

/**
 * Format token amount for display
 * @param {number} amount - Raw amount
 * @param {string} symbol - Token symbol
 * @returns {string} Formatted amount with symbol
 */
function formatTokenAmount(amount, symbol) {
  const token = getTokenInfo(symbol);
  if (!token) return `${amount} ${symbol}`;
  
  // Format based on decimals
  const formatted = amount.toFixed(token.decimals > 2 ? 4 : 2);
  return `${formatted} ${token.symbol}`;
}

module.exports = {
  SUPPORTED_TOKENS,
  getTokenInfo,
  isTokenSupported,
  getSupportedTokens,
  getTokenMint,
  getTokenDecimals,
  formatTokenAmount
};
