# 🚂 Railway Deployment - Quick Reference Card

## 🎯 Problem: Bot Not Online

**Root Cause:** Railway starts API server instead of Discord bot

**Quick Fix:**
1. Railway Dashboard → Settings → Start Command
2. Change to: `npm run start:bot-railway`
3. Add environment variables (see below)
4. Redeploy

---

## 🔑 Required Secrets (Minimum)

```bash
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
```

**Get them here:**
- https://discord.com/developers/applications
- Your App → Bot → Token (DISCORD_BOT_TOKEN)
- Your App → OAuth2 → Client ID (DISCORD_CLIENT_ID)

---

## ✅ Success Indicators

**In Railway Logs:**
```
✅ DISCORD_BOT_TOKEN: ***xxxx
✅ DISCORD_CLIENT_ID: 1419742988128616479
✅ All required secrets are present - Bot ready to start!
✅ Health checks passed
🟢 Logged in as YourBotName#1234
Database connected.
```

**In Discord:**
- Bot shows "Online" (green dot)
- `/help` command works
- Slash commands visible

---

## ❌ Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `DISCORD_BOT_TOKEN: MISSING` | Add DISCORD_BOT_TOKEN to Railway Variables |
| `DISCORD_CLIENT_ID: MISSING` | Add DISCORD_CLIENT_ID to Railway Variables |
| Bot offline in Discord | Check start command: `npm run start:bot-railway` |
| Commands don't work | Run `node register-commands.js` locally |
| Database failed | Check MONGODB_URI, add `0.0.0.0/0` to whitelist |

---

## 🔍 Verification Commands

```bash
# Test secrets verification
npm run verify-railway-secrets

# Start bot with health checks
npm run start:bot-railway

# Test locally first
npm run start:bot
```

---

## 📚 Full Documentation

- **Quick Start:** [RAILWAY_DEPLOYMENT_INSTRUCTIONS.md](./RAILWAY_DEPLOYMENT_INSTRUCTIONS.md)
- **Checklist:** [RAILWAY_BOT_CHECKLIST.md](./RAILWAY_BOT_CHECKLIST.md)
- **Detailed Fix:** [RAILWAY_FIX_DEPLOYMENT.md](./RAILWAY_FIX_DEPLOYMENT.md)
- **Config Guide:** [RAILWAY_CONFIG_GUIDE.md](./RAILWAY_CONFIG_GUIDE.md)

---

## 🆘 Still Not Working?

1. Check Railway logs for errors
2. Verify ALL secrets are set
3. Confirm start command is correct
4. Review full documentation above
5. Open GitHub issue with logs

---

**TL;DR:**
```bash
# In Railway Dashboard:
Start Command: npm run start:bot-railway

# In Railway Variables:
DISCORD_BOT_TOKEN=your_token
DISCORD_CLIENT_ID=your_id
MONGODB_URI=your_mongo_uri
SOLANA_RPC_URL=your_rpc_url
```

**Then:** Deploy and wait 2 minutes for bot to come online ✅
