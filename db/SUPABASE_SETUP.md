# Supabase Database Setup Guide

This guide will help you set up the JustTheTip database on Supabase.

## Quick Setup (5 minutes)

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in:
   - **Name**: `justthetip` (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for development
5. Click "Create new project" (takes ~2 minutes)

### Step 2: Run the Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy and paste the entire contents of `/db/schema.sql` from this repository
4. Click **Run** or press `Ctrl+Enter`
5. You should see "Success. No rows returned" (this is normal!)

### Step 3: Verify Tables Created

1. Go to **Table Editor** (left sidebar)
2. You should see these tables:
   - ✅ `users`
   - ✅ `balances`
   - ✅ `transactions`
   - ✅ `tips`
   - ✅ `trust_badges`
   - ✅ `wallet_registrations`
   - ✅ `registration_nonces`
   - ✅ `verifications`
   - ✅ `tickets`

### Step 4: Get Database Connection String

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **Database** in the left menu
3. Scroll down to **Connection string**
4. Select **URI** tab
5. Copy the connection string (looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`)
6. Replace `[YOUR-PASSWORD]` with the password you created in Step 1

### Step 5: Configure Environment Variables

First, install the PostgreSQL client (if not already installed):

```bash
npm install pg
```

Then add to your `.env` file:

```env
# Supabase Database Connection
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# For connection pooling (recommended for production)
# Use port 6543 instead of 5432
# DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true

# Set environment to production
NODE_ENV=production
```

### Step 6: Test the Connection

Run the database validation script to test everything:

```bash
node db/validate-database.js
```

This will:
- ✅ Test database connection
- ✅ Verify all tables exist
- ✅ Check indexes and triggers
- ✅ Test basic operations (INSERT/SELECT/DELETE)

You should see "✅ Database validation completed successfully!"

Alternative manual test:

```bash
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()', (err, res) => { console.log(err ? '❌ Error: ' + err.message : '✅ Connected! Server time: ' + res.rows[0].now); pool.end(); });"
```

## Advanced Setup

### Enable Row Level Security (RLS)

For production, consider enabling RLS on sensitive tables:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Example policy: Allow service role full access
CREATE POLICY "Service role can do everything" ON users
  FOR ALL 
  USING (auth.role() = 'service_role');
```

### Set Up Automatic Nonce Cleanup

Supabase supports `pg_cron` for scheduled tasks:

1. Go to **Database** → **Extensions**
2. Enable `pg_cron` extension
3. Run this SQL:

```sql
-- Schedule cleanup every 5 minutes
SELECT cron.schedule(
  'cleanup-expired-nonces',
  '*/5 * * * *',
  'SELECT cleanup_expired_nonces();'
);
```

### Connection Pooling (Recommended for Production)

Supabase provides connection pooling via PgBouncer:

```env
# Use port 6543 for connection pooling
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true
```

Benefits:
- Handles more concurrent connections
- Better performance under load
- Recommended for serverless deployments (Railway, Vercel, etc.)

### Monitor Your Database

1. Go to **Database** → **Logs** to see query logs
2. Go to **Database** → **Monitoring** for performance metrics
3. Set up **Database Backups** in Project Settings

## Troubleshooting

### Connection Error: "Connection refused"

**Solution**: Make sure you're using the correct connection string and password.

### Error: "Permission denied for schema public"

**Solution**: This shouldn't happen on Supabase. Contact support if you see this.

### Tables Not Showing Up

**Solution**: 
1. Check SQL Editor for errors when running schema
2. Refresh the Table Editor page
3. Verify you're in the correct project

### SSL Certificate Error

**Solution**: Add `?sslmode=require` to your DATABASE_URL:
```env
DATABASE_URL=postgresql://...postgres?sslmode=require
```

### Too Many Connections Error

**Solution**: Use connection pooling (port 6543 with `?pgbouncer=true`).

## Migration from SQLite

If you have existing data in SQLite, see the migration guide in `POSTGRESQL_MIGRATION.md`.

## Migration from MongoDB

The schema is already compatible! MongoDB collections are now PostgreSQL tables:

| MongoDB Collection | PostgreSQL Table |
|-------------------|------------------|
| `tips` | `tips` |
| `trust_badges` | `trust_badges` |
| `wallet_registrations` | `wallet_registrations` |
| `registration_nonces` | `registration_nonces` |
| `verifications` | `verifications` |
| `tickets` | `tickets` |

## Security Checklist

- [ ] Strong database password (16+ characters)
- [ ] Database password stored securely (not in git)
- [ ] Connection string uses SSL (`sslmode=require`)
- [ ] Row Level Security enabled (for production)
- [ ] Regular backups configured
- [ ] Monitoring and alerts set up
- [ ] API keys rotated regularly

## Support

- 📚 [Supabase Documentation](https://supabase.com/docs)
- 💬 [Supabase Discord](https://discord.supabase.com)
- 🐛 [Report Issues](https://github.com/jmenichole/Justthetip/issues)

## Next Steps

After database setup:
1. Update your bot with the DATABASE_URL
2. Start the bot: `npm run start:bot`
3. Test database operations in Discord
4. Monitor Supabase logs for any issues

✅ **Your Supabase database is now ready!**
