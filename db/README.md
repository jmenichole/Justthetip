# Database Module

## Overview

This directory contains the database connection and schema for JustTheTip bot. The project uses **PostgreSQL** for ACID-compliant financial transactions.

## Files

- **`database.js`** - Main database module with connection pooling and transaction handling
- **`schema.sql`** - PostgreSQL schema with tables, indexes, and constraints

## Quick Start

### 1. Install PostgreSQL

See the [PostgreSQL Migration Guide](../POSTGRESQL_MIGRATION.md) for detailed installation instructions.

### 2. Create Database

```bash
createdb justthetip
```

### 3. Initialize Schema

```bash
psql -d justthetip -f db/schema.sql
```

### 4. Configure Environment

```env
DATABASE_URL=postgresql://username:password@localhost:5432/justthetip
NODE_ENV=development
```

## Database Schema

### Tables

- **users** - Discord user records
- **balances** - User cryptocurrency balances (NUMERIC for precision)
- **transactions** - Transaction audit trail
- **wallet_registrations** - External wallet addresses

### Critical Indexes

All tables have indexes on frequently queried columns:
- User lookups: `idx_users_user_id`
- Balance queries: `idx_balances_user_id`, `idx_balances_currency`
- Transaction history: `idx_transactions_sender`, `idx_transactions_recipient`, `idx_transactions_created_at`

## ACID Compliance

All financial operations use PostgreSQL transactions:

```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... operations ...
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

## Demo Mode

If `DATABASE_URL` is not set, the module runs in demo mode with mock operations. This is useful for testing without a database.

## Documentation

- [PostgreSQL Migration Guide](../POSTGRESQL_MIGRATION.md) - Complete migration documentation
- [README](../README.md) - Main project documentation

## Support

For issues or questions, see the [GitHub Issues](https://github.com/jmenichole/Justthetip/issues).
