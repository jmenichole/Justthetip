# Database Configuration

## Simple Setup ✅

JustTheTip uses **SQLite** for zero-configuration database management.

### What You Have

- **`db/db.js`** - SQLite implementation (better-sqlite3)
- **`db/database.js`** - API wrapper for compatibility
- **No MongoDB needed** - Removed all MongoDB references
- **No Supabase needed** - SQLite handles everything locally
- **Zero config** - Works out of the box

### Database Location

- **Development**: In-memory (`:memory:`) when no `DATABASE_URL` set
- **Production**: Can set `DB_PATH` environment variable to persist to disk

### How It Works

```javascript
// Automatic initialization on import
const database = require('./db/database');

// All methods ready to use
await database.saveUserWallet(userId, walletAddress);
const wallet = await database.getUserWallet(userId);
```

### Environment Variables

**Required:** None - SQLite works with zero configuration

**Optional:**
- `DB_PATH` - Custom database file location
- `DATABASE_URL` - If set, uses file-based storage instead of memory

### Features

✅ Wallet registration
✅ Tip tracking
✅ Trust badges
✅ Reputation scores
✅ Pending tips
✅ Airdrop management
✅ Transaction history

### Benefits

- **Zero setup** - No credentials, no external services
- **Fast** - In-process database, no network calls
- **Reliable** - SQLite is battle-tested and stable
- **Simple** - No connection management needed
- **Portable** - Single file database (or in-memory)

### Migration Path (Future)

If you need to scale to Supabase later:
1. Keep `db/database.js` API the same
2. Swap implementation in `db/db.js`
3. No changes needed in `api/server.js` or `bot_smart_contract.js`

---

**Current Status:** Production-ready with SQLite ✅
