# 🚀 Quick Reference: Supabase Database Setup

## ⚡ 5-Minute Setup

```bash
# 1. Go to https://supabase.com and create a project

# 2. In Supabase SQL Editor, run:
cat db/schema.sql
# Copy the contents and paste in SQL Editor, then click Run

# 3. Set environment variable in .env:
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# 4. Install PostgreSQL client (if needed):
npm install pg

# 5. Validate setup:
node db/validate-database.js

# 6. Start your bot:
npm run start:bot
```

## 📋 What You Get

✅ **9 Production-Ready Tables**
- users, balances, transactions
- tips, trust_badges, wallet_registrations
- registration_nonces, verifications, tickets

✅ **20+ Performance Indexes**
✅ **Automatic Triggers & Functions**
✅ **ACID Compliance**
✅ **Auto-Expiring Nonces**

## 📚 Documentation

| File | Purpose |
|------|---------|
| `db/SUPABASE_SETUP.md` | **START HERE** - Step-by-step setup |
| `db/schema.sql` | PostgreSQL schema to run |
| `db/validate-database.js` | Test your setup |
| `db/SCHEMA_DIAGRAM.md` | Visual database structure |
| `SUPABASE_DATABASE_SUMMARY.md` | Complete overview |

## 🔧 Common Commands

```bash
# Test connection
node db/validate-database.js

# Run schema (from Supabase SQL Editor)
# Copy contents of db/schema.sql

# Check environment
echo $DATABASE_URL

# Start bot
npm run start:bot
```

## ❓ Troubleshooting

| Error | Solution |
|-------|----------|
| Connection refused | Check DATABASE_URL is correct |
| Authentication failed | Replace [YOUR-PASSWORD] with actual password |
| Tables not found | Run db/schema.sql in Supabase |
| Too many connections | Use port 6543 with ?pgbouncer=true |

## 🔐 Security Checklist

- [ ] Strong database password (16+ chars)
- [ ] DATABASE_URL not in git
- [ ] SSL enabled (sslmode=require)
- [ ] Backups configured
- [ ] Monitoring enabled

## 🎯 Next Steps

1. ✅ Follow `db/SUPABASE_SETUP.md`
2. ✅ Run `db/schema.sql` in Supabase
3. ✅ Set `DATABASE_URL`
4. ✅ Validate: `node db/validate-database.js`
5. ✅ Deploy your bot!

## 💡 Tips

- **Development**: SQLite (automatic, zero config)
- **Production**: Supabase/PostgreSQL (this setup)
- **Connection Pooling**: Use port 6543 for better performance
- **Monitoring**: Check Supabase Dashboard > Logs

## 📞 Support

- 📖 [Full Setup Guide](db/SUPABASE_SETUP.md)
- 📊 [Schema Diagram](db/SCHEMA_DIAGRAM.md)
- 🐛 [GitHub Issues](https://github.com/jmenichole/Justthetip/issues)
- 💬 [Supabase Discord](https://discord.supabase.com)

---

**Made by:** @copilot
**Commit:** 627dd9e
**Files Changed:** 6 files, 1025+ insertions

✨ Your database is ready to rock! ✨
