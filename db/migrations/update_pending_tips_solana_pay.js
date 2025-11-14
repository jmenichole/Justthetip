/**
 * Migration: Update pending_tips table for Solana Pay tracking
 */

const sqlite = require('../db');

try {
  console.log('🔄 Running migration: update_pending_tips_for_solana_pay');

  // Add reference column for tracking
  try {
    sqlite.db.exec('ALTER TABLE pending_tips ADD COLUMN reference TEXT');
    console.log('✅ Added reference column');
  } catch (error) {
    if (!error.message.includes('duplicate column')) {
      throw error;
    }
    console.log('ℹ️  reference column already exists');
  }

  // Add signature column for confirmed transactions
  try {
    sqlite.db.exec('ALTER TABLE pending_tips ADD COLUMN signature TEXT');
    console.log('✅ Added signature column');
  } catch (error) {
    if (!error.message.includes('duplicate column')) {
      throw error;
    }
    console.log('ℹ️  signature column already exists');
  }

  // Add status column
  try {
    sqlite.db.exec('ALTER TABLE pending_tips ADD COLUMN status TEXT DEFAULT "pending"');
    console.log('✅ Added status column');
  } catch (error) {
    if (!error.message.includes('duplicate column')) {
      throw error;
    }
    console.log('ℹ️  status column already exists');
  }

  // Create index on reference for fast lookups
  sqlite.db.exec('CREATE INDEX IF NOT EXISTS idx_pending_tips_reference ON pending_tips(reference)');
  sqlite.db.exec('CREATE INDEX IF NOT EXISTS idx_pending_tips_status ON pending_tips(status)');

  console.log('✅ Migration completed: pending_tips updated for Solana Pay');
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
