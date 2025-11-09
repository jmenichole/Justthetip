# Database Module

## Overview

This directory contains the database connection and operations for JustTheTip bot. 

**Default Mode**: The project uses **SQLite** with better-sqlite3 for zero-config local storage.

**Production Mode**: For production deployments, the project supports **PostgreSQL** (including **Supabase**) with full ACID compliance for financial transactions.

## Files

- **`db.js`** - Core SQLite database module with helper functions
- **`database.js`** - Compatibility wrapper maintaining the original API
- **`justthetip.db`** - SQLite database file (auto-created, git-ignored)
- **`schema.sql`** - PostgreSQL/Supabase database schema with all tables
- **`SUPABASE_SETUP.md`** - **⭐ START HERE** for production setup guide

## Quick Start

### Development (SQLite - Zero Config)

No setup required! The database is automatically created and initialized when the bot starts.

### Production (PostgreSQL/Supabase)

1. Follow the **[Supabase Setup Guide](./SUPABASE_SETUP.md)** (5 minutes)
2. Set `DATABASE_URL` environment variable
3. Validate setup: `node db/validate-database.js`
4. The bot automatically uses PostgreSQL when `DATABASE_URL` is set

```javascript
const db = require('./db/database');

// Connect (no-op for SQLite, exists for API compatibility)
await db.connectDB();

// Get user balances
const balances = await db.getBalances(userId);

// Process a tip
await db.processTip(senderId, recipientId, amount, currency);

// Credit balance
await db.creditBalance(userId, amount, currency);

// Get transaction history
const transactions = await db.getUserTransactions(userId, 10);
```

## Database Schema

### Tables

- **users** - Discord user records
  - `id` (TEXT PRIMARY KEY) - User Discord ID
  - `wallet` (TEXT) - Optional wallet address
  - `balance` (REAL) - User balance (default 0)

- **tips** - Transaction history
  - `id` (INTEGER PRIMARY KEY AUTOINCREMENT) - Transaction ID
  - `sender` (TEXT) - Sender Discord ID
  - `receiver` (TEXT) - Receiver Discord ID
  - `amount` (REAL) - Transaction amount
  - `currency` (TEXT) - Currency type (SOL, USDC, etc.)
  - `created_at` (TEXT) - Timestamp (ISO format)

## Features

### Direct Database Functions (db.js)

- `getUser(id)` - Get or create user with default balance 0
- `updateBalance(id, amount)` - Update user balance (supports negative amounts)
- `recordTip(sender, receiver, amount, currency)` - Log a tip transaction
- `getUserTransactions(id, limit)` - Get recent transactions (sent or received)

### Wrapper Functions (database.js)

- `connectDB()` - Initialize database (compatibility no-op)
- `getBalances(userId)` - Get user balances for all currencies
- `processTip(senderId, recipientId, amount, currency)` - Process a tip with validation
- `creditBalance(userId, amount, currency)` - Add funds to user account
- `getUserTransactions(userId, limit)` - Get user transaction history

## DM Commands

Users can interact with the bot via DMs using the `$` prefix:

- `$history [number]` - View transaction history (default: 10, max: 50)
- `$transactions` - Alias for $history
- `$balance` - Check current balance
- `$help` - Show available DM commands

## Error Handling

All database functions include try/catch error handling with safe defaults:
- Failed operations return default values (empty arrays, zero balances)
- Errors are logged to console for debugging
- Critical operations (tips) throw errors to prevent data loss

## WAL Mode

The database uses Write-Ahead Logging (WAL) mode for better performance and concurrency.

## Database Options

### SQLite (Default)
- ✅ Zero configuration
- ✅ Local file-based storage
- ✅ Perfect for development
- ⚠️ In-memory mode for API fallback when DATABASE_URL is not set

### PostgreSQL/Supabase (Production)
- ✅ ACID compliance for financial transactions
- ✅ Full transaction safety
- ✅ Scalable for production
- ✅ Connection pooling support
- ✅ Automatic backups (Supabase)
- 📝 Requires setup - see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

## Schema

The PostgreSQL schema in `schema.sql` includes all tables:
- `users` - Discord user records
- `balances` - User cryptocurrency balances
- `transactions` - Transaction audit trail
- `tips` - Tip transaction records
- `trust_badges` - NFT trust badges and reputation
- `wallet_registrations` - Verified wallet addresses
- `registration_nonces` - Temporary verification nonces
- `verifications` - NFT verification records
- `tickets` - Support ticket system

## Documentation

- [Main README](../README.md) - Project documentation
- [Database Tests](../tests/database.test.js) - Usage examples

## Support

For issues or questions, see the [GitHub Issues](https://github.com/jmenichole/Justthetip/issues).
