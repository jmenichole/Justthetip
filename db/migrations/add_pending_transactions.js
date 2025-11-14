/**
 * Migration: Add pending_transactions table
 * For storing unsigned transactions awaiting user signatures (x402 Trustless Agent)
 */

const sqlite = require('../db');

try {
  console.log('🔄 Running migration: add_pending_transactions');

  sqlite.db.exec(`
    CREATE TABLE IF NOT EXISTS pending_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      recipient_id TEXT,
      transaction_data TEXT NOT NULL,
      usd_amount REAL,
      sol_amount REAL,
      signature TEXT,
      expires_at INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  sqlite.db.exec('CREATE INDEX IF NOT EXISTS idx_pending_tx_user ON pending_transactions(user_id)');
  sqlite.db.exec('CREATE INDEX IF NOT EXISTS idx_pending_tx_expires ON pending_transactions(expires_at)');
  sqlite.db.exec('CREATE INDEX IF NOT EXISTS idx_pending_tx_completed ON pending_transactions(completed)');

  console.log('✅ Migration completed: pending_transactions table created');
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
