/**
 * JustTheTip - Pre-Generated Wallets Database Module
 * Database operations for wallet pre-generation system
 * 
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 * 
 * This file is part of JustTheTip.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * See LICENSE file in the project root for full license information.
 */

const sqlite = require('./db.js');
const crypto = require('crypto');

// Encryption key for private keys (use environment variable in production)
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || crypto.randomBytes(32);
const ALGORITHM = 'aes-256-gcm';

class PreGenWalletDb {
  
  /**
   * Encrypt private key for secure storage
   * @param {string} privateKey - Private key to encrypt
   * @returns {string} Encrypted private key with IV and auth tag
   */
  encryptPrivateKey(privateKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag ? cipher.getAuthTag().toString('hex') : '';
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt private key
   * @param {string} encryptedKey - Encrypted private key
   * @returns {string} Decrypted private key
   */
  decryptPrivateKey(encryptedKey) {
    try {
      const parts = encryptedKey.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = parts[1] ? Buffer.from(parts[1], 'hex') : null;
      const encrypted = parts[2] || parts[1];
      
      const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
      if (authTag && decipher.setAuthTag) {
        decipher.setAuthTag(authTag);
      }
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Error decrypting private key:', error);
      throw new Error('Failed to decrypt private key');
    }
  }

  /**
   * Store pre-generated wallet in database
   * @param {Object} walletData - Wallet data to store
   */
  storePreGeneratedWallet(walletData) {
    try {
      const encryptedPrivateKey = this.encryptPrivateKey(walletData.privateKey);
      
      const stmt = sqlite.db.prepare(`
        INSERT INTO pregen_wallets (
          wallet_id, public_key, private_key_encrypted, network, 
          status, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        walletData.walletId,
        walletData.publicKey,
        encryptedPrivateKey,
        walletData.network || 'solana',
        walletData.status || 'available',
        walletData.createdAt,
        walletData.expiresAt
      );
      
      return true;
    } catch (error) {
      console.error('Error storing pre-generated wallet:', error);
      throw error;
    }
  }

  /**
   * Get an available pre-generated wallet
   * @returns {Object|null} Available wallet or null
   */
  getAvailablePreGeneratedWallet() {
    try {
      const stmt = sqlite.db.prepare(`
        SELECT * FROM pregen_wallets 
        WHERE status = 'available' 
        AND expires_at > ? 
        ORDER BY created_at ASC 
        LIMIT 1
      `);
      
      const wallet = stmt.get(Date.now());
      
      if (wallet) {
        // Don't decrypt private key until claimed
        delete wallet.private_key_encrypted;
      }
      
      return wallet || null;
    } catch (error) {
      console.error('Error getting available pre-generated wallet:', error);
      return null;
    }
  }

  /**
   * Reserve a pre-generated wallet
   * @param {string} walletId - Wallet ID to reserve
   */
  reservePreGeneratedWallet(walletId) {
    try {
      const stmt = sqlite.db.prepare(`
        UPDATE pregen_wallets 
        SET status = 'reserved', reserved_at = ? 
        WHERE wallet_id = ? AND status = 'available'
      `);
      
      const result = stmt.run(Date.now(), walletId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error reserving pre-generated wallet:', error);
      throw error;
    }
  }

  /**
   * Claim a reserved wallet for a user
   * @param {string} walletId - Wallet ID to claim
   * @param {string} userId - Discord user ID
   * @param {Object} userData - Additional user data
   */
  claimPreGeneratedWallet(walletId, userId, userData = {}) {
    try {
      const stmt = sqlite.db.prepare(`
        UPDATE pregen_wallets 
        SET status = 'claimed', 
            claimed_at = ?, 
            claimed_by = ?,
            auth_method = ?,
            user_email = ?,
            discord_username = ?
        WHERE wallet_id = ? AND status = 'reserved'
      `);
      
      const result = stmt.run(
        Date.now(),
        userId,
        userData.authMethod || 'pregen',
        userData.email || null,
        userData.discordUsername || null,
        walletId
      );
      
      if (result.changes > 0) {
        // Also update the main wallet registration
        const walletData = this.getPreGeneratedWallet(walletId);
        if (walletData) {
          sqlite.saveUserWallet(userId, walletData.public_key);
        }
      }
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error claiming pre-generated wallet:', error);
      throw error;
    }
  }

  /**
   * Get pre-generated wallet by ID (with decrypted private key)
   * @param {string} walletId - Wallet ID
   * @returns {Object|null} Wallet data with decrypted private key
   */
  getPreGeneratedWallet(walletId) {
    try {
      const stmt = sqlite.db.prepare(`
        SELECT * FROM pregen_wallets WHERE wallet_id = ?
      `);
      
      const wallet = stmt.get(walletId);
      
      if (wallet && wallet.private_key_encrypted) {
        wallet.privateKey = this.decryptPrivateKey(wallet.private_key_encrypted);
        delete wallet.private_key_encrypted; // Remove encrypted version
      }
      
      return wallet || null;
    } catch (error) {
      console.error('Error getting pre-generated wallet:', error);
      return null;
    }
  }

  /**
   * Get wallet count by status
   * @returns {Object} Wallet counts by status
   */
  getPreGeneratedWalletCount() {
    try {
      const stmt = sqlite.db.prepare(`
        SELECT COUNT(*) as count FROM pregen_wallets 
        WHERE status = 'available' AND expires_at > ?
      `);
      
      const result = stmt.get(Date.now());
      return result ? result.count : 0;
    } catch (error) {
      console.error('Error getting pre-generated wallet count:', error);
      return 0;
    }
  }

  /**
   * Get detailed wallet pool statistics
   * @returns {Object} Detailed statistics
   */
  getPreGeneratedWalletStats() {
    try {
      const stmt = sqlite.db.prepare(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'available' AND expires_at > ?) as available,
          COUNT(*) FILTER (WHERE status = 'reserved') as reserved,
          COUNT(*) FILTER (WHERE status = 'claimed') as claimed,
          COUNT(*) FILTER (WHERE status = 'expired' OR expires_at <= ?) as expired,
          COUNT(*) as total
        FROM pregen_wallets
      `);
      
      const now = Date.now();
      const stats = stmt.get(now, now);
      
      return {
        available: stats.available || 0,
        reserved: stats.reserved || 0,
        claimed: stats.claimed || 0,
        expired: stats.expired || 0,
        total: stats.total || 0
      };
    } catch (error) {
      console.error('Error getting pre-generated wallet stats:', error);
      return {
        available: 0,
        reserved: 0,
        claimed: 0,
        expired: 0,
        total: 0
      };
    }
  }

  /**
   * Clean up expired pre-generated wallets
   * @returns {number} Number of wallets cleaned up
   */
  cleanupExpiredPreGeneratedWallets() {
    try {
      const stmt = sqlite.db.prepare(`
        UPDATE pregen_wallets 
        SET status = 'expired' 
        WHERE status IN ('available', 'reserved') 
        AND expires_at <= ?
      `);
      
      const result = stmt.run(Date.now());
      
      if (result.changes > 0) {
        console.log(`🧹 Cleaned up ${result.changes} expired pre-generated wallets`);
      }
      
      return result.changes;
    } catch (error) {
      console.error('Error cleaning up expired pre-generated wallets:', error);
      return 0;
    }
  }

  /**
   * Get user's wallet private key (for claimed wallets)
   * @param {string} userId - Discord user ID
   * @returns {string|null} Private key or null
   */
  getUserWalletPrivateKey(userId) {
    try {
      const stmt = sqlite.db.prepare(`
        SELECT private_key_encrypted FROM pregen_wallets 
        WHERE claimed_by = ? AND status = 'claimed'
        LIMIT 1
      `);
      
      const wallet = stmt.get(userId);
      
      if (wallet && wallet.private_key_encrypted) {
        return this.decryptPrivateKey(wallet.private_key_encrypted);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user wallet private key:', error);
      return null;
    }
  }

  /**
   * Get wallets by user
   * @param {string} userId - Discord user ID
   * @returns {Array} User's wallets
   */
  getUserPreGeneratedWallets(userId) {
    try {
      const stmt = sqlite.db.prepare(`
        SELECT wallet_id, public_key, network, status, claimed_at, auth_method
        FROM pregen_wallets 
        WHERE claimed_by = ?
        ORDER BY claimed_at DESC
      `);
      
      return stmt.all(userId);
    } catch (error) {
      console.error('Error getting user pre-generated wallets:', error);
      return [];
    }
  }

  /**
   * Record wallet pool statistics
   * @param {Object} stats - Statistics to record
   */
  recordWalletPoolStats(stats) {
    try {
      const stmt = sqlite.db.prepare(`
        INSERT INTO pregen_wallet_stats (
          timestamp, available_count, reserved_count, claimed_count, 
          expired_count, total_generated, pool_health
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        Date.now(),
        stats.available,
        stats.reserved,
        stats.claimed,
        stats.expired,
        stats.total,
        stats.healthStatus
      );
    } catch (error) {
      console.error('Error recording wallet pool stats:', error);
    }
  }

  /**
   * Get recent wallet pool statistics
   * @param {number} limit - Number of records to return
   * @returns {Array} Recent statistics
   */
  getRecentWalletPoolStats(limit = 24) {
    try {
      const stmt = sqlite.db.prepare(`
        SELECT * FROM pregen_wallet_stats 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
      
      return stmt.all(limit);
    } catch (error) {
      console.error('Error getting recent wallet pool stats:', error);
      return [];
    }
  }

  /**
   * Initialize pregen_wallets table if it doesn't exist (SQLite compatibility)
   */
  initializePreGenTables() {
    try {
      // Create pregen_wallets table
      sqlite.db.exec(`
        CREATE TABLE IF NOT EXISTS pregen_wallets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          wallet_id TEXT UNIQUE NOT NULL,
          public_key TEXT NOT NULL,
          private_key_encrypted TEXT NOT NULL,
          network TEXT DEFAULT 'solana',
          status TEXT DEFAULT 'available',
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          reserved_at INTEGER,
          claimed_at INTEGER,
          claimed_by TEXT,
          auth_method TEXT,
          user_email TEXT,
          discord_username TEXT
        )
      `);

      // Create indexes
      sqlite.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_pregen_wallets_status ON pregen_wallets(status);
        CREATE INDEX IF NOT EXISTS idx_pregen_wallets_expires_at ON pregen_wallets(expires_at);
        CREATE INDEX IF NOT EXISTS idx_pregen_wallets_claimed_by ON pregen_wallets(claimed_by);
      `);

      // Create stats table
      sqlite.db.exec(`
        CREATE TABLE IF NOT EXISTS pregen_wallet_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          available_count INTEGER DEFAULT 0,
          reserved_count INTEGER DEFAULT 0,
          claimed_count INTEGER DEFAULT 0,
          expired_count INTEGER DEFAULT 0,
          total_generated INTEGER DEFAULT 0,
          pool_health TEXT DEFAULT 'unknown'
        )
      `);

      console.log('✅ Pre-generated wallets tables initialized');
    } catch (error) {
      console.error('Error initializing pre-gen tables:', error);
    }
  }
}

module.exports = new PreGenWalletDb();