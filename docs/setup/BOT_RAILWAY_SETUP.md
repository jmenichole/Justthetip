# 🤖 Discord Bot 24/7 Deployment to Railway

> **📖 Configuration Reference:** See [RAILWAY_CONFIG_GUIDE.md](./RAILWAY_CONFIG_GUIDE.md) for detailed information about Railway configuration files and multi-service setup. Also check [railway-bot.README.md](./railway-bot.README.md) for bot-specific configuration details.

## 🎯 Quick Setup Steps

### 1. Login to Railway
1. Go to https://railway.app/login
2. Click **"Login with GitHub"**
3. Authorize Railway to access your repository

### 2. Create New Service for Discord Bot
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose: **jmenichole/Justthetip** repository
4. Click **"Add variables"** before deploying

### 3. Add Environment Variables

Copy and paste these into Railway's environment variables section:

#### **Required Discord Variables** ✅ (Copy from your local .env)
```
DISCORD_BOT_TOKEN=your_bot_token_from_local_env
DISCORD_CLIENT_ID=1419742988128616479
GUILD_ID=1413961128522023024
```

#### **Required Solana Variables** ✅ (Already configured)
```
HELIUS_API_KEY=074efb1f-0838-4334-839b-2f5780b43eca
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=074efb1f-0838-4334-839b-2f5780b43eca
SOL_RPC_URL=https://mainnet.helius-rpc.com/?api-key=074efb1f-0838-4334-839b-2f5780b43eca
```

#### **Required WalletConnect Variables** ⚠️ (CRITICAL - Get from https://cloud.reown.com/)
```
WALLETCONNECT_PROJECT_ID=your_project_id_from_reown_cloud
```
**Important:** Without this, mobile wallet connections will fail and users will see raw `wc:...` URIs. Create a free account at https://cloud.reown.com/ and create a new project to get your Project ID.

#### **Required Database Variables** ✅ (Already configured)
```
MONGODB_URI=mongodb+srv://justthetip1:JWjwE7xgOmmc6k3O@justhetip.0z3jtr.mongodb.net/?retryWrites=true&w=majority
DATABASE_URL=postgresql://localhost:5432/justthetip
```

#### **Required Admin Variables** ⚠️ (Need to add)
```
NODE_ENV=production
SUPER_ADMIN_USER_IDS=YOUR_DISCORD_USER_ID
ADMIN_USER_IDS=YOUR_DISCORD_USER_ID
SUPER_ADMIN_SECRET=YourSecurePassword123
EMERGENCY_ADMIN_SECRET=EmergencyPassword456
```

#### **Optional Legacy Variables** (Set as empty if not using)
```
SOL_PRIVATE_KEY=[]
TRX_PRIVATE_KEY=
ETH_PRIVATE_KEY=
XRP_SEED=
ETHEREUM_RPC_URL=
TRON_API_KEY=
XRP_SERVER=
LTC_WALLET_KEY=
BTC_WIF=
PAY_FORWARDING_ADDRESS=
```

### 4. Configure Deployment Settings

In Railway project settings:
- **Start Command:** `node bot.js`
- **Build Command:** `npm install`
- **Root Directory:** `/` (leave default)
- **Restart Policy:** ON_FAILURE with 10 max retries

### 5. Deploy and Monitor

1. Click **"Deploy"** button
2. Watch build logs for errors
3. Once deployed, check logs for: `🟢 Logged in as [BotName]#1234`
4. Test commands in Discord: `/help`, `/balance`, etc.

---

## 🔧 Configuration Files

### `railway-bot.json` ✅ Reference Configuration
This is a **reference file** for bot deployment. Railway will use the default `railway.json` (API server) unless you:
- Override start command in Railway dashboard to `node bot.js`, OR
- Deploy as a separate service with custom settings

See [railway-bot.README.md](./railway-bot.README.md) for detailed usage instructions.

Configuration includes:
- Use `node bot.js` as start command
- Auto-restart on failures
- Use npm install for dependencies

### `package.json` ✅ Already configured
Contains all bot dependencies:
- discord.js
- @solana/web3.js
- mongodb
- dotenv-safe
- etc.

---

## 📊 Cost Estimate

**Railway Free Trial:**
- $5 free credit (no credit card required)
- ~500 hours of runtime
- Plenty for testing

**Railway Hobby Plan:**
- $5/month subscription
- Includes $5 usage credit
- Bot service: ~$2-3/month
- API service: ~$2-3/month
- **Total: ~$5/month for both services**

---

## 🚨 Troubleshooting

### Bot Won't Start - Missing Environment Variables
**Error:** `MissingEnvVarsError: The following variables were defined in .env.example...`

**Fix:** Add all required variables listed above to Railway environment variables

### Database Connection Failed
**Error:** `MongoServerError: Authentication failed`

**Fix:** 
1. Verify MONGODB_URI is correct
2. Check MongoDB Atlas whitelist (add `0.0.0.0/0` for Railway)
3. Ensure username/password are correct

### Bot Logs In But Commands Don't Work
**Fix:**
1. Run `node register-commands.js` locally first
2. Check Discord Developer Portal - Bot has proper permissions
3. Verify GUILD_ID matches your Discord server

### Bot Keeps Restarting
**Check logs for:**
- `ECONNREFUSED` - Database connection issues
- `401 Unauthorized` - Invalid DISCORD_BOT_TOKEN
- `Missing Access` - Bot lacks Discord permissions

---

## 🎯 Getting Your Discord User ID

1. Enable Developer Mode in Discord:
   - Settings → Advanced → Developer Mode (toggle ON)

2. Right-click your username in Discord
3. Click "Copy User ID"
4. Paste into `SUPER_ADMIN_USER_IDS` and `ADMIN_USER_IDS`

---

## ✅ Verification Checklist

After deployment:
- [ ] Bot shows online in Discord
- [ ] `/help` command works
- [ ] `/balance` command works
- [ ] Bot logs show "Database connected"
- [ ] No errors in Railway logs
- [ ] Commands respond within 3 seconds

---

## 🔗 Useful Links

- Railway Dashboard: https://railway.app/dashboard
- Railway Docs: https://docs.railway.com
- Discord Developer Portal: https://discord.com/developers/applications
- MongoDB Atlas: https://cloud.mongodb.com
- Helius Dashboard: https://dashboard.helius.dev

---

## 💡 Pro Tips

1. **Set Up Two Services:**
   - Service 1: API Server (already deployed) ✅
   - Service 2: Discord Bot (this guide)

2. **Monitor Both Services:**
   - Check logs daily for errors
   - Set up Discord webhook alerts
   - Monitor Solana wallet balance

3. **Security Best Practices:**
   - Use strong admin passwords
   - Limit ADMIN_USER_IDS to trusted users
   - Never share DISCORD_BOT_TOKEN publicly
   - Rotate secrets every 90 days

4. **Testing in Development:**
   - Create a test Discord server
   - Use different GUILD_ID for testing
   - Test all commands before production

---

**Next Steps:** 
1. Login to Railway at https://railway.app
2. Copy your Discord User ID
3. Follow steps above to deploy bot
4. Test in Discord once deployed

Need help? Check logs or reach out for support! 🚀
