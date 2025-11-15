/**
 * Multi-Token Balance Checker for Solana
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

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
const { getTokenInfo, getSupportedTokens } = require('./tokenRegistry');

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

/**
 * Get SOL balance for a wallet
 * @param {Connection} connection - Solana connection
 * @param {string} walletAddress - Wallet public key as string
 * @returns {Promise<number>} SOL balance
 */
async function getSolBalance(connection, walletAddress) {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting SOL balance:', error);
    return 0;
  }
}

/**
 * Get SPL token balance for a wallet
 * @param {Connection} connection - Solana connection
 * @param {string} walletAddress - Wallet public key as string
 * @param {string} mintAddress - Token mint address
 * @param {number} decimals - Token decimals
 * @returns {Promise<number>} Token balance
 */
async function getSplTokenBalance(connection, walletAddress, mintAddress, _decimals) {
  try {
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(mintAddress);
    
    // Get associated token account address
    const tokenAccountAddress = await getAssociatedTokenAddress(
      mintPubkey,
      walletPubkey
    );
    
    // Get token account info
    const tokenAccount = await connection.getTokenAccountBalance(tokenAccountAddress);
    
    if (tokenAccount && tokenAccount.value) {
      return tokenAccount.value.uiAmount || 0;
    }
    
    return 0;
  } catch (error) {
    // Token account doesn't exist or other error
    if (error.message && error.message.includes('could not find account')) {
      return 0;
    }
    console.error(`Error getting SPL token balance for ${mintAddress}:`, error.message);
    return 0;
  }
}

/**
 * Get balance for a specific token
 * @param {string} walletAddress - Wallet address
 * @param {string} tokenSymbol - Token symbol (e.g., 'SOL', 'USDC')
 * @returns {Promise<number>} Token balance
 */
async function getTokenBalance(walletAddress, tokenSymbol) {
  const connection = new Connection(RPC_URL, 'confirmed');
  const tokenInfo = getTokenInfo(tokenSymbol);
  
  if (!tokenInfo) {
    throw new Error(`Unsupported token: ${tokenSymbol}`);
  }
  
  if (tokenInfo.isNative) {
    return await getSolBalance(connection, walletAddress);
  } else {
    return await getSplTokenBalance(
      connection,
      walletAddress,
      tokenInfo.mint,
      tokenInfo.decimals
    );
  }
}

/**
 * Get all token balances for a wallet
 * @param {string} walletAddress - Wallet address
 * @returns {Promise<Object>} Object with token symbols as keys and balances as values
 */
async function getAllTokenBalances(walletAddress) {
  const connection = new Connection(RPC_URL, 'confirmed');
  const supportedTokens = getSupportedTokens();
  const balances = {};
  
  // Get balances for all supported tokens
  const balancePromises = supportedTokens.map(async (symbol) => {
    const tokenInfo = getTokenInfo(symbol);
    
    if (tokenInfo.isNative) {
      balances[symbol] = await getSolBalance(connection, walletAddress);
    } else {
      balances[symbol] = await getSplTokenBalance(
        connection,
        walletAddress,
        tokenInfo.mint,
        tokenInfo.decimals
      );
    }
  });
  
  await Promise.all(balancePromises);
  
  return balances;
}

module.exports = {
  getTokenBalance,
  getAllTokenBalances,
  getSolBalance,
  getSplTokenBalance
};
