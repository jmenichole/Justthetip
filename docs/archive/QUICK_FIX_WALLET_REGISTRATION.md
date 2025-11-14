# Quick Fix: Wallet Registration 404 Error

## TL;DR - What You Need to Do

### 1. Add ONE New GitHub Secret

Go to: https://github.com/jmenichole/Justthetip/settings/secrets/actions

**Add this secret:**
- **Name:** `FRONTEND_URL`
- **Value:** `https://jmenichole.github.io/Justthetip`

### 2. Redeploy Your Bot

After adding the secret, redeploy:

**Option A - Via GitHub Actions:**
1. Go to Actions tab
2. Click "Deploy to Railway" workflow
3. Click "Run workflow"
4. Select "bot"
5. Click "Run workflow" button

**Option B - Via Git:**
```bash
git commit --allow-empty -m "Deploy bot with FRONTEND_URL [deploy-bot]"
git push origin main
```

### 3. Verify It Works

Run `/register-wallet` in Discord and verify:
- ✅ Link opens to `https://jmenichole.github.io/Justthetip/sign.html`
- ✅ Page loads (no 404 error)
- ✅ "Connect Phantom Wallet" and "Connect Solflare Wallet" buttons appear
- ✅ Wallet connection and signing works

## What This Fixes

**Before:** `/register-wallet` command generated links to localhost or showed 404 errors

**After:** `/register-wallet` command generates links to GitHub Pages where the wallet sign request page is hosted

## Why This Works

The bot now uses the correct architecture:
1. **Bot (Railway)** → Generates link to GitHub Pages
2. **Frontend (GitHub Pages)** → User connects wallet and signs message
3. **API (Vercel)** → Verifies signature and registers wallet

## No Other Changes Needed

- ❌ No need to update `API_BASE_URL` (it's deprecated)
- ❌ No Vercel changes needed (already configured)
- ❌ No code changes needed (already merged)
- ✅ Just add the one secret and redeploy!

## If You Have Issues

1. Check Railway logs: `railway logs --service <bot-service-id>`
2. Verify secret is set: Railway Dashboard → Bot Service → Variables
3. Check FRONTEND_URL value is exactly: `https://jmenichole.github.io/Justthetip`
4. See [GITHUB_SECRETS_UPDATE_GUIDE.md](./GITHUB_SECRETS_UPDATE_GUIDE.md) for detailed troubleshooting

## Summary of All Secrets (Reference)

### Required for Bot (Railway)
- `RAILWAY_TOKEN` ✓
- `RAILWAY_PROJECT_ID` ✓
- `RAILWAY_BOT_SERVICE_ID` ✓
- `DISCORD_BOT_TOKEN` ✓
- `DISCORD_CLIENT_ID` ✓
- `FRONTEND_URL` ← **ADD THIS ONE**

### Optional for Bot (Railway)
- `GUILD_ID`, `HELIUS_API_KEY`, `SOLANA_RPC_URL`, `SOL_RPC_URL`
- `MONGODB_URI`, `DATABASE_URL`
- `SUPER_ADMIN_USER_IDS`, `ADMIN_USER_IDS`
- `SUPER_ADMIN_SECRET`, `EMERGENCY_ADMIN_SECRET`

### Required for API (Vercel - Already Set)
Configured in Vercel Dashboard (no changes needed):
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `SOLANA_RPC_URL`

That's it! Just add the one secret and redeploy. 🚀
