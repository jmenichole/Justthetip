/**
 * JustTheTip - Trust Badge Service
 * Simplified wallet verification without NFT requirements (NFT feature coming later)
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

const logger = require('./logger');

async function fetchBadge(discordId) {
  if (!discordId) {
    throw new Error('Missing Discord user id');
  }

  const sqlite = require('../../db/db');
  const badge = sqlite.getTrustBadgeByDiscordId(discordId);
  return badge || null;
}

/**
 * Require that a user has registered their wallet (signature-verified)
 * NFT verification is a future feature
 * @param {string} discordId - Discord user ID
 * @returns {Object} Badge/wallet info
 */
async function requireBadge(discordId) {
  const badge = await fetchBadge(discordId);
  if (!badge) {
    throw new Error('User is not verified. Please use /register-wallet to link your Solana wallet.');
  }

  // For now, we trust that the wallet was signature-verified during registration
  // NFT on-chain verification will be added as a future feature
  return badge;
}

async function adjustReputation(discordId, delta) {
  const sqlite = require('../../db/db');
  sqlite.updateReputationScore(discordId, delta);
  const score = sqlite.getReputationScore(discordId);
  return score;
}

module.exports = {
  fetchBadge,
  requireBadge,
  adjustReputation,
};
