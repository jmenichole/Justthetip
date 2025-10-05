# PostgreSQL Migration Guide

## Overview

JustTheTip has been migrated from MongoDB to PostgreSQL to provide **ACID compliance** for real money operations. PostgreSQL ensures transaction integrity, data consistency, and proper handling of financial transactions.

---

## Why PostgreSQL?

### ACID Compliance for Financial Transactions
- **Atomicity**: All-or-nothing transactions prevent partial transfers
- **Consistency**: Enforces data integrity with foreign keys and constraints
- **Isolation**: Concurrent operations don't interfere with each other
- **Durability**: Committed transactions survive system failures

### Performance Benefits
- **Indexed Queries**: Critical indexes on user_id, currency, and transaction fields
- **Connection Pooling**: Efficient connection management with pg Pool
- **Query Optimization**: Native support for complex financial queries
- **Backup & Recovery**: Enterprise-grade backup solutions available

---

## Database Setup

### 1. Install PostgreSQL

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

#### Docker
```bash
docker run --name justthetip-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=justthetip \
  -p 5432:5432 \
  -d postgres:15
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE justthetip;
CREATE USER justthetip_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE justthetip TO justthetip_user;
\q
```

### 3. Initialize Schema

```bash
# Run schema file to create tables and indexes
psql -U justthetip_user -d justthetip -f db/schema.sql
```

### 4. Configure Environment

Update your `.env` file:

```env
# PostgreSQL Configuration
DATABASE_URL=postgresql://justthetip_user:your_secure_password@localhost:5432/justthetip
NODE_ENV=production
```

---

## Schema Overview

### Tables

#### `users`
Stores Discord user information
- `id`: Auto-incrementing primary key
- `user_id`: Discord user ID (unique, indexed)
- `created_at`, `updated_at`: Timestamps

#### `balances`
Stores user cryptocurrency balances with high precision
- `id`: Auto-incrementing primary key
- `user_id`: Foreign key to users
- `currency`: Currency code (SOL, USDC, LTC)
- `amount`: NUMERIC(20, 8) for precise decimal handling
- Unique constraint on (user_id, currency)
- **Indexed on**: user_id, currency, (user_id, currency)

#### `transactions`
Audit trail for all financial operations
- `id`: Auto-incrementing primary key
- `transaction_type`: Type of transaction (tip, credit, withdraw, etc.)
- `sender_id`, `recipient_id`: Foreign keys to users
- `amount`: Transaction amount
- `currency`: Currency code
- `status`: Transaction status
- `created_at`: Transaction timestamp
- **Indexed on**: sender_id, recipient_id, created_at, transaction_type, status

#### `wallet_registrations`
Stores user wallet addresses for different currencies
- `id`: Auto-incrementing primary key
- `user_id`: Foreign key to users
- `currency`: Currency code
- `wallet_address`: External wallet address
- Unique constraint on (user_id, currency)
- **Indexed on**: user_id, wallet_address

---

## Critical Indexes

All critical indexes are automatically created by the schema:

```sql
-- User lookups
CREATE INDEX idx_users_user_id ON users(user_id);

-- Balance queries
CREATE INDEX idx_balances_user_id ON balances(user_id);
CREATE INDEX idx_balances_currency ON balances(currency);
CREATE INDEX idx_balances_user_currency ON balances(user_id, currency);

-- Transaction queries
CREATE INDEX idx_transactions_sender ON transactions(sender_id);
CREATE INDEX idx_transactions_recipient ON transactions(recipient_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status);

-- Wallet lookups
CREATE INDEX idx_wallet_user_id ON wallet_registrations(user_id);
CREATE INDEX idx_wallet_address ON wallet_registrations(wallet_address);
```

---

## Migration from MongoDB

### Data Export (if needed)

If you have existing MongoDB data to migrate:

```javascript
// export-mongo-data.js
const { MongoClient } = require('mongodb');
const fs = require('fs');

async function exportData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('justthetip');
  
  const users = await db.collection('users').find({}).toArray();
  fs.writeFileSync('users_export.json', JSON.stringify(users, null, 2));
  
  console.log('✅ Data exported to users_export.json');
  await client.close();
}

exportData();
```

### Data Import to PostgreSQL

```javascript
// import-to-postgres.js
const { Pool } = require('pg');
const fs = require('fs');

async function importData() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const users = JSON.parse(fs.readFileSync('users_export.json'));
  
  for (const user of users) {
    // Insert user
    await pool.query(
      'INSERT INTO users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
      [user.userId]
    );
    
    // Insert balances
    if (user.balances) {
      for (const [currency, amount] of Object.entries(user.balances)) {
        await pool.query(
          `INSERT INTO balances (user_id, currency, amount) 
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, currency) DO UPDATE SET amount = $3`,
          [user.userId, currency, amount]
        );
      }
    }
  }
  
  console.log('✅ Data imported to PostgreSQL');
  await pool.end();
}

importData();
```

---

## Security Best Practices

### 1. Private Key Storage

**❌ NEVER DO THIS IN PRODUCTION:**
```env
SOL_PRIVATE_KEY=[64,byte,array,format]
```

**✅ RECOMMENDED APPROACH:**

#### AWS Secrets Manager
```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getPrivateKey() {
  const data = await secretsManager.getSecretValue({
    SecretId: 'justthetip/solana-private-key'
  }).promise();
  
  return JSON.parse(data.SecretString);
}
```

#### HashiCorp Vault
```javascript
const vault = require('node-vault')({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN
});

async function getPrivateKey() {
  const result = await vault.read('secret/data/justthetip/solana-key');
  return result.data.data.private_key;
}
```

### 2. Database Connection Security

- Use SSL/TLS for database connections in production
- Rotate database credentials regularly
- Use connection pooling to prevent connection exhaustion
- Enable audit logging for financial transactions

### 3. Environment Configuration

Production `.env`:
```env
DATABASE_URL=postgresql://user:pass@db.internal:5432/justthetip?sslmode=require
NODE_ENV=production
```

---

## Connection Pooling

The database module uses connection pooling for optimal performance:

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Transaction Examples

### Tip Transaction with ACID Compliance

```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  // Check balance
  const balance = await client.query(
    'SELECT amount FROM balances WHERE user_id = $1 AND currency = $2 FOR UPDATE',
    [senderId, currency]
  );
  
  if (balance.rows[0].amount < amount) {
    throw new Error('Insufficient balance');
  }
  
  // Deduct from sender
  await client.query(
    'UPDATE balances SET amount = amount - $1 WHERE user_id = $2 AND currency = $3',
    [amount, senderId, currency]
  );
  
  // Add to recipient
  await client.query(
    'INSERT INTO balances (user_id, currency, amount) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, currency) DO UPDATE SET amount = balances.amount + $3',
    [recipientId, currency, amount]
  );
  
  // Log transaction
  await client.query(
    'INSERT INTO transactions (transaction_type, sender_id, recipient_id, amount, currency) 
     VALUES ($1, $2, $3, $4, $5)',
    ['tip', senderId, recipientId, amount, currency]
  );
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

---

## Monitoring & Maintenance

### Query Performance

```sql
-- Check slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';

-- Index usage statistics
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

### Backup Strategy

```bash
# Daily backup
pg_dump -U justthetip_user -d justthetip -F c -f backup_$(date +%Y%m%d).dump

# Restore from backup
pg_restore -U justthetip_user -d justthetip -c backup_20250101.dump
```

---

## Troubleshooting

### Connection Issues

```javascript
// Test connection
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? err.stack : res.rows[0]);
  pool.end();
});
```

### Transaction Deadlocks

If you encounter deadlocks, ensure you're acquiring locks in consistent order:
1. Always lock sender balance before recipient
2. Use `FOR UPDATE` to prevent race conditions
3. Keep transactions short and focused

---

## Support

For issues or questions:
- Check [GitHub Issues](https://github.com/jmenichole/Justthetip/issues)
- Review PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-*.log`
- Enable query logging for debugging

---

**Migration Date:** January 2025  
**Database Version:** PostgreSQL 15+  
**ACID Compliance:** ✅ Fully Implemented
