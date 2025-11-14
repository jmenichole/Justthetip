# 🚂 Railway Deployment Instructions - Discord Bot

## ⚡ Quick Start (Fix Bot Not Online)

### The Problem
Your Discord bot is not online because Railway is starting the API server (`api/server.js`) instead of the Discord bot (`bot.js`).

### The Solution (Choose One)

#### Option A: Update Existing Service (Fastest)

1. **Login to Railway**
   - Go to https://railway.app/dashboard
   - Open your JustTheTip project

2. **Update Start Command**
   - Click on your service
   - Go to "Settings" tab
   - Find "Start Command" field
   - **Change to:** `npm run start:bot-railway`
   - Click "Save"

3. **Verify Environment Variables** (Click "Variables" tab)
   ```
   ✅ DISCORD_BOT_TOKEN=your_bot_token
   ✅ DISCORD_CLIENT_ID=your_client_id
   ⚠️  MONGODB_URI=your_mongodb_uri (recommended)
   ⚠️  SOLANA_RPC_URL=your_solana_rpc (recommended)
   ```

4. **Redeploy**
   - Click "Deploy" button
   - Monitor logs for: `🟢 Logged in as YourBot#1234`

#### Option B: Create Separate Service (Best Practice)

1. **Keep API Service** (existing)
   - Handles web requests and OAuth
   - Start command: `node api/server.js`

2. **Create Bot Service** (new)
   - In Railway project, click "+ New"
   - Select "GitHub Repo"
   - Choose: `jmenichole/Justthetip`
   - Settings → Start Command: `npm run start:bot-railway`
   - Add environment variables (see below)
   - Deploy

---

## 🔐 Required Environment Variables

### Critical (Must Have) 🔴

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `DISCORD_BOT_TOKEN` | Discord bot authentication token | [Discord Developer Portal](https://discord.com/developers/applications) → Your App → Bot → Token |
| `DISCORD_CLIENT_ID` | Discord application ID | Discord Developer Portal → Your App → OAuth2 → Client ID |

### Important (Should Have) 🟡

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | Required for data persistence |
| `SOLANA_RPC_URL` | Solana RPC endpoint | Required for blockchain features |

### Optional (Nice to Have) 🟢

| Variable | Description | Default |
|----------|-------------|---------|
| `GUILD_ID` | Discord server ID for testing | None |
| `HELIUS_API_KEY` | Helius API key for better RPC | None |
| `SUPER_ADMIN_USER_IDS` | Admin Discord user IDs | None |
| `NODE_ENV` | Environment mode | `production` |

---

## 🎯 What's New in This Fix

### 1. Automated Secrets Verification ✨
**Script:** `scripts/verify-railway-secrets.js`

Before the bot starts, this script:
- ✅ Checks all required environment variables are set
- ✅ Validates format and length of secrets
- ✅ Provides clear error messages
- ✅ Prevents bot from starting if critical secrets missing

**Run manually:**
```bash
npm run verify-railway-secrets
```

### 2. Smart Startup Script 🚀
**Script:** `scripts/start-bot-railway.js`

Orchestrates bot startup with:
- ✅ Secrets verification
- ✅ Node.js version check
- ✅ Module dependency check
- ✅ Graceful shutdown handling
- ✅ Error monitoring

**Run manually:**
```bash
npm run start:bot-railway
```

### 3. Updated Configuration 📝
- `package.json`: Added `start:bot-railway` script
- `railway-bot.json`: Updated to use new startup script

---

## 📊 Monitoring & Verification

### In Railway Dashboard

**Look for these logs:**

✅ **Success:**
```
════════════════════════════════════════════════════════════
Railway Discord Bot - Secrets Verification
════════════════════════════════════════════════════════════
✅ DISCORD_BOT_TOKEN: ***xxxx
✅ DISCORD_CLIENT_ID: 1419742988128616479
✅ All required secrets are present - Bot ready to start!
════════════════════════════════════════════════════════════
Step 2: Health Checks
════════════════════════════════════════════════════════════
Node.js version: v20.x.x
✅ Module discord.js: Found
✅ Module dotenv-safe: Found
✅ Module mongodb: Found
✅ Health checks passed
════════════════════════════════════════════════════════════
Step 3: Starting Discord Bot
════════════════════════════════════════════════════════════
🟢 Logged in as YourBotName#1234
Database connected.
Successfully reloaded application (/) commands.
```

❌ **Failure:**
```
❌ DISCORD_BOT_TOKEN: MISSING
❌ DISCORD_CLIENT_ID: MISSING
❌ CRITICAL SECRETS MISSING - Bot cannot start!

To fix:
1. Go to Railway dashboard
2. Navigate to your project > Variables tab
3. Add the missing variables shown above
4. Redeploy the service
```

### In Discord

1. **Bot Status**
   - Check member list → Bot should show "Online" (green dot)

2. **Test Commands**
   ```
   /help     → Should show command list
   /balance  → Should show portfolio balance
   ```

3. **Slash Commands**
   - Type `/` in chat
   - Should see all bot commands listed

---

## 🚨 Troubleshooting

### Bot Shows Offline

**Check 1: Verify Start Command**
- Railway Dashboard → Settings → Start Command
- Should be: `npm run start:bot-railway`
- **NOT:** `node api/server.js`

**Check 2: Verify Secrets**
- Railway Dashboard → Variables
- Ensure `DISCORD_BOT_TOKEN` and `DISCORD_CLIENT_ID` are set
- Check for typos

**Check 3: Check Logs**
- Railway Dashboard → Logs
- Look for error messages in red
- Check if secrets verification passed

### Commands Don't Work

**Solution 1: Register Commands**
```bash
# Run locally once
node register-commands.js
```

**Solution 2: Check Bot Permissions**
- Discord Server Settings → Integrations → Your Bot
- Ensure bot has required permissions
- Reinvite bot if needed

**Solution 3: Wait for Sync**
- Discord can take 5-10 minutes to sync slash commands
- Be patient after first deployment

### Database Connection Failed

**Check MongoDB URI:**
```bash
# Should start with:
mongodb://...
# or
mongodb+srv://...
```

**Check IP Whitelist:**
- MongoDB Atlas → Network Access
- Add entry: `0.0.0.0/0` (allows Railway)

**Test Connection:**
- Use MongoDB Compass with same connection string
- Verify credentials are correct

---

## 📋 Deployment Checklist

Use this checklist for every deployment:

### Pre-Deployment
- [ ] Discord bot created and token obtained
- [ ] MongoDB database setup and connection string ready
- [ ] Solana RPC endpoint configured
- [ ] Railway account created and repository connected

### Deployment
- [ ] Start command set to `npm run start:bot-railway`
- [ ] `DISCORD_BOT_TOKEN` added to Railway variables
- [ ] `DISCORD_CLIENT_ID` added to Railway variables
- [ ] `MONGODB_URI` added to Railway variables
- [ ] `SOLANA_RPC_URL` added to Railway variables
- [ ] Service deployed successfully

### Post-Deployment
- [ ] Bot shows "Online" in Discord (within 2 minutes)
- [ ] Secrets verification passed in logs
- [ ] Health checks passed in logs
- [ ] Database connected successfully
- [ ] Slash commands registered successfully
- [ ] `/help` command works
- [ ] `/balance` command works
- [ ] No errors in logs for 5+ minutes

---

## 🔄 Updating the Bot

### Method 1: Automatic (Recommended)
1. Push changes to GitHub
2. Railway auto-deploys (if enabled)
3. Monitor logs for successful restart

### Method 2: Manual
1. Railway Dashboard → Your Service
2. Click "Deploy" button
3. Select latest commit
4. Monitor logs

---

## 🆘 Getting Help

### Self-Service
1. **Check Logs**: Railway Dashboard → Logs
2. **Run Verification**: `npm run verify-railway-secrets`
3. **Review Docs**: See files below

### Documentation
- **[RAILWAY_BOT_CHECKLIST.md](./RAILWAY_BOT_CHECKLIST.md)** - Complete checklist with troubleshooting
- **[RAILWAY_FIX_DEPLOYMENT.md](./RAILWAY_FIX_DEPLOYMENT.md)** - Detailed fix guide
- **[BOT_RAILWAY_SETUP.md](./BOT_RAILWAY_SETUP.md)** - Original setup guide
- **[RAILWAY_CONFIG_GUIDE.md](./RAILWAY_CONFIG_GUIDE.md)** - Configuration reference

### Support
- GitHub Issues: Report bugs or ask questions
- Railway Discord: https://discord.gg/railway
- Discord.js Guide: https://discordjs.guide

---

## ✅ Success Criteria

Your bot is successfully deployed when:

- ✅ Railway service shows "Active" (green indicator)
- ✅ Bot appears "Online" in Discord member list
- ✅ Secrets verification passes in logs
- ✅ Health checks pass in logs
- ✅ Database connection succeeds
- ✅ All slash commands are visible
- ✅ Commands execute without errors
- ✅ No error logs for 5+ minutes

---

**Last Updated**: 2025-11-04  
**Version**: 1.0  
**Status**: Production Ready ✅
