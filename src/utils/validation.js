/**
 * JustTheTip - Shared Validation Utilities
 * Centralized validation functions to eliminate code duplication
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

const { PublicKey } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

/**
 * Validate Solana address
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid Solana address
 */
function isValidSolanaAddress(address) {
  // Basic Solana address validation
  if (!address || typeof address !== 'string') return false;
  
  // Solana addresses are base58 encoded and typically 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (!base58Regex.test(address)) return false;
  
  // Try to create PublicKey to ensure it's actually valid
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate amount is a positive number within reasonable bounds
 * @param {number} amount - Amount to validate
 * @param {number} max - Maximum allowed amount (default: 1000000)
 * @returns {boolean} True if valid amount
 */
function isValidAmount(amount, max = 1000000) {
  return typeof amount === 'number' && amount > 0 && amount <= max && !isNaN(amount);
}

/**
 * Check if coin is supported
 * @param {string} coin - Coin symbol to check
 * @returns {boolean} True if coin is supported
 */
function isSupportedCoin(coin) {
  const supported = ['SOL', 'USDC', 'LTC'];
  return supported.includes(coin.toUpperCase());
}

/**
 * Validate cryptocurrency address based on coin type
 * @param {string} address - Address to validate
 * @param {string} coin - Coin type (SOL, USDC, LTC, etc.)
 * @returns {boolean} True if valid address for the coin type
 */
function isValidAddress(address, coin) {
  if (!address || typeof address !== 'string') return false;
  
  switch (coin.toUpperCase()) {
    case 'SOL':
    case 'USDC':
      return isValidSolanaAddress(address);
    case 'LTC':
      return address.startsWith('L') || address.startsWith('M') || address.startsWith('ltc1');
    default:
      return false;
  }
}

/**
 * Sanitize user input string
 * @param {string} str - String to sanitize
 * @param {number} maxLength - Maximum length (default: 100)
 * @returns {string} Sanitized string
 */
function sanitizeString(str, maxLength = 100) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, maxLength);
}

/**
 * Verify Solana signature
 * @param {string} message - Original message that was signed
 * @param {string} signature - Base58 encoded signature
 * @param {string} publicKey - Public key/address of signer
 * @returns {boolean} True if signature is valid
 */
function verifySignature(message, signature, publicKey) {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = new PublicKey(publicKey).toBytes();
    
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

module.exports = {
  isValidSolanaAddress,
  isValidAmount,
  isSupportedCoin,
  isValidAddress,
  sanitizeString,
  verifySignature,
};
