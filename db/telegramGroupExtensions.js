/**
 * Database Extensions for Telegram Group Features
 * Extends database with group-specific methods
 * Author: 4eckd
 */

const logger = require('../src/utils/logger');

/**
 * Initialize group-related tables
 */
function initializeGroupTables(db) {
  logger.info('Initializing Telegram group tables...');

  // Group settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_group_settings (
      chat_id TEXT PRIMARY KEY,
      allow_tipping BOOLEAN DEFAULT TRUE,
      min_tip_amount REAL DEFAULT 0.01,
      allowed_tokens TEXT DEFAULT 'SOL,USDC,BONK,USDT',
      require_registration BOOLEAN DEFAULT TRUE,
      enable_leaderboard BOOLEAN DEFAULT TRUE,
      enable_notifications BOOLEAN DEFAULT TRUE,
      enable_rain BOOLEAN DEFAULT TRUE,
      max_rain_recipients INTEGER DEFAULT 50,
      admin_telegram_ids TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // User activity tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_user_activity (
      chat_id TEXT NOT NULL,
      telegram_id TEXT NOT NULL,
      telegram_username TEXT,
      last_message_at TEXT DEFAULT CURRENT_TIMESTAMP,
      message_count INTEGER DEFAULT 1,
      PRIMARY KEY (chat_id, telegram_id)
    );

    CREATE INDEX IF NOT EXISTS idx_activity_chat_time
      ON telegram_user_activity(chat_id, last_message_at DESC);
  `);

  // Rain tips table
  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_rain (
      id TEXT PRIMARY KEY,
      sender_telegram_id TEXT NOT NULL,
      sender_username TEXT,
      chat_id TEXT NOT NULL,
      total_amount REAL NOT NULL,
      currency TEXT NOT NULL,
      recipient_count INTEGER NOT NULL,
      amount_per_recipient REAL NOT NULL,
      total_usd_value REAL,
      recipients TEXT NOT NULL,
      signature TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      confirmed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_rain_chat
      ON telegram_rain(chat_id, created_at DESC);
  `);

  // Banned users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_banned_users (
      chat_id TEXT NOT NULL,
      telegram_id TEXT NOT NULL,
      banned_by TEXT NOT NULL,
      reason TEXT,
      banned_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (chat_id, telegram_id)
    );
  `);

  logger.info('Group tables initialized');
}

/**
 * Group-related database methods
 */
const groupMethods = {
  /**
   * Get group settings
   */
  getTelegramGroupSettings(chatId) {
    return this.prepare('SELECT * FROM telegram_group_settings WHERE chat_id = ?').get(chatId);
  },

  /**
   * Create group settings
   */
  createTelegramGroupSettings(settings) {
    return this.prepare(`
      INSERT INTO telegram_group_settings (
        chat_id, allow_tipping, min_tip_amount, allowed_tokens,
        require_registration, enable_leaderboard, enable_notifications,
        enable_rain, max_rain_recipients
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      settings.chat_id,
      settings.allow_tipping,
      settings.min_tip_amount,
      settings.allowed_tokens,
      settings.require_registration,
      settings.enable_leaderboard,
      settings.enable_notifications,
      settings.enable_rain,
      settings.max_rain_recipients
    );
  },

  /**
   * Update group settings
   */
  updateTelegramGroupSettings(chatId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(f => `${f} = ?`).join(', ');

    return this.prepare(`
      UPDATE telegram_group_settings
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE chat_id = ?
    `).run(...values, chatId);
  },

  /**
   * Track user activity
   */
  trackTelegramUserActivity(chatId, telegramId, username) {
    return this.prepare(`
      INSERT INTO telegram_user_activity (chat_id, telegram_id, telegram_username, last_message_at, message_count)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)
      ON CONFLICT(chat_id, telegram_id) DO UPDATE SET
        last_message_at = CURRENT_TIMESTAMP,
        message_count = message_count + 1,
        telegram_username = excluded.telegram_username
    `).run(chatId, telegramId, username);
  },

  /**
   * Get active users in group
   */
  getActiveTelegramUsers(chatId, period = '24h') {
    const intervalMap = {
      '24h': '-1 day',
      '7d': '-7 days',
      '30d': '-30 days'
    };
    const interval = intervalMap[period] || '-1 day';

    return this.prepare(`
      SELECT a.telegram_id, a.telegram_username, u.wallet
      FROM telegram_user_activity a
      LEFT JOIN users u ON u.telegram_id = a.telegram_id
      WHERE a.chat_id = ?
        AND a.last_message_at > datetime('now', ?)
      ORDER BY a.last_message_at DESC
    `).all(chatId, interval);
  },

  /**
   * Create rain record
   */
  createTelegramRain(rain) {
    return this.prepare(`
      INSERT INTO telegram_rain (
        id, sender_telegram_id, sender_username, chat_id,
        total_amount, currency, recipient_count, amount_per_recipient,
        total_usd_value, recipients, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rain.id,
      rain.senderTelegramId,
      rain.senderUsername,
      rain.chatId,
      rain.totalAmount,
      rain.currency,
      rain.recipientCount,
      rain.amountPerRecipient,
      rain.totalUsdValue,
      rain.recipients,
      rain.status || 'pending'
    );
  },

  /**
   * Get rain by ID
   */
  getTelegramRainById(rainId) {
    return this.prepare('SELECT * FROM telegram_rain WHERE id = ?').get(rainId);
  },

  /**
   * Update rain status
   */
  updateTelegramRainStatus(rainId, status, signature = null) {
    if (signature) {
      return this.prepare(`
        UPDATE telegram_rain
        SET status = ?, signature = ?, confirmed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, signature, rainId);
    }

    return this.prepare(`
      UPDATE telegram_rain SET status = ? WHERE id = ?
    `).run(status, rainId);
  },

  /**
   * Get group leaderboard
   */
  getGroupLeaderboard(chatId, interval, limit = 10) {
    return this.prepare(`
      SELECT
        sender_telegram_id,
        sender_username as telegram_username,
        COUNT(*) as tip_count,
        SUM(amount_usd) as total_usd,
        currency as top_token
      FROM telegram_tips
      WHERE chat_id = ?
        AND status = 'confirmed'
        AND created_at > datetime('now', ?)
      GROUP BY sender_telegram_id
      ORDER BY total_usd DESC
      LIMIT ?
    `).all(chatId, interval, limit);
  },

  /**
   * Get global leaderboard
   */
  getGlobalLeaderboard(interval, limit = 10) {
    return this.prepare(`
      SELECT
        sender_telegram_id,
        sender_username as telegram_username,
        COUNT(*) as tip_count,
        SUM(amount_usd) as total_usd,
        currency as top_token
      FROM telegram_tips
      WHERE status = 'confirmed'
        AND created_at > datetime('now', ?)
      GROUP BY sender_telegram_id
      ORDER BY total_usd DESC
      LIMIT ?
    `).all(interval, limit);
  },

  /**
   * Get group statistics
   */
  getTelegramGroupStats(chatId) {
    const stats = {};

    // Total tips and volume
    const totals = this.prepare(`
      SELECT
        COUNT(*) as total_tips,
        COALESCE(SUM(amount_usd), 0) as total_volume_usd
      FROM telegram_tips
      WHERE chat_id = ? AND status = 'confirmed'
    `).get(chatId);

    Object.assign(stats, totals);

    // Last 24 hours
    const day = this.prepare(`
      SELECT
        COUNT(*) as tips_24h,
        COALESCE(SUM(amount_usd), 0) as volume_24h
      FROM telegram_tips
      WHERE chat_id = ? AND status = 'confirmed'
        AND created_at > datetime('now', '-1 day')
    `).get(chatId);

    Object.assign(stats, day);

    // Last 7 days
    const week = this.prepare(`
      SELECT
        COUNT(*) as tips_7d,
        COALESCE(SUM(amount_usd), 0) as volume_7d
      FROM telegram_tips
      WHERE chat_id = ? AND status = 'confirmed'
        AND created_at > datetime('now', '-7 days')
    `).get(chatId);

    Object.assign(stats, week);

    // Active and registered users
    const users = this.prepare(`
      SELECT
        COUNT(DISTINCT telegram_id) as active_users,
        COUNT(DISTINCT CASE WHEN wallet IS NOT NULL THEN telegram_id END) as registered_users
      FROM telegram_user_activity a
      LEFT JOIN users u ON u.telegram_id = a.telegram_id
      WHERE a.chat_id = ?
    `).get(chatId);

    Object.assign(stats, users);

    // Top token
    const topToken = this.prepare(`
      SELECT currency as top_token, COUNT(*) as count
      FROM telegram_tips
      WHERE chat_id = ? AND status = 'confirmed'
      GROUP BY currency
      ORDER BY count DESC
      LIMIT 1
    `).get(chatId);

    stats.top_token = topToken ? topToken.top_token : null;

    // Top tipper
    const topTipper = this.prepare(`
      SELECT sender_username as top_tipper
      FROM telegram_tips
      WHERE chat_id = ? AND status = 'confirmed'
      GROUP BY sender_telegram_id
      ORDER BY SUM(amount_usd) DESC
      LIMIT 1
    `).get(chatId);

    stats.top_tipper = topTipper ? topTipper.top_tipper : null;

    return stats;
  },

  /**
   * Ban user from group
   */
  banTelegramUser(chatId, telegramId, banInfo) {
    return this.prepare(`
      INSERT INTO telegram_banned_users (chat_id, telegram_id, banned_by, reason)
      VALUES (?, ?, ?, ?)
    `).run(chatId, telegramId, banInfo.bannedBy, banInfo.reason);
  },

  /**
   * Unban user from group
   */
  unbanTelegramUser(chatId, telegramId) {
    return this.prepare(`
      DELETE FROM telegram_banned_users
      WHERE chat_id = ? AND telegram_id = ?
    `).run(chatId, telegramId);
  },

  /**
   * Check if user is banned
   */
  isTelegramUserBanned(chatId, telegramId) {
    const result = this.prepare(`
      SELECT 1 FROM telegram_banned_users
      WHERE chat_id = ? AND telegram_id = ?
    `).get(chatId, telegramId);

    return !!result;
  },

  /**
   * Get user by username
   */
  getUserByTelegramUsername(username) {
    return this.prepare(`
      SELECT * FROM users WHERE telegram_username = ?
    `).get(username);
  }
};

/**
 * Extend database with group methods
 */
function extendDatabaseWithGroups(db) {
  initializeGroupTables(db);
  Object.assign(db, groupMethods);
  logger.info('Database extended with group support');
}

module.exports = {
  extendDatabaseWithGroups,
  groupMethods
};
