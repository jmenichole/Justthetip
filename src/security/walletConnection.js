/**
 * User Wallet Connection System
 * Allows users to connect their Phantom/Solflare wallets
 * Bot never stores private keys - users sign transactions themselves
 */

const { PublicKey, Transaction } = require('@solana/web3.js');
const bs58 = require('bs58');
const nacl = require('tweetnacl');

class WalletConnectionManager {
  constructor(database) {
    this.db = database;
    this.pendingConnections = new Map(); // sessionId -> { userId, challenge, expiresAt }
    this.CONNECTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate a connection challenge for wallet verification
   * @param {string} userId - Discord user ID
   * @returns {Object} - { sessionId, challenge, expiresAt }
   */
  generateChallenge(userId) {
    const sessionId = this._generateSessionId();
    const challenge = `Sign this message to connect your wallet to Just.The.Tip Discord Bot.\n\nSession: ${sessionId}\nUser ID: ${userId}\nTimestamp: ${Date.now()}`;
    const expiresAt = Date.now() + this.CONNECTION_TIMEOUT;

    this.pendingConnections.set(sessionId, {
      userId,
      challenge,
      expiresAt
    });

    return { sessionId, challenge, expiresAt };
  }

  /**
   * Verify wallet signature and save connection
   * @param {string} sessionId - Connection session ID
   * @param {string} walletAddress - User's wallet public key
   * @param {string} signature - Base58 encoded signature
   * @returns {Promise<boolean>} - Success status
   */
  async verifyAndConnect(sessionId, walletAddress, signature) {
    const pending = this.pendingConnections.get(sessionId);
    
    if (!pending) {
      throw new Error('Invalid or expired session');
    }

    if (Date.now() > pending.expiresAt) {
      this.pendingConnections.delete(sessionId);
      throw new Error('Session expired. Please try connecting again.');
    }

    // Verify the signature
    const publicKey = new PublicKey(walletAddress);
    const message = new TextEncoder().encode(pending.challenge);
    const signatureBytes = bs58.decode(signature);

    const isValid = nacl.sign.detached.verify(
      message,
      signatureBytes,
      publicKey.toBytes()
    );

    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // Save connection to database
    await this.db.collection('connectedWallets').updateOne(
      { userId: pending.userId },
      {
        $set: {
          walletAddress,
          connectedAt: new Date(),
          lastUsed: new Date(),
          verified: true
        }
      },
      { upsert: true }
    );

    // Clean up
    this.pendingConnections.delete(sessionId);

    // Log to audit trail
    await this.db.collection('auditLog').insertOne({
      action: 'WALLET_CONNECTED',
      userId: pending.userId,
      walletAddress,
      timestamp: new Date(),
      ip: null // Add IP tracking if needed
    });

    return true;
  }

  /**
   * Get connected wallet for user
   * @param {string} userId - Discord user ID
   * @returns {Promise<Object|null>} - Wallet info or null
   */
  async getConnectedWallet(userId) {
    const wallet = await this.db.collection('connectedWallets').findOne({ userId });
    return wallet;
  }

  /**
   * Disconnect wallet
   * @param {string} userId - Discord user ID
   * @returns {Promise<boolean>} - Success status
   */
  async disconnect(userId) {
    const result = await this.db.collection('connectedWallets').deleteOne({ userId });
    
    if (result.deletedCount > 0) {
      await this.db.collection('auditLog').insertOne({
        action: 'WALLET_DISCONNECTED',
        userId,
        timestamp: new Date()
      });
      return true;
    }
    
    return false;
  }

  /**
   * Update last used timestamp
   * @param {string} userId - Discord user ID
   */
  async updateLastUsed(userId) {
    await this.db.collection('connectedWallets').updateOne(
      { userId },
      { $set: { lastUsed: new Date() } }
    );
  }

  /**
   * Generate random session ID
   * @private
   */
  _generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Clean up expired pending connections
   */
  cleanupExpired() {
    const now = Date.now();
    for (const [sessionId, data] of this.pendingConnections.entries()) {
      if (now > data.expiresAt) {
        this.pendingConnections.delete(sessionId);
      }
    }
  }
}

module.exports = WalletConnectionManager;
