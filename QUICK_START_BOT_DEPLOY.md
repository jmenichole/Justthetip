# 🚀 QUICK START: Deploy Discord Bot to Railway (5 Minutes)

## ✅ Step 1: Get Your Discord User ID (30 seconds)
1. Open Discord → Settings → Advanced
2. Enable **Developer Mode**
3. Right-click your username → **Copy User ID**
4. Save this ID - you'll need it in Step 3

---

## 🌐 Step 2: Login to Railway (1 minute)
1. Go to: https://railway.app
2. Click **"Login with GitHub"**
3. Authorize Railway

---

## 📦 Step 3: Create New Service (2 minutes)

### In Railway Dashboard:
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose: **jmenichole/Justthetip**
4. Railway will start building - **STOP IT!** (Click "Cancel Deployment")

### Before deploying, add environment variables:

Click **"Variables"** tab → Click **"RAW Editor"** → Paste this:

```bash
# Copy your BOT_TOKEN from local .env first!
BOT_TOKEN=paste_your_actual_bot_token_here
CLIENT_ID=1419742988128616479
GUILD_ID=1413961128522023024
HELIUS_API_KEY=074efb1f-0838-4334-839b-2f5780b43eca
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=074efb1f-0838-4334-839b-2f5780b43eca
SOL_RPC_URL=https://mainnet.helius-rpc.com/?api-key=074efb1f-0838-4334-839b-2f5780b43eca
MONGODB_URI=mongodb+srv://justthetip1:JWjwE7xgOmmc6k3O@justhetip.0z3jtr.mongodb.net/?retryWrites=true&w=majority
NODE_ENV=production
SUPER_ADMIN_USER_IDS=your_discord_user_id_from_step_1
ADMIN_USER_IDS=your_discord_user_id_from_step_1
SUPER_ADMIN_SECRET=YourSecurePassword123
EMERGENCY_ADMIN_SECRET=EmergencyPassword456
SOL_PRIVATE_KEY=[]
TRX_PRIVATE_KEY=
ETH_PRIVATE_KEY=
XRP_SEED=
ETHEREUM_RPC_URL=
TRON_API_KEY=
XRP_SERVER=
DATABASE_URL=postgresql://localhost:5432/justthetip
```

**IMPORTANT:** 
- Replace `paste_your_actual_bot_token_here` with BOT_TOKEN from your local `.env`
- Replace `your_discord_user_id_from_step_1` with the User ID you copied

---

## ⚙️ Step 4: Configure Start Command (30 seconds)

In Railway:
1. Click **"Settings"** tab
2. Find **"Custom Start Command"**
3. Enter: `node bot.js`
4. Click **"Save"**

---

## 🚀 Step 5: Deploy! (1 minute)

1. Click **"Deploy"** button (top right)
2. Watch the build logs
3. Wait for: ✅ **"Build completed successfully"**
4. Check logs for: 🟢 **"Logged in as YourBot#1234"**

---

## ✅ Step 6: Test in Discord (30 seconds)

In your Discord server, try these commands:
```
/help
/balance
/status
```

If commands work → **YOU'RE DONE!** 🎉

---

## 🔍 Troubleshooting

### "MissingEnvVarsError"
❌ **Problem:** Missing environment variables
✅ **Fix:** Add all variables from Step 3

### "401 Unauthorized"
❌ **Problem:** Wrong BOT_TOKEN
✅ **Fix:** Copy exact token from local `.env` file

### "Database connection failed"
❌ **Problem:** MongoDB connection issue
✅ **Fix:** Check MONGODB_URI is correct (no spaces)

### Commands don't appear in Discord
❌ **Problem:** Commands not registered
✅ **Fix:** Run `node register-commands.js` locally first

---

## 💰 Cost

- **Free Trial:** $5 credit (no card required)
- **Hobby Plan:** $5/month
- **Bot Usage:** ~$2-3/month
- **Total with API:** ~$5/month for both services

---

## 📊 What You Get

✅ **24/7 uptime** - Bot always online
✅ **Auto-restart** - Recovers from crashes
✅ **Free SSL** - Secure connections
✅ **Git deploy** - Push to GitHub = Auto deploy
✅ **Logs** - Real-time error monitoring

---

## 🎯 Next Steps After Deployment

1. ✅ Monitor logs for 24 hours
2. 🔔 Set up health check alerts
3. 💾 Backup environment variables
4. 📱 Test all slash commands
5. 🎨 Customize bot responses

---

## 📚 Related Docs

- Full Setup Guide: `BOT_RAILWAY_SETUP.md`
- Environment Variables: `RAILWAY_BOT_ENV.txt`
- Railway Config: `railway-bot.json`
- All Commands: See bot.js lines 47-125

---

**Need Help?**
- Check Railway logs first
- Verify all environment variables
- Test locally with `node bot.js`
- Review error messages carefully

**Success Indicators:**
- ✅ Bot shows "Online" in Discord
- ✅ Commands respond within 3 seconds
- ✅ Railway logs show "Database connected"
- ✅ No error messages in logs

🎉 **Your bot will now run 24/7 on Railway!**
