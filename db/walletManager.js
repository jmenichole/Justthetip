/**
 * JustTheTip - On-Demand Wallet Manager
 * Creates wallets only when users receive tips/airdrops without existing wallets
 * 
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 */

const sqlite = require('./db.js');
const crypto = require('crypto');
const { Keypair } = require('@solana/web3.js');

// Encryption key for private keys (use environment variable in production)
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || crypto.randomBytes(32);
const ALGORITHM = 'aes-256-gcm';

class WalletManager {
    
    /**
     * Encrypt private key for secure storage
     * @param {string} privateKey - Private key to encrypt
     * @returns {string} Encrypted private key with IV and auth tag
     */
    encryptPrivateKey(privateKey) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        
        let encrypted = cipher.update(privateKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag().toString('hex');
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
            const authTag = Buffer.from(parts[1], 'hex');
            const encrypted = parts[2];
            
            const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Error decrypting private key:', error);
            throw new Error('Failed to decrypt private key');
        }
    }
    
    /**
     * Generate new Solana wallet
     * @returns {Object} New wallet keypair and addresses
     */
    generateSolanaWallet() {
        const keypair = Keypair.generate();
        return {
            publicKey: keypair.publicKey.toString(),
            privateKey: Buffer.from(keypair.secretKey).toString('hex'),
            keypair: keypair
        };
    }
    
    /**
     * Check if user has an existing wallet
     * @param {string} userId - Discord user ID
     * @returns {Object|null} User's wallet data or null
     */
    getUserWallet(userId) {
        try {
            const stmt = sqlite.db.prepare(`
                SELECT user_id, wallet_address, created_at, auth_method 
                FROM user_wallets 
                WHERE user_id = ?
            `);
            
            return stmt.get(userId) || null;
        } catch (error) {
            console.error('Error getting user wallet:', error);
            return null;
        }
    }
    
    /**
     * Create wallet for user when they receive tip/airdrop
     * @param {string} userId - Discord user ID
     * @param {Object} userData - User context (username, etc.)
     * @param {string} trigger - What triggered wallet creation ('tip', 'airdrop')
     * @returns {Object} Created wallet info
     */
    async createWalletForUser(userId, userData = {}, trigger = 'tip') {
        try {
            // Check if user already has wallet
            const existingWallet = this.getUserWallet(userId);
            if (existingWallet) {
                console.log(`User ${userId} already has wallet: ${existingWallet.wallet_address}`);
                return {
                    success: true,
                    wallet: existingWallet,
                    created: false
                };
            }
            
            // Generate new wallet
            const newWallet = this.generateSolanaWallet();
            const encryptedPrivateKey = this.encryptPrivateKey(newWallet.privateKey);
            const walletId = crypto.randomUUID();
            
            // Store in database
            const stmt = sqlite.db.prepare(`
                INSERT INTO user_wallets (
                    user_id, wallet_address, wallet_id, private_key_encrypted,
                    network, auth_method, created_at, created_trigger,
                    discord_username, user_email
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                userId,
                newWallet.publicKey,
                walletId,
                encryptedPrivateKey,
                'solana',
                'auto-generated',
                Date.now(),
                trigger,
                userData.username || null,
                userData.email || null
            );
            
            console.log(`🆕 Created wallet for user ${userId} (${trigger}): ${newWallet.publicKey}`);
            
            return {
                success: true,
                wallet: {
                    user_id: userId,
                    wallet_address: newWallet.publicKey,
                    wallet_id: walletId,
                    network: 'solana',
                    created_at: Date.now()
                },
                created: true
            };
            
        } catch (error) {
            console.error('Error creating wallet for user:', error);
            throw error;
        }
    }
    
    /**
     * Get user's private key for transactions
     * @param {string} userId - Discord user ID
     * @returns {string|null} Decrypted private key or null
     */
    getUserPrivateKey(userId) {
        try {
            const stmt = sqlite.db.prepare(`
                SELECT private_key_encrypted 
                FROM user_wallets 
                WHERE user_id = ?
            `);
            
            const result = stmt.get(userId);
            
            if (result && result.private_key_encrypted) {
                return this.decryptPrivateKey(result.private_key_encrypted);
            }
            
            return null;
        } catch (error) {
            console.error('Error getting user private key:', error);
            return null;
        }
    }
    
    /**
     * Get wallet statistics
     * @returns {Object} Wallet creation stats
     */
    getWalletStats() {
        try {
            const stmt = sqlite.db.prepare(`
                SELECT 
                    COUNT(*) as total_wallets,
                    COUNT(*) FILTER (WHERE created_trigger = 'tip') as tip_created,
                    COUNT(*) FILTER (WHERE created_trigger = 'airdrop') as airdrop_created,
                    COUNT(*) FILTER (WHERE created_at > ?) as created_today
                FROM user_wallets
            `);
            
            const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
            const stats = stmt.get(dayAgo);
            
            return {
                total: stats.total_wallets || 0,
                tipCreated: stats.tip_created || 0,
                airdropCreated: stats.airdrop_created || 0,
                createdToday: stats.created_today || 0
            };
        } catch (error) {
            console.error('Error getting wallet stats:', error);
            return { total: 0, tipCreated: 0, airdropCreated: 0, createdToday: 0 };
        }
    }
    
    /**
     * Initialize user_wallets table with new schema
     */
    initializeWalletTables() {
        try {
            // Drop old pregen tables if they exist
            sqlite.db.exec(`DROP TABLE IF EXISTS pregen_wallets`);
            sqlite.db.exec(`DROP TABLE IF EXISTS pregen_wallet_stats`);
            
            // Create/update user_wallets table
            sqlite.db.exec(`
                CREATE TABLE IF NOT EXISTS user_wallets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT UNIQUE NOT NULL,
                    wallet_address TEXT NOT NULL,
                    wallet_id TEXT UNIQUE NOT NULL,
                    private_key_encrypted TEXT NOT NULL,
                    network TEXT DEFAULT 'solana',
                    auth_method TEXT DEFAULT 'auto-generated',
                    created_at INTEGER NOT NULL,
                    created_trigger TEXT DEFAULT 'manual',
                    discord_username TEXT,
                    user_email TEXT,
                    last_used_at INTEGER
                )
            `);
            
            // Create indexes
            sqlite.db.exec(`
                CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
                CREATE INDEX IF NOT EXISTS idx_user_wallets_wallet_address ON user_wallets(wallet_address);
                CREATE INDEX IF NOT EXISTS idx_user_wallets_created_trigger ON user_wallets(created_trigger);
            `);
            
            console.log('✅ On-demand wallet tables initialized');
        } catch (error) {
            console.error('Error initializing wallet tables:', error);
        }
    }
}

module.exports = new WalletManager();