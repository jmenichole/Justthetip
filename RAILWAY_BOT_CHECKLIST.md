# 🤖 Railway Discord Bot Deployment Checklist

Use this checklist to ensure your Discord bot is properly configured and deployed on Railway.

## ✅ Pre-Deployment Checklist

### 1. Discord Application Setup
- [ ] Created Discord application at https://discord.com/developers/applications
- [ ] Obtained **BOT_TOKEN** from Bot tab
- [ ] Obtained **CLIENT_ID** from OAuth2 tab (Application ID)
- [ ] Bot has necessary permissions (Send Messages, Read Messages, Use Slash Commands)
- [ ] Bot is invited to your Discord server

### 2. Database Setup
- [ ] MongoDB Atlas account created
- [ ] MongoDB database created
- [ ] **MONGODB_URI** connection string obtained
- [ ] IP whitelist configured (add `0.0.0.0/0` for Railway)

### 3. Solana Configuration
- [ ] Helius account created (optional but recommended)
- [ ] **HELIUS_API_KEY** obtained
- [ ] **SOLANA_RPC_URL** configured (mainnet or devnet)

### 4. Railway Account
- [ ] Railway account created at https://railway.app
- [ ] GitHub repository connected
- [ ] Billing configured (free tier or paid plan)

## 🚀 Railway Deployment Steps

### Step 1: Create Railway Service
1. [ ] Login to Railway dashboard
2. [ ] Click "New Project"
3. [ ] Select "Deploy from GitHub repo"
4. [ ] Choose repository: `jmenichole/Justthetip`
5. [ ] Service created successfully

### Step 2: Configure Start Command
Two options:

**Option A: Use Railway Dashboard (Recommended)**
1. [ ] Go to Service Settings
2. [ ] Find "Start Command" field
3. [ ] Enter: `npm run start:bot-railway`
4. [ ] Save changes

**Option B: Use railway-bot.json**
1. [ ] Copy `railway-bot.json` to `railway.json` (temporarily)
2. [ ] Railway will auto-detect and use it
3. [ ] Revert after deployment

### Step 3: Add Environment Variables
Go to Variables tab and add these secrets:

#### 🔴 CRITICAL (Required)
```bash
BOT_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
```

#### 🟡 IMPORTANT (Recommended)
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/justthetip
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your_helius_key
```

#### 🟢 OPTIONAL (Enhanced Features)
```bash
GUILD_ID=your_discord_server_id
HELIUS_API_KEY=your_helius_api_key
SUPER_ADMIN_USER_IDS=your_discord_user_id
NODE_ENV=production
```

### Step 4: Deploy
1. [ ] All environment variables added
2. [ ] Start command configured
3. [ ] Click "Deploy" or let auto-deploy trigger
4. [ ] Wait for build to complete (2-3 minutes)

### Step 5: Verify Deployment
Monitor the deployment logs for these messages:

```
✅ Critical: 2/2 valid
✅ Important: 2/2 valid
✅ All required secrets are present - Bot ready to start!
✅ Health checks passed
🟢 Logged in as YourBotName#1234
✅ MongoDB connected
Database connected.
Successfully reloaded application (/) commands.
```

## 🔍 Post-Deployment Verification

### In Railway Dashboard
- [ ] Service status shows "Active" (green)
- [ ] No error logs in the last 5 minutes
- [ ] Bot has been running for at least 2 minutes

### In Discord
- [ ] Bot shows as "Online" in member list
- [ ] Bot responds to `/help` command
- [ ] Bot responds to `/balance` command
- [ ] Slash commands are visible when typing `/`
- [ ] No error messages when executing commands

### Database Connection
- [ ] Check logs for "Database connected" message
- [ ] No MongoDB connection errors in logs

## 🚨 Troubleshooting

### Bot Won't Start

**Error: `BOT_TOKEN is not set`**
- **Fix**: Add BOT_TOKEN to Railway environment variables
- Go to Variables tab → Add Variable → Name: `BOT_TOKEN` → Value: (your token)

**Error: `CLIENT_ID is not set`**
- **Fix**: Add CLIENT_ID to Railway environment variables
- Get from Discord Developer Portal → Your App → OAuth2 → Client ID

**Error: `Cannot find module 'discord.js'`**
- **Fix**: Verify build command is `npm install`
- Check Railway logs for build errors
- Try manual redeploy

### Bot Online But Commands Don't Work

**Slash commands not showing**
- **Fix**: Commands need to be registered first
- Run `node register-commands.js` locally once
- Or check if bot has `applications.commands` scope

**Commands timeout or fail**
- Check Railway logs for specific error messages
- Verify MongoDB connection is successful
- Check Solana RPC URL is accessible

### Database Connection Issues

**Error: `MongoServerError: Authentication failed`**
- **Fix**: Verify MONGODB_URI is correct
- Check username/password in connection string
- Ensure database user has proper permissions

**Error: `ECONNREFUSED`**
- **Fix**: Check MongoDB Atlas IP whitelist
- Add `0.0.0.0/0` to allow Railway connections
- Verify cluster is running (not paused)

### Bot Keeps Restarting

Check Railway logs for:
- **401 Unauthorized**: Invalid BOT_TOKEN
- **Missing Access**: Bot lacks Discord permissions
- **Memory exceeded**: Upgrade Railway plan
- **Crash on startup**: Check error stack trace

## 📊 Monitoring

### Things to Monitor Daily
- [ ] Bot online status in Discord
- [ ] Railway service status (Active/Crashed)
- [ ] Error rate in Railway logs
- [ ] MongoDB connection stability
- [ ] Command response times

### Weekly Health Checks
- [ ] Review Railway usage/costs
- [ ] Check for Discord.js updates
- [ ] Verify database backup status
- [ ] Review error logs for patterns
- [ ] Test all slash commands

## 🔄 Updates and Maintenance

### To Update the Bot
1. [ ] Make changes to code in GitHub
2. [ ] Commit and push to main branch
3. [ ] Railway auto-deploys (if enabled)
4. [ ] Monitor deployment logs
5. [ ] Verify bot still works after update

### To Update Dependencies
1. [ ] Run `npm update` locally
2. [ ] Test bot locally
3. [ ] Commit package-lock.json
4. [ ] Push to trigger Railway rebuild

## 🔐 Security Best Practices

- [ ] Never commit secrets to GitHub
- [ ] Use Railway environment variables for all secrets
- [ ] Rotate BOT_TOKEN every 90 days
- [ ] Limit admin user IDs to trusted users
- [ ] Monitor logs for suspicious activity
- [ ] Keep dependencies updated (npm audit)

## 📞 Getting Help

If bot still not working after following this checklist:

1. **Check Railway Logs**
   - Railway Dashboard → Your Service → View Logs
   - Look for error messages in red

2. **Run Verification Locally**
   ```bash
   npm run verify-railway-secrets
   ```

3. **Test Bot Locally**
   ```bash
   cp .env.example .env
   # Add your secrets to .env
   npm run start:bot
   ```

4. **Review Documentation**
   - [BOT_RAILWAY_SETUP.md](./BOT_RAILWAY_SETUP.md)
   - [RAILWAY_CONFIG_GUIDE.md](./RAILWAY_CONFIG_GUIDE.md)
   - [Railway Documentation](https://docs.railway.app)

5. **Common Issues**
   - Bot token: https://discord.com/developers/applications
   - MongoDB: https://www.mongodb.com/docs/atlas/
   - Railway: https://docs.railway.app

## ✅ Success Criteria

Your deployment is successful when:

- ✅ Railway service shows "Active" for 5+ minutes
- ✅ Bot appears "Online" in Discord
- ✅ All slash commands work correctly
- ✅ Database operations succeed
- ✅ No errors in Railway logs
- ✅ Commands respond within 3 seconds

---

**Last Updated**: 2025-11-04
**Maintainer**: JustTheTip Bot Team
**Support**: Check documentation or open an issue on GitHub
