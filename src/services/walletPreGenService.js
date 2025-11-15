/**
 * JustTheTip - Solana Wallet Pre-Generation Service
 * Creates Solana wallets in advance to speed up user registration
 * 
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 * 
 * This file is part of JustTheTip.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * See LICENSE file in the project root for full license information.
 */

const { Keypair, PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');
const crypto = require('crypto');

class WalletPreGenService {
  constructor(database) {
    this.db = database;
    this.isGenerating = false;
    this.targetPoolSize = parseInt(process.env.PREGEN_POOL_SIZE) || 100;
    this.minPoolSize = parseInt(process.env.PREGEN_MIN_POOL_SIZE) || 20;
    this.batchSize = parseInt(process.env.PREGEN_BATCH_SIZE) || 10;
    
    // Start background generation
    this.startBackgroundGeneration();
  }

  /**
   * Generate a single Solana wallet
   * @returns {Object} Wallet data
   */
  generateSolanaWallet() {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const privateKey = bs58.encode(keypair.secretKey);
    
    // Generate secure wallet ID
    const walletId = crypto.randomBytes(16).toString('hex');
    
    return {
      walletId,
      publicKey,
      privateKey,
      network: 'solana',
      status: 'available',
      createdAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };
  }

  /**
   * Generate multiple wallets in batch
   * @param {number} count - Number of wallets to generate
   * @returns {Array} Array of wallet data
   */
  async generateWalletBatch(count = this.batchSize) {
    const wallets = [];
    
    for (let i = 0; i < count; i++) {
      const wallet = this.generateSolanaWallet();
      wallets.push(wallet);
    }
    
    // Store in database
    await this.storePreGeneratedWallets(wallets);
    
    console.log(`✅ Generated ${count} pre-generated wallets`);
    return wallets;
  }

  /**
   * Store pre-generated wallets in database
   * @param {Array} wallets - Array of wallet data
   */
  async storePreGeneratedWallets(wallets) {
    try {
      for (const wallet of wallets) {
        await this.db.storePreGeneratedWallet(wallet);
      }
    } catch (error) {
      console.error('Error storing pre-generated wallets:', error);
      throw error;
    }
  }

  /**
   * Get an available pre-generated wallet
   * @returns {Object|null} Wallet data or null if none available
   */
  async getAvailableWallet() {
    try {
      const wallet = await this.db.getAvailablePreGeneratedWallet();
      
      if (wallet) {
        // Mark wallet as reserved
        await this.db.reservePreGeneratedWallet(wallet.walletId);
        
        // Trigger background generation if pool is getting low
        const poolSize = await this.db.getPreGeneratedWalletCount();
        if (poolSize < this.minPoolSize) {
          this.triggerBackgroundGeneration();
        }
        
        console.log(`🎯 Allocated pre-generated wallet: ${wallet.publicKey}`);
      }
      
      return wallet;
    } catch (error) {
      console.error('Error getting available wallet:', error);
      return null;
    }
  }

  /**
   * Claim a reserved wallet for a user
   * @param {string} walletId - Wallet ID
   * @param {string} userId - Discord user ID
   * @param {Object} userData - Additional user data
   */
  async claimWallet(walletId, userId, userData = {}) {
    try {
      await this.db.claimPreGeneratedWallet(walletId, userId, userData);
      console.log(`✅ Wallet ${walletId} claimed by user ${userId}`);
    } catch (error) {
      console.error('Error claiming wallet:', error);
      throw error;
    }
  }

  /**
   * Get pool statistics
   * @returns {Object} Pool statistics
   */
  async getPoolStats() {
    try {
      const stats = await this.db.getPreGeneratedWalletStats();
      return {
        ...stats,
        targetPoolSize: this.targetPoolSize,
        minPoolSize: this.minPoolSize,
        healthStatus: stats.available >= this.minPoolSize ? 'healthy' : 'low'
      };
    } catch (error) {
      console.error('Error getting pool stats:', error);
      return {
        available: 0,
        reserved: 0,
        claimed: 0,
        total: 0,
        targetPoolSize: this.targetPoolSize,
        minPoolSize: this.minPoolSize,
        healthStatus: 'error'
      };
    }
  }

  /**
   * Start background wallet generation
   */
  startBackgroundGeneration() {
    // Initial generation
    setTimeout(() => {
      this.ensurePoolSize();
    }, 5000); // Start after 5 seconds

    // Periodic maintenance every 10 minutes
    setInterval(() => {
      this.maintainPool();
    }, 10 * 60 * 1000);
  }

  /**
   * Ensure pool has minimum wallets
   */
  async ensurePoolSize() {
    if (this.isGenerating) return;

    try {
      const stats = await this.getPoolStats();
      
      if (stats.available < this.minPoolSize) {
        const needed = this.targetPoolSize - stats.available;
        console.log(`🔄 Pool low (${stats.available}/${this.minPoolSize}). Generating ${needed} wallets...`);
        
        await this.generateWalletBatch(needed);
      }
    } catch (error) {
      console.error('Error ensuring pool size:', error);
    }
  }

  /**
   * Trigger background generation
   */
  triggerBackgroundGeneration() {
    if (this.isGenerating) return;
    
    setTimeout(() => {
      this.ensurePoolSize();
    }, 1000);
  }

  /**
   * Maintain pool health
   */
  async maintainPool() {
    try {
      // Clean up expired wallets
      await this.db.cleanupExpiredPreGeneratedWallets();
      
      // Ensure pool size
      await this.ensurePoolSize();
      
      // Log stats
      const stats = await this.getPoolStats();
      console.log(`📊 Wallet Pool: ${stats.available} available, ${stats.reserved} reserved, ${stats.claimed} claimed`);
    } catch (error) {
      console.error('Error maintaining pool:', error);
    }
  }

  /**
   * Fast registration flow using pre-generated wallet
   * @param {string} userId - Discord user ID
   * @param {Object} options - Registration options
   * @returns {Object} Registration result
   */
  async fastRegister(userId, options = {}) {
    try {
      // Get pre-generated wallet
      const wallet = await this.getAvailableWallet();
      
      if (!wallet) {
        // Fallback to real-time generation
        console.log('⚠️ No pre-generated wallets available, generating on-demand');
        const newWallet = this.generateSolanaWallet();
        
        // Store and claim immediately
        await this.storePreGeneratedWallets([newWallet]);
        await this.claimWallet(newWallet.walletId, userId, {
          authMethod: options.authMethod || 'pregen',
          email: options.email,
          discordUsername: options.discordUsername
        });
        
        return {
          success: true,
          walletAddress: newWallet.publicKey,
          method: 'real-time',
          registrationTime: Date.now()
        };
      }
      
      // Claim the pre-generated wallet
      await this.claimWallet(wallet.walletId, userId, {
        authMethod: options.authMethod || 'pregen',
        email: options.email,
        discordUsername: options.discordUsername
      });
      
      return {
        success: true,
        walletAddress: wallet.publicKey,
        method: 'pre-generated',
        registrationTime: Date.now(),
        walletId: wallet.walletId
      };
      
    } catch (error) {
      console.error('Error in fast registration:', error);
      throw error;
    }
  }

  /**
   * Get wallet private key for user (for Magic integration)
   * @param {string} userId - Discord user ID
   * @returns {string|null} Private key or null
   */
  async getUserWalletPrivateKey(userId) {
    try {
      return await this.db.getUserWalletPrivateKey(userId);
    } catch (error) {
      console.error('Error getting user wallet private key:', error);
      return null;
    }
  }

  /**
   * Admin function to manually generate wallets
   * @param {number} count - Number of wallets to generate
   */
  async adminGenerateWallets(count) {
    if (count > 1000) {
      throw new Error('Cannot generate more than 1000 wallets at once');
    }
    
    const batches = Math.ceil(count / this.batchSize);
    let totalGenerated = 0;
    
    for (let i = 0; i < batches; i++) {
      const batchCount = Math.min(this.batchSize, count - totalGenerated);
      await this.generateWalletBatch(batchCount);
      totalGenerated += batchCount;
      
      // Small delay between batches
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return totalGenerated;
  }
}

module.exports = WalletPreGenService;