'use strict';

const { PublicKey } = require('@solana/web3.js');
const logger = require('./logger');
const solanaDevTools = require('./solanaDevTools');

async function fetchBadge(discordId) {
  if (!discordId) {
    throw new Error('Missing Discord user id');
  }

  const sqlite = require('../../db/db');
  const badge = sqlite.getTrustBadgeByDiscordId(discordId);
  return badge || null;
}

async function confirmBadgeOnChain(walletAddress, mintAddress) {
  if (!walletAddress || !mintAddress) {
    return false;
  }

  try {
    const connection = solanaDevTools.getConnection('devnet');
    const owner = new PublicKey(walletAddress);
    const mint = new PublicKey(mintAddress);
    const accounts = await connection.getTokenAccountsByOwner(owner, { mint });
    return accounts.value.length > 0;
  } catch (error) {
    logger.error(`[trust-badge] Failed to confirm badge on-chain: ${error.message}`);
    return false;
  }
}

async function requireBadge(discordId) {
  const badge = await fetchBadge(discordId);
  if (!badge) {
    throw new Error('User is not verified with a TrustBadge NFT yet.');
  }

  const confirmed = await confirmBadgeOnChain(badge.wallet_address, badge.mint_address);
  if (!confirmed) {
    throw new Error('TrustBadge NFT could not be found on-chain. Ask the user to re-verify.');
  }

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
  confirmBadgeOnChain,
};
