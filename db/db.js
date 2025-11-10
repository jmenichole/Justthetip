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
        mint_address TEXT,
        reputation_score INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_trust_badges_wallet ON trust_badges(wallet_address)');

    // Pending tips table - for tips sent to unregistered users
    db.exec(`
      CREATE TABLE IF NOT EXISTS pending_tips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        amount_in_usd REAL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        notified INTEGER DEFAULT 0,
        FOREIGN KEY(sender_id) REFERENCES users(id),
        FOREIGN KEY(receiver_id) REFERENCES users(id)
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_pending_tips_receiver ON pending_tips(receiver_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_pending_tips_expires ON pending_tips(expires_at)');

    // Airdrops table
    db.exec(`
      CREATE TABLE IF NOT EXISTS airdrops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        airdrop_id TEXT UNIQUE NOT NULL,
        creator_id TEXT NOT NULL,
        creator_name TEXT,
        currency TEXT NOT NULL,
        total_amount REAL NOT NULL,
        amount_per_user REAL NOT NULL,
        max_recipients INTEGER NOT NULL,
        claimed_count INTEGER DEFAULT 0,
        message TEXT,
        duration TEXT,
        expires_at INTEGER NOT NULL,
        active INTEGER DEFAULT 1,
        message_id TEXT,
        channel_id TEXT,
        guild_id TEXT,
        claimed_users TEXT DEFAULT '[]',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_airdrops_id ON airdrops(airdrop_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_airdrops_creator ON airdrops(creator_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_airdrops_expires ON airdrops(expires_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_airdrops_active ON airdrops(active)');

    // Pending airdrops table
    db.exec(`
      CREATE TABLE IF NOT EXISTS pending_airdrops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        airdrop_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        claimed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at INTEGER NOT NULL,
        credited INTEGER DEFAULT 0,
        UNIQUE(airdrop_id, user_id)
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_pending_airdrops_user ON pending_airdrops(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_pending_airdrops_airdrop ON pending_airdrops(airdrop_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_pending_airdrops_expires ON pending_airdrops(expires_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_pending_airdrops_credited ON pending_airdrops(credited)');

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

/**
 * Get tip statistics for a user
 * @param {string} userId - Discord user ID
 * @returns {Object} Statistics object with sent, received, and totals
 */
function getUserTipStats(userId) {
  try {
    // Get tips sent
    const sentStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total, currency
      FROM tips
      WHERE sender = ?
      GROUP BY currency
    `).all(userId);

    // Get tips received
    const receivedStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total, currency
      FROM tips
      WHERE receiver = ?
      GROUP BY currency
    `).all(userId);

    // Get top recipients (users this user has tipped the most)
    const topRecipients = db.prepare(`
      SELECT receiver, COUNT(*) as tip_count, SUM(amount) as total_amount
      FROM tips
      WHERE sender = ?
      GROUP BY receiver
      ORDER BY total_amount DESC
      LIMIT 5
    `).all(userId);

    // Get top senders (users who have tipped this user the most)
    const topSenders = db.prepare(`
      SELECT sender, COUNT(*) as tip_count, SUM(amount) as total_amount
      FROM tips
      WHERE receiver = ?
      GROUP BY sender
      ORDER BY total_amount DESC
      LIMIT 5
    `).all(userId);

    return {
      sent: sentStats,
      received: receivedStats,
      topRecipients,
      topSenders
    };
  } catch (error) {
    console.error('Error getting user tip stats:', error);
    return { sent: [], received: [], topRecipients: [], topSenders: [] };
  }
}

/**
 * Get global tip statistics
 * @returns {Object} Global statistics
 */
function getGlobalTipStats() {
  try {
    // Total tips and volume
    const totals = db.prepare(`
      SELECT COUNT(*) as total_tips, COALESCE(SUM(amount), 0) as total_volume, currency
      FROM tips
      GROUP BY currency
    `).all();

    // Top tippers (by amount sent)
    const topTippers = db.prepare(`
      SELECT sender, COUNT(*) as tip_count, SUM(amount) as total_sent
      FROM tips
      GROUP BY sender
      ORDER BY total_sent DESC
      LIMIT 10
    `).all();

    // Top receivers (by amount received)
    const topReceivers = db.prepare(`
      SELECT receiver, COUNT(*) as tip_count, SUM(amount) as total_received
      FROM tips
      GROUP BY receiver
      ORDER BY total_received DESC
      LIMIT 10
    `).all();

    // Recent activity (last 24 hours)
    const recentActivity = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as volume
      FROM tips
      WHERE created_at > datetime('now', '-24 hours')
    `).get();

    return {
      totals,
      topTippers,
      topReceivers,
      recentActivity
    };
  } catch (error) {
    console.error('Error getting global tip stats:', error);
    return { totals: [], topTippers: [], topReceivers: [], recentActivity: { count: 0, volume: 0 } };
  }
}

/**
 * Create a pending tip for an unregistered user
 * @param {string} senderId - Sender's Discord ID
 * @param {string} receiverId - Receiver's Discord ID
 * @param {number} amount - Tip amount in SOL
 * @param {string} currency - Currency (SOL)
 * @param {number} amountInUsd - Original USD amount if specified
 * @returns {Object} Created pending tip
 */
function createPendingTip(senderId, receiverId, amount, currency, amountInUsd = null) {
  try {
    // Ensure both users exist in the database
    getUser(senderId);
    getUser(receiverId);
    
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
    
    const result = db.prepare(`
      INSERT INTO pending_tips (sender_id, receiver_id, amount, currency, amount_in_usd, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(senderId, receiverId, amount, currency, amountInUsd, expiresAt);

    return db.prepare('SELECT * FROM pending_tips WHERE id = ?').get(result.lastInsertRowid);
  } catch (error) {
    console.error('Error creating pending tip:', error);
    throw error;
  }
}

/**
 * Mark a pending tip as notified
 * @param {number} tipId - Pending tip ID
 */
function markPendingTipNotified(tipId) {
  try {
    db.prepare('UPDATE pending_tips SET notified = 1 WHERE id = ?').run(tipId);
  } catch (error) {
    console.error('Error marking pending tip as notified:', error);
  }
}

/**
 * Get all pending tips for a user
 * @param {string} receiverId - Receiver's Discord ID
 * @returns {Array} Array of pending tips
 */
function getPendingTipsForUser(receiverId) {
  try {
    return db.prepare(`
      SELECT * FROM pending_tips 
      WHERE receiver_id = ? AND expires_at > datetime('now')
      ORDER BY created_at DESC
    `).all(receiverId);
  } catch (error) {
    console.error('Error getting pending tips:', error);
    return [];
  }
}

/**
 * Get expired pending tips that need to be returned
 * @returns {Array} Array of expired pending tips
 */
function getExpiredPendingTips() {
  try {
    return db.prepare(`
      SELECT * FROM pending_tips 
      WHERE expires_at <= datetime('now')
    `).all();
  } catch (error) {
    console.error('Error getting expired pending tips:', error);
    return [];
  }
}

/**
 * Delete a pending tip (after processing or expiry)
 * @param {number} tipId - Pending tip ID
 */
function deletePendingTip(tipId) {
  try {
    db.prepare('DELETE FROM pending_tips WHERE id = ?').run(tipId);
  } catch (error) {
    console.error('Error deleting pending tip:', error);
  }
}

/**
 * Get total pending tips amount for a receiver
 * @param {string} receiverId - Receiver's Discord ID
 * @returns {Object} Total pending tips by currency
 */
function getPendingTipsTotal(receiverId) {
  try {
    const totals = db.prepare(`
      SELECT currency, SUM(amount) as total
      FROM pending_tips
      WHERE receiver_id = ? AND expires_at > datetime('now')
      GROUP BY currency
    `).all(receiverId);
    
    const result = {};
    totals.forEach(t => {
      result[t.currency] = t.total;
    });
    return result;
  } catch (error) {
    console.error('Error getting pending tips total:', error);
    return {};
  }
}

/**
 * ==========================================
 * AIRDROP MANAGEMENT FUNCTIONS
 * ==========================================
 */

/**
 * Create a new airdrop
 * @param {Object} airdropData - Airdrop configuration
 * @returns {boolean} Success status
 */
function createAirdrop(airdropData) {
  try {
    const stmt = db.prepare(`
      INSERT INTO airdrops (
        airdrop_id, creator_id, creator_name, currency, total_amount,
        amount_per_user, max_recipients, message, duration, expires_at,
        active, message_id, channel_id, guild_id, claimed_users
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      airdropData.airdropId,
      airdropData.creator,
      airdropData.creatorName,
      airdropData.currency,
      airdropData.totalAmount,
      airdropData.amountPerUser,
      airdropData.maxRecipients,
      airdropData.message,
      airdropData.duration,
      airdropData.expiresAt,
      airdropData.active ? 1 : 0,
      airdropData.messageId,
      airdropData.channelId,
      airdropData.guildId,
      '[]' // Empty array for claimed users
    );
    
    return true;
  } catch (error) {
    console.error('Error creating airdrop:', error);
    return false;
  }
}

/**
 * Get airdrop data by ID
 * @param {string} airdropId - Airdrop ID
 * @returns {Object|null} Airdrop data
 */
function getAirdrop(airdropId) {
  try {
    const airdrop = db.prepare('SELECT * FROM airdrops WHERE airdrop_id = ?').get(airdropId);
    if (airdrop && airdrop.claimed_users) {
      airdrop.claimedUsers = JSON.parse(airdrop.claimed_users);
    }
    return airdrop;
  } catch (error) {
    console.error('Error getting airdrop:', error);
    return null;
  }
}

/**
 * Update airdrop data
 * @param {string} airdropId - Airdrop ID
 * @param {Object} updates - Fields to update
 * @returns {boolean} Success status
 */
function updateAirdrop(airdropId, updates) {
  try {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    
    const stmt = db.prepare(`UPDATE airdrops SET ${setClause} WHERE airdrop_id = ?`);
    stmt.run(...values, airdropId);
    return true;
  } catch (error) {
    console.error('Error updating airdrop:', error);
    return false;
  }
}

/**
 * Claim an airdrop for a user
 * @param {string} airdropId - Airdrop ID
 * @param {string} userId - User's Discord ID
 * @returns {boolean} Success status
 */
function claimAirdrop(airdropId, userId) {
  try {
    const airdrop = getAirdrop(airdropId);
    if (!airdrop) return false;
    
    const claimedUsers = airdrop.claimedUsers || [];
    if (claimedUsers.includes(userId)) return false;
    
    claimedUsers.push(userId);
    
    const stmt = db.prepare(`
      UPDATE airdrops 
      SET claimed_users = ?, claimed_count = ?
      WHERE airdrop_id = ?
    `);
    
    stmt.run(JSON.stringify(claimedUsers), claimedUsers.length, airdropId);
    return true;
  } catch (error) {
    console.error('Error claiming airdrop:', error);
    return false;
  }
}

/**
 * Create a pending airdrop for user without wallet
 * @param {Object} pendingData - Pending airdrop data
 * @returns {boolean} Success status
 */
function createPendingAirdrop(pendingData) {
  try {
    const stmt = db.prepare(`
      INSERT INTO pending_airdrops (airdrop_id, user_id, username, amount, currency, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      pendingData.airdropId,
      pendingData.userId,
      pendingData.username,
      pendingData.amount,
      pendingData.currency,
      pendingData.expiresAt
    );
    
    return true;
  } catch (error) {
    console.error('Error creating pending airdrop:', error);
    return false;
  }
}

/**
 * Get pending airdrops for a user
 * @param {string} userId - User's Discord ID
 * @returns {Array} Pending airdrops
 */
function getPendingAirdropsForUser(userId) {
  try {
    return db.prepare(`
      SELECT * FROM pending_airdrops 
      WHERE user_id = ? AND credited = 0 AND expires_at > ?
    `).all(userId, Date.now());
  } catch (error) {
    console.error('Error getting pending airdrops:', error);
    return [];
  }
}

/**
 * Credit a pending airdrop to user
 * @param {number} pendingId - Pending airdrop ID
 * @returns {boolean} Success status
 */
function creditPendingAirdrop(pendingId) {
  try {
    const stmt = db.prepare('UPDATE pending_airdrops SET credited = 1 WHERE id = ?');
    stmt.run(pendingId);
    return true;
  } catch (error) {
    console.error('Error crediting pending airdrop:', error);
    return false;
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
  getUserTipStats,
  getGlobalTipStats,
  createPendingTip,
  markPendingTipNotified,
  getPendingTipsForUser,
  getExpiredPendingTips,
  deletePendingTip,
  getPendingTipsTotal,
  // Airdrop methods
  createAirdrop,
  getAirdrop,
  updateAirdrop,
  claimAirdrop,
  createPendingAirdrop,
  getPendingAirdropsForUser,
  creditPendingAirdrop,
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
