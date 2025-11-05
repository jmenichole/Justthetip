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
const db = new Database(path.join(__dirname, 'justthetip.db'));

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
        balance REAL DEFAULT 0
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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
function recordTip(sender, receiver, amount, currency) {
  try {
    db.prepare(`
      INSERT INTO tips (sender, receiver, amount, currency)
      VALUES (?, ?, ?, ?)
    `).run(sender, receiver, amount, currency);
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

// Export functions
module.exports = {
  getUser,
  updateBalance,
  recordTip,
  getUserTransactions,
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
