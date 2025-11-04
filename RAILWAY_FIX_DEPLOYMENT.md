# 🔧 Railway Bot Deployment Fix Guide

## Problem
The bot is not online because Railway is configured to start the API server (`api/server.js`) instead of the Discord bot (`bot.js`), and required secrets may be missing.

## Solution Overview
1. ✅ Created automated secrets verification script
2. ✅ Created Railway-specific startup script with health checks
3. ✅ Updated Railway configuration to start the bot correctly
4. ✅ Added comprehensive deployment checklist

## 🚀 Quick Fix (For Existing Railway Deployment)

### Option 1: Update Start Command in Railway Dashboard (RECOMMENDED)

1. **Go to Railway Dashboard**
   - Navigate to https://railway.app/dashboard
   - Open your JustTheTip project
   - Select the service that should run the bot

2. **Update Start Command**
   - Click on "Settings" tab
   - Scroll to "Deploy" section
   - Find "Start Command" field
   - Change from: `node api/server.js`
   - Change to: `npm run start:bot-railway`
   - Click "Save"

3. **Verify Environment Variables**
   - Click on "Variables" tab
   - Run through the checklist below
   - Add any missing variables

4. **Redeploy**
   - Click "Redeploy" button or push a commit
   - Monitor logs for successful startup

### Option 2: Use Separate Services (BEST PRACTICE)

Create two separate Railway services:

**Service 1: API Server** (existing)
- Start Command: `node api/server.js`
- Handles web requests, OAuth, NFT minting

**Service 2: Discord Bot** (new)
1. In Railway project, click "New Service"
2. Select "Deploy from GitHub repo"
3. Choose same repository
4. Settings → Start Command: `npm run start:bot-railway`
5. Add environment variables (see checklist below)
6. Deploy

## 📋 Required Environment Variables Checklist

### 🔴 CRITICAL (Must Have)
```bash
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
```

**Where to get these:**
- BOT_TOKEN: Discord Developer Portal → Your App → Bot → Token
- CLIENT_ID: Discord Developer Portal → Your App → OAuth2 → Client ID

### 🟡 IMPORTANT (Should Have)
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/justthetip
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your_key
```

**Where to get these:**
- MONGODB_URI: MongoDB Atlas → Connect → Connection String
- SOLANA_RPC_URL: Helius Dashboard → API Keys

### 🟢 OPTIONAL (Nice to Have)
```bash
GUILD_ID=your_discord_server_id
HELIUS_API_KEY=your_helius_api_key
SUPER_ADMIN_USER_IDS=your_discord_user_id
NODE_ENV=production
```

## 🔍 Verification Steps

### 1. Run Local Verification
```bash
# Test verification script locally
npm run verify-railway-secrets

# Expected output:
# ✅ Critical: 2/2 valid
# ✅ Important: 2/2 valid
# ✅ All required secrets are present - Bot ready to start!
```

### 2. Check Railway Logs
After deployment, look for these messages:

**✅ SUCCESS INDICATORS:**
```
════════════════════════════════════════════════════════════
Railway Discord Bot - Secrets Verification
════════════════════════════════════════════════════════════
✅ BOT_TOKEN: ***xxxx
✅ CLIENT_ID: 1419742988128616479
✅ All required secrets are present - Bot ready to start!
✅ Health checks passed
🟢 Logged in as YourBotName#1234
Database connected.
Successfully reloaded application (/) commands.
```

**❌ ERROR INDICATORS:**
```
❌ BOT_TOKEN: MISSING
❌ CLIENT_ID: MISSING
❌ CRITICAL SECRETS MISSING - Bot cannot start!
```

### 3. Test in Discord
- [ ] Bot shows "Online" status
- [ ] Type `/` to see slash commands
- [ ] Test `/help` command
- [ ] Test `/balance` command

## 🚨 Common Issues & Fixes

### Issue 1: "Bot won't start - Missing secrets"
**Symptoms:**
```
❌ BOT_TOKEN: MISSING
❌ CRITICAL SECRETS MISSING - Bot cannot start!
```

**Fix:**
1. Go to Railway Dashboard → Variables
2. Add `BOT_TOKEN` from Discord Developer Portal
3. Add `CLIENT_ID` from Discord Developer Portal
4. Redeploy

### Issue 2: "Wrong service is starting"
**Symptoms:**
- API server starts instead of bot
- Logs show Express server messages
- Bot stays offline in Discord

**Fix:**
1. Railway Dashboard → Settings → Start Command
2. Change to: `npm run start:bot-railway`
3. Save and redeploy

### Issue 3: "Bot connects but database fails"
**Symptoms:**
```
🟢 Logged in as BotName#1234
❌ MongoDB connection failed: Authentication failed
```

**Fix:**
1. Verify MONGODB_URI is correct
2. Check MongoDB Atlas IP whitelist (add `0.0.0.0/0`)
3. Test connection string locally first
4. Update in Railway Variables

### Issue 4: "Commands don't work"
**Symptoms:**
- Bot is online
- Slash commands not showing
- Commands return errors

**Fix:**
1. Register commands locally first:
   ```bash
   node register-commands.js
   ```
2. Verify bot has `applications.commands` scope
3. Check bot permissions in Discord server
4. Wait 5 minutes for Discord to sync commands

## 🔧 New Features Added

### 1. Automated Secrets Verification
- **File**: `scripts/verify-railway-secrets.js`
- **Purpose**: Validates all required environment variables before bot starts
- **Usage**: Runs automatically via `start:bot-railway` script

### 2. Railway Startup Script
- **File**: `scripts/start-bot-railway.js`
- **Purpose**: Performs health checks and starts bot with monitoring
- **Features**:
  - Secret verification
  - Node.js version check
  - Module dependency check
  - Graceful shutdown handling

### 3. Deployment Checklist
- **File**: `RAILWAY_BOT_CHECKLIST.md`
- **Purpose**: Step-by-step guide for deploying and troubleshooting
- **Includes**: Pre-deployment checks, deployment steps, verification

## 📊 Testing the Fix

### Local Testing
```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env

# 3. Add your secrets to .env
# Edit .env and add BOT_TOKEN, CLIENT_ID, etc.

# 4. Test verification script
npm run verify-railway-secrets

# 5. Start bot locally
npm run start:bot-railway
```

### Railway Testing
```bash
# 1. Push changes to GitHub
git push

# 2. Railway auto-deploys (or manual redeploy)

# 3. Monitor logs
# Railway Dashboard → Your Service → Logs

# 4. Check bot status in Discord
# Should show "Online" within 1-2 minutes
```

## 🎯 Success Checklist

After applying these fixes, verify:

- [x] `verify-railway-secrets.js` script created
- [x] `start-bot-railway.js` script created
- [x] `package.json` updated with new scripts
- [x] `railway-bot.json` updated with new start command
- [x] `RAILWAY_BOT_CHECKLIST.md` created
- [ ] Railway start command updated to `npm run start:bot-railway`
- [ ] All required environment variables added
- [ ] Bot shows online in Discord
- [ ] Slash commands work
- [ ] No errors in Railway logs

## 📚 Related Documentation

- **[RAILWAY_BOT_CHECKLIST.md](./RAILWAY_BOT_CHECKLIST.md)** - Complete deployment checklist
- **[BOT_RAILWAY_SETUP.md](./BOT_RAILWAY_SETUP.md)** - Original setup guide
- **[RAILWAY_CONFIG_GUIDE.md](./RAILWAY_CONFIG_GUIDE.md)** - Configuration file reference
- **[Railway Docs](https://docs.railway.app)** - Official Railway documentation

## 🆘 Still Having Issues?

1. **Check logs in Railway Dashboard**
   - Look for red error messages
   - Note the exact error text

2. **Run verification locally**
   ```bash
   npm run verify-railway-secrets
   ```

3. **Test bot locally**
   ```bash
   npm run start:bot-railway
   ```

4. **Review this checklist**
   - Ensure all steps completed
   - Verify all environment variables set
   - Check Railway start command

5. **Open an issue**
   - Include Railway logs
   - Include error messages
   - Include verification script output

---

**Created**: 2025-11-04  
**Purpose**: Fix bot not starting on Railway  
**Status**: Ready for deployment
