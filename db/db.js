/**
 * JustTheTip - SQLite Database Module
 * Simple local database using better-sqlite3 for zero config
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const Database = require('better-sqlite3');
const path = require('path');

// Create or connect to local database
// For production deployments, consider using process.env.DB_PATH to override location
const useMemoryDatabase = !process.env.DATABASE_URL;
const DB_PATH = process.env.DB_PATH || (useMemoryDatabase ? ':memory:' : path.join(__dirname, 'justthetip.db'));
const db = new Database(DB_PATH);

if (useMemoryDatabase) {
  console.warn('⚠️  DATABASE_URL missing – using in-memory SQLite database for API fallback');
}

// Enable Write-Ahead Logging for better performance
db.pragma('journal_mode = WAL');

// Initialize database schema
function initDatabase() {
  try {
    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        wallet TEXT,
        balance REAL DEFAULT 0,
        reputation_score INTEGER DEFAULT 0,
        trust_badge_mint TEXT
      )
    `);

    // Tips table
    db.exec(`
      CREATE TABLE IF NOT EXISTS tips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT NOT NULL,
        receiver TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        signature TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    try {
      db.exec('ALTER TABLE tips ADD COLUMN signature TEXT');
    } catch (error) {
      if (!String(error.message).includes('duplicate column name')) {
        throw error;
      }
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS trust_badges (
        discord_id TEXT PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        mint_address TEXT NOT NULL,
        reputation_score INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_trust_badges_wallet ON trust_badges(wallet_address)');

    console.log('✅ SQLite database ready');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Initialize on module load
initDatabase();

/**
 * Get or create a user with default balance 0
 * @param {string} id - User ID
 * @returns {Object} User object
 */
function getUser(id) {
  try {
    // Try to get existing user
    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    
    // Create if doesn't exist
    if (!user) {
      db.prepare('INSERT INTO users (id, balance) VALUES (?, 0)').run(id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }
    
    return user;
  } catch (error) {
    console.error(`Error getting user ${id}:`, error);
    return { id, wallet: null, balance: 0 };
  }
}

/**
 * Update a user's balance
 * @param {string} id - User ID
 * @param {number} amount - Amount to add (can be negative)
 */
function updateBalance(id, amount) {
  try {
    // Ensure user exists
    getUser(id);
    
    // Update balance
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, id);
  } catch (error) {
    console.error(`Error updating balance for ${id}:`, error);
    throw error;
  }
}

/**
 * Record a tip in the database
 * @param {string} sender - Sender ID
 * @param {string} receiver - Receiver ID
 * @param {number} amount - Tip amount
 * @param {string} currency - Currency type
 */
function recordTip(sender, receiver, amount, currency, signature = null) {
  try {
    db.prepare(`
      INSERT INTO tips (sender, receiver, amount, currency, signature)
      VALUES (?, ?, ?, ?, ?)
    `).run(sender, receiver, amount, currency, signature);
  } catch (error) {
    console.error('Error recording tip:', error);
    throw error;
  }
}

/**
 * Get user's recent transactions (sent or received)
 * @param {string} id - User ID
 * @param {number} limit - Number of transactions to return (default 10)
 * @returns {Array} Array of transaction objects
 */
function getUserTransactions(id, limit = 10) {
  try {
    const transactions = db.prepare(`
      SELECT * FROM tips
      WHERE sender = ? OR receiver = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(id, id, limit);
    
    return transactions;
  } catch (error) {
    console.error(`Error getting transactions for ${id}:`, error);
    return [];
  }
}

function getRecentTips(limit = 20) {
  try {
    return db.prepare(`
      SELECT sender, receiver, amount, currency, created_at as timestamp, signature
      FROM tips
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);
  } catch (error) {
    console.error('Error fetching recent tips:', error);
    return [];
  }
}

function upsertTrustBadge(discordId, walletAddress, mintAddress, reputationScore = 0) {
  try {
    db.prepare(`
      INSERT INTO trust_badges (discord_id, wallet_address, mint_address, reputation_score)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET
        wallet_address = excluded.wallet_address,
        mint_address = excluded.mint_address,
        updated_at = CURRENT_TIMESTAMP
    `).run(discordId, walletAddress, mintAddress, reputationScore);

    db.prepare(`
      UPDATE users
      SET wallet = ?, trust_badge_mint = ?, reputation_score = COALESCE(reputation_score, 0)
      WHERE id = ?
    `).run(walletAddress, mintAddress, discordId);
  } catch (error) {
    console.error('Error upserting trust badge:', error);
    throw error;
  }
}

function getTrustBadgeByDiscordId(discordId) {
  try {
    return db.prepare('SELECT * FROM trust_badges WHERE discord_id = ?').get(discordId) || null;
  } catch (error) {
    console.error('Error fetching trust badge by discord id:', error);
    return null;
  }
}

function getTrustBadgeByWallet(walletAddress) {
  try {
    return db.prepare('SELECT * FROM trust_badges WHERE wallet_address = ?').get(walletAddress) || null;
  } catch (error) {
    console.error('Error fetching trust badge by wallet:', error);
    return null;
  }
}

function updateReputationScore(discordId, delta) {
  try {
    db.prepare(`
      UPDATE trust_badges
      SET reputation_score = MAX(reputation_score + ?, 0), updated_at = CURRENT_TIMESTAMP
      WHERE discord_id = ?
    `).run(delta, discordId);

    db.prepare(`
      UPDATE users
      SET reputation_score = MAX(COALESCE(reputation_score, 0) + ?, 0)
      WHERE id = ?
    `).run(delta, discordId);
  } catch (error) {
    console.error('Error updating reputation score:', error);
    throw error;
  }
}

function getReputationScore(discordId) {
  try {
    const row = db.prepare('SELECT reputation_score FROM trust_badges WHERE discord_id = ?').get(discordId);
    return row ? row.reputation_score : 0;
  } catch (error) {
    console.error('Error reading reputation score:', error);
    return 0;
  }
}

/**
 * Update wallet address for a user
 * @param {string} id - User ID
 * @param {string} walletAddress - Solana wallet address
 */
function updateWallet(id, walletAddress) {
  try {
    // Ensure user exists
    getUser(id);
    
    // Update wallet
    db.prepare('UPDATE users SET wallet = ? WHERE id = ?').run(walletAddress, id);
  } catch (error) {
    console.error(`Error updating wallet for ${id}:`, error);
    throw error;
  }
}

// Export functions
module.exports = {
  getUser,
  updateBalance,
  updateWallet,
  recordTip,
  getUserTransactions,
  getRecentTips,
  upsertTrustBadge,
  getTrustBadgeByDiscordId,
  getTrustBadgeByWallet,
  updateReputationScore,
  getReputationScore,
  db, // Export for testing
};

/*
// Example usage (commented out):

// Get or create a user
const user = getUser('123456789');
console.log(user); // { id: '123456789', wallet: null, balance: 0 }

// Update balance
updateBalance('123456789', 100);
updateBalance('123456789', -25);

// Record a tip
recordTip('123456789', '987654321', 10, 'SOL');

// Get user transactions
const transactions = getUserTransactions('123456789', 10);
console.log(transactions);
*/
