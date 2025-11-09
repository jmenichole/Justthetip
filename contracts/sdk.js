/**
 * JustTheTip SDK - Non-Custodial Solana Smart Contract SDK
 * 
 * Provides reusable functions for building non-custodial Discord bots on Solana.
 * No private keys are ever handled by this SDK - users sign transactions in their own wallets.
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
 * 
 * @module JustTheTipSDK
 * @author JustTheTip Bot Team
 */

const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createTransferInstruction } = require('@solana/spl-token');

/**
 * JustTheTip Smart Contract SDK
 * Provides enterprise-grade non-custodial Discord bot development tools
 */
class JustTheTipSDK {
  /**
   * Initialize the SDK
   * @param {string} rpcUrl - Solana RPC endpoint URL (defaults to mainnet)
   */
  constructor(rpcUrl = 'https://api.mainnet-beta.solana.com') {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.rpcUrl = rpcUrl;
  }

  /**
   * Create a SOL transfer instruction (unsigned)
   * 
   * @param {string} senderAddress - Sender's public key as string
   * @param {string} recipientAddress - Recipient's public key as string
   * @param {number} amount - Amount in SOL
   * @returns {Transaction|null} Unsigned transaction or null on error
   */
  createTipInstruction(senderAddress, recipientAddress, amount) {
    try {
      const sender = new PublicKey(senderAddress);
      const recipient = new PublicKey(recipientAddress);
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      if (lamports <= 0) {
        throw new Error('Amount must be positive');
      }

      const instruction = SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: recipient,
        lamports,
      });

      const transaction = new Transaction().add(instruction);
      return transaction;
    } catch (error) {
      console.error('Error creating tip instruction:', error.message);
      return null;
    }
  }

  /**
   * Create an SPL token transfer instruction (unsigned)
   * 
   * @param {string} senderAddress - Sender's public key as string
   * @param {string} recipientAddress - Recipient's public key as string
   * @param {string} mintAddress - SPL token mint address
   * @param {number} amount - Amount in token decimals
   * @param {number} decimals - Token decimals (default 6 for USDC)
   * @returns {Promise<Transaction|null>} Unsigned transaction or null on error
   */
  async createSPLTokenTransfer(senderAddress, recipientAddress, mintAddress, amount, decimals = 6) {
    try {
      const sender = new PublicKey(senderAddress);
      const recipient = new PublicKey(recipientAddress);
      const mint = new PublicKey(mintAddress);
      
      const tokenAmount = Math.floor(amount * Math.pow(10, decimals));

      if (tokenAmount <= 0) {
        throw new Error('Amount must be positive');
      }

      // Get associated token accounts
      const senderTokenAccount = await getAssociatedTokenAddress(mint, sender);
      const recipientTokenAccount = await getAssociatedTokenAddress(mint, recipient);

      const instruction = createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount,
        sender,
        tokenAmount
      );

      const transaction = new Transaction().add(instruction);
      return transaction;
    } catch (error) {
      console.error('Error creating SPL token transfer:', error.message);
      return null;
    }
  }

  /**
   * Generate Program Derived Address for a Discord user
   * 
   * Note: The default program ID is the system program for demonstration purposes.
   * In production, you should provide your actual deployed program ID.
   * 
   * @param {string} discordUserId - Discord user ID
   * @param {string} programId - Custom program ID (defaults to system program for demo)
   * @returns {Object|null} Object with {address: string, bump: number} or null on error
   */
  generateUserPDA(discordUserId, programId = '11111111111111111111111111111112') {
    try {
      const program = new PublicKey(programId);
      const seeds = [
        Buffer.from('justthetip'),
        Buffer.from(discordUserId),
      ];

      const [pda, bump] = PublicKey.findProgramAddressSync(seeds, program);
      
      return {
        address: pda.toString(),
        bump,
      };
    } catch (error) {
      console.error('Error generating PDA:', error.message);
      return null;
    }
  }

  /**
   * Get SOL balance for a wallet address
   * 
   * @param {string} walletAddress - Wallet public key as string
   * @returns {Promise<number>} Balance in SOL (0 on error)
   */
  async getBalance(walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting balance:', error.message);
      return 0;
    }
  }

  /**
   * Get SPL token balance for a wallet address
   * 
   * @param {string} walletAddress - Wallet public key as string
   * @param {string} mintAddress - SPL token mint address
   * @returns {Promise<number>} Token balance (0 on error)
   */
  async getSPLTokenBalance(walletAddress, mintAddress) {
    try {
      const wallet = new PublicKey(walletAddress);
      const mint = new PublicKey(mintAddress);
      
      const tokenAccount = await getAssociatedTokenAddress(mint, wallet);
      const balance = await this.connection.getTokenAccountBalance(tokenAccount);
      
      return parseFloat(balance.value.uiAmount || 0);
    } catch (error) {
      console.error('Error getting SPL token balance:', error.message);
      return 0;
    }
  }

  /**
   * Create multiple transfer instructions for airdrops
   * 
   * @param {string} senderAddress - Sender's public key as string
   * @param {Array<{pubkey: string, amount: number}>} recipients - Array of recipient objects
   * @returns {Transaction|null} Transaction with multiple transfer instructions or null on error
   */
  createAirdropInstructions(senderAddress, recipients) {
    try {
      const sender = new PublicKey(senderAddress);
      const transaction = new Transaction();

      for (const recipient of recipients) {
        const recipientPubkey = new PublicKey(recipient.pubkey);
        const lamports = Math.floor(recipient.amount * LAMPORTS_PER_SOL);

        if (lamports <= 0) {
          console.warn(`Skipping recipient ${recipient.pubkey} with invalid amount`);
          continue;
        }

        const instruction = SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: recipientPubkey,
          lamports,
        });

        transaction.add(instruction);
      }

      return transaction.instructions.length > 0 ? transaction : null;
    } catch (error) {
      console.error('Error creating airdrop instructions:', error.message);
      return null;
    }
  }

  /**
   * Validate a Solana address
   * 
   * @param {string} address - Address to validate
   * @returns {boolean} True if valid, false otherwise
   */
  validateAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get transaction status
   * 
   * @param {string} signature - Transaction signature
   * @returns {Promise<Object|null>} Transaction status or null on error
   */
  async getTransactionStatus(signature) {
    try {
      const status = await this.connection.getSignatureStatus(signature);
      return status;
    } catch (error) {
      console.error('Error getting transaction status:', error.message);
      return null;
    }
  }

  /**
   * Get recent blockhash for transaction
   * 
   * @returns {Promise<string|null>} Recent blockhash or null on error
   */
  async getRecentBlockhash() {
    try {
      const { blockhash } = await this.connection.getLatestBlockhash();
      return blockhash;
    } catch (error) {
      console.error('Error getting recent blockhash:', error.message);
      return null;
    }
  }
}

module.exports = { JustTheTipSDK };
