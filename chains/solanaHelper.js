/**
 * JustTheTip - Solana Helper Module
 * Solana blockchain helper functions for JustTheTip bot
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

const { Connection, PublicKey } = require('@solana/web3.js');

function createSolanaPayUrl(recipient, amount, label, message) {
  const params = new URLSearchParams({
    recipient,
    amount: amount.toString(),
    label: label || 'JustTheTip Payment',
    message: message || 'Payment via JustTheTip Bot'
  });
  
  return `solana:${recipient}?${params.toString()}`;
}

async function getSolanaBalance(address, rpcUrl) {
  try {
    const connection = new Connection(rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return balance / 1000000000; // Convert lamports to SOL
  } catch (error) {
    console.error('Error getting Solana balance:', error);
    return 0;
  }
}

module.exports = {
  createSolanaPayUrl,
  getSolanaBalance
};