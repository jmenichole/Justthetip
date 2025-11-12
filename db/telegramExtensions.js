/**
 * Database Extensions for Telegram Support
 * Extends existing database with Telegram-specific methods
 * Author: 4eckd
 */

const logger = require('../src/utils/logger');

/**
 * Initialize Telegram tables (SQLite)
 */
function initializeTelegramTables(db) {
  logger.info('Initializing Telegram database tables...');

  // Extend users table for Telegram
  db.exec(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'discord';
  `).catch(() => {
    // Columns may already exist, ignore error
  });

  // Telegram tips table
  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_tips (
      id TEXT PRIMARY KEY,
      sender_telegram_id TEXT NOT NULL,
      sender_username TEXT,
      recipient_telegram_id TEXT NOT NULL,
      recipient_username TEXT,
      chat_id TEXT NOT NULL,
      chat_type TEXT NOT NULL,
      message_id INTEGER,
      reply_to_message_id INTEGER,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      amount_usd REAL,
      signature TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      signed_at TEXT,
      confirmed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_telegram_tips_sender
      ON telegram_tips(sender_telegram_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_telegram_tips_recipient
      ON telegram_tips(recipient_telegram_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_telegram_tips_status
      ON telegram_tips(status);
  `);

  // Telegram chats table
  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_chats (
      chat_id TEXT PRIMARY KEY,
      chat_type TEXT NOT NULL,
      title TEXT,
      username TEXT,
      registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
      active BOOLEAN DEFAULT TRUE
    );
  `);

  // Registration nonces table (if not exists)
  db.exec(`
    CREATE TABLE IF NOT EXISTS registration_nonces (
      nonce TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      used BOOLEAN DEFAULT FALSE
    );

    CREATE INDEX IF NOT EXISTS idx_nonces_user
      ON registration_nonces(user_id, platform);
    CREATE INDEX IF NOT EXISTS idx_nonces_expiry
      ON registration_nonces(expires_at);
  `);

  logger.info('Telegram tables initialized');
}

/**
 * Database method extensions
 */
const telegramMethods = {
  /**
   * Get user by Telegram ID
   */
  getUserByTelegramId(telegramId) {
    return this.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  },

  /**
   * Create or update Telegram user
   */
  upsertTelegramUser(data) {
    const { telegramId, username, wallet } = data;

    return this.prepare(`
      INSERT INTO users (telegram_id, telegram_username, wallet, platform)
      VALUES (?, ?, ?, 'telegram')
      ON CONFLICT(telegram_id) DO UPDATE SET
        telegram_username = excluded.telegram_username,
        wallet = COALESCE(excluded.wallet, wallet)
    `).run(telegramId, username, wallet);
  },

  /**
   * Create Telegram tip
   */
  createTelegramTip(tip) {
    return this.prepare(`
      INSERT INTO telegram_tips (
        id, sender_telegram_id, sender_username, recipient_telegram_id,
        recipient_username, chat_id, chat_type, message_id, reply_to_message_id,
        amount, currency, amount_usd, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tip.id,
      tip.senderTelegramId,
      tip.senderUsername,
      tip.recipientTelegramId,
      tip.recipientUsername,
      tip.chatId,
      tip.chatType,
      tip.messageId,
      tip.replyToMessageId,
      tip.amount,
      tip.currency,
      tip.amountUsd,
      tip.status || 'pending'
    );
  },

  /**
   * Get Telegram tip by ID
   */
  getTelegramTipById(tipId) {
    return this.prepare('SELECT * FROM telegram_tips WHERE id = ?').get(tipId);
  },

  /**
   * Update Telegram tip
   */
  updateTelegramTip(tipId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(f => `${f} = ?`).join(', ');

    return this.prepare(`
      UPDATE telegram_tips SET ${setClause} WHERE id = ?
    `).run(...values, tipId);
  },

  /**
   * Update Telegram tip status
   */
  updateTelegramTipStatus(tipId, status, signature = null) {
    if (signature) {
      return this.prepare(`
        UPDATE telegram_tips SET status = ?, signature = ? WHERE id = ?
      `).run(status, signature, tipId);
    }

    return this.prepare(`
      UPDATE telegram_tips SET status = ? WHERE id = ?
    `).run(status, tipId);
  },

  /**
   * Get tips by sender
   */
  getTelegramTipsBySender(telegramId, limit = 50) {
    return this.prepare(`
      SELECT * FROM telegram_tips
      WHERE sender_telegram_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(telegramId, limit);
  },

  /**
   * Get tips by recipient
   */
  getTelegramTipsByRecipient(telegramId, limit = 50) {
    return this.prepare(`
      SELECT * FROM telegram_tips
      WHERE recipient_telegram_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(telegramId, limit);
  },

  /**
   * Create registration nonce
   */
  createRegistrationNonce(data) {
    const { nonce, telegramId, platform, expiresAt } = data;

    return this.prepare(`
      INSERT INTO registration_nonces (nonce, user_id, platform, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(nonce, telegramId, platform, expiresAt.toISOString());
  },

  /**
   * Get and validate nonce
   */
  validateNonce(nonce) {
    const nonceData = this.prepare(`
      SELECT * FROM registration_nonces
      WHERE nonce = ? AND used = FALSE AND expires_at > datetime('now')
    `).get(nonce);

    if (nonceData) {
      // Mark as used
      this.prepare(`
        UPDATE registration_nonces SET used = TRUE WHERE nonce = ?
      `).run(nonce);
    }

    return nonceData;
  },

  /**
   * Register Telegram chat
   */
  registerTelegramChat(chatData) {
    return this.prepare(`
      INSERT INTO telegram_chats (chat_id, chat_type, title, username)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(chat_id) DO UPDATE SET
        title = excluded.title,
        username = excluded.username
    `).run(chatData.chatId, chatData.chatType, chatData.title, chatData.username);
  }
};

/**
 * Extend database with Telegram methods
 */
function extendDatabaseWithTelegram(db) {
  // Initialize tables
  initializeTelegramTables(db);

  // Add methods
  Object.assign(db, telegramMethods);

  // Add group support
  const { extendDatabaseWithGroups } = require('./telegramGroupExtensions');
  extendDatabaseWithGroups(db);

  logger.info('Database extended with Telegram support');
}

module.exports = {
  extendDatabaseWithTelegram,
  telegramMethods
};
