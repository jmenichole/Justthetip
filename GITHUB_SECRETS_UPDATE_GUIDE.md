# GitHub Secrets Update Guide for Wallet Registration Fix

This guide explains which GitHub Actions secrets need to be updated to fix the `/register-wallet` command 404 error.

## Summary of Changes

The wallet registration system now uses a split architecture:
- **Frontend (sign.html)**: Hosted on GitHub Pages at `https://jmenichole.github.io/Justthetip`
- **API Backend**: Hosted on Vercel at `https://justthetip.vercel.app`
- **Discord Bot**: Hosted on Railway

## Required GitHub Secrets Updates

### 1. FRONTEND_URL (NEW - Required for Bot Service)

**Add this new secret to GitHub repository:**

| Secret Name | Value | Used By |
|-------------|-------|---------|
| `FRONTEND_URL` | `https://jmenichole.github.io/Justthetip` | Discord Bot (Railway) |

**Purpose:** This is the URL where users are redirected when they run `/register-wallet` command. It points to the GitHub Pages site where the sign.html page is hosted.

**How to add:**
1. Go to: Repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `FRONTEND_URL`
4. Value: `https://jmenichole.github.io/Justthetip`
5. Click "Add secret"

### 2. API_BASE_URL (DEPRECATED - No longer needed for bot)

**Action:** This secret is **NO LONGER NEEDED** for the bot service. You can optionally remove it or leave it for backward compatibility.

**Why:** The sign.html page now automatically detects where to send API requests (Vercel in production, localhost in development).

### 3. Update Railway Deployment Workflow

The `.github/workflows/railway-deploy.yml` needs to be updated to include `FRONTEND_URL` in the bot deployment.

## Complete List of Required GitHub Secrets

### For Railway Bot Service (BOT ONLY)

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `FRONTEND_URL` | **NEW** - Frontend URL for wallet registration | `https://jmenichole.github.io/Justthetip` |
| `DISCORD_BOT_TOKEN` | Discord bot token | `MTQxOTc0Mjk4ODEyODYxNjQ3OQ...` |
| `DISCORD_CLIENT_ID` | Discord application client ID | `1419742988128616479` |
| `GUILD_ID` | Discord server/guild ID (optional) | `1413961128522023024` |
| `HELIUS_API_KEY` | Helius RPC API key | `074efb1f-0838-4334-839b-...` |
| `SOLANA_RPC_URL` | Solana RPC endpoint URL | `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY` |
| `SOL_RPC_URL` | Alternate Solana RPC URL | Same as SOLANA_RPC_URL |
| `MONGODB_URI` | MongoDB connection string (optional) | `mongodb+srv://...` |
| `DATABASE_URL` | PostgreSQL connection string (optional) | `postgresql://...` |
| `SUPER_ADMIN_USER_IDS` | Admin Discord user IDs | `123456789012345678` |
| `ADMIN_USER_IDS` | Admin Discord user IDs | `123456789012345678` |
| `SUPER_ADMIN_SECRET` | Admin password | `your_secure_password` |
| `EMERGENCY_ADMIN_SECRET` | Emergency password | `your_emergency_password` |

### For Vercel API Service

**Vercel environment variables are configured in Vercel Dashboard, not GitHub Actions.**

Go to: Vercel Dashboard → Project Settings → Environment Variables

| Variable Name | Description | Value |
|--------------|-------------|-------|
| `DISCORD_CLIENT_ID` | Discord application client ID | (Your Discord client ID) |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret | (Your OAuth secret) |
| `DISCORD_REDIRECT_URI` | OAuth redirect URL | `https://jmenichole.github.io/Justthetip/landing.html` |
| `SOLANA_RPC_URL` | Solana RPC endpoint URL | (Your RPC URL) |
| `MONGODB_URI` | MongoDB connection string (optional) | (Your MongoDB URI) |
| `NODE_ENV` | Environment | `production` |

**Note:** The Vercel API backend is automatically configured via `vercel.json` and doesn't use GitHub Actions for deployment.

## Step-by-Step Update Instructions

### Step 1: Add FRONTEND_URL Secret

```bash
# Via GitHub Web UI:
1. Go to: https://github.com/jmenichole/Justthetip/settings/secrets/actions
2. Click "New repository secret"
3. Name: FRONTEND_URL
4. Value: https://jmenichole.github.io/Justthetip
5. Click "Add secret"
```

### Step 2: Update Railway Deployment Workflow (Optional - Already Done)

The railway-deploy.yml workflow has been updated to include FRONTEND_URL. When you deploy next time, it will automatically sync this variable to Railway.

### Step 3: Redeploy Bot Service

After adding the secret, redeploy your bot:

```bash
# Option A: Via GitHub UI
1. Go to Actions tab
2. Select "Deploy to Railway" workflow
3. Click "Run workflow"
4. Choose service: "bot"
5. Click "Run workflow"

# Option B: Via commit message
git commit -m "Update bot with FRONTEND_URL [deploy-bot]"
git push origin main
```

### Step 4: Verify Configuration

1. Check Railway Dashboard → Bot Service → Variables
2. Confirm `FRONTEND_URL` is set to `https://jmenichole.github.io/Justthetip`
3. Test `/register-wallet` command in Discord
4. Verify link opens to GitHub Pages (not 404)
5. Test wallet connection with Phantom/Solflare

## Architecture Overview

```
┌─────────────────┐
│  Discord User   │
└────────┬────────┘
         │ /register-wallet
         ↓
┌─────────────────┐
│  Discord Bot    │
│   (Railway)     │ ← Uses FRONTEND_URL
└────────┬────────┘
         │ Generates link to:
         │ https://jmenichole.github.io/Justthetip/sign.html
         ↓
┌─────────────────┐
│  GitHub Pages   │
│   (Frontend)    │ ← Serves sign.html
└────────┬────────┘
         │ Makes API calls to:
         │ https://justthetip.vercel.app/api/registerwallet/verify
         ↓
┌─────────────────┐
│  Vercel API     │
│   (Backend)     │ ← Verifies signature & stores registration
└─────────────────┘
```

## Testing Checklist

After updating secrets and redeploying:

- [ ] Bot starts successfully on Railway
- [ ] `/register-wallet` command responds in Discord
- [ ] Generated link points to GitHub Pages (not localhost)
- [ ] Sign.html page loads without 404 error
- [ ] Wallet connection buttons work
- [ ] Phantom wallet connection succeeds
- [ ] Solflare wallet connection succeeds
- [ ] Signature verification completes
- [ ] "Wallet registered successfully" message appears
- [ ] User can now use `/balance` command

## Troubleshooting

### "404: NOT_FOUND" Error
- **Cause:** FRONTEND_URL not set or incorrect
- **Fix:** Add FRONTEND_URL secret and redeploy bot

### "Failed to connect wallet" Error
- **Cause:** API backend not responding
- **Fix:** Check Vercel deployment is live at justthetip.vercel.app

### "CORS Error" in Browser Console
- **Cause:** API backend CORS not configured
- **Fix:** Verify api/server.js includes `https://jmenichole.github.io` in CORS origins

### Link Opens to Localhost
- **Cause:** FRONTEND_URL not synced to Railway
- **Fix:** Redeploy bot service to sync environment variables

## Additional Resources

- [RAILWAY_GITHUB_SECRETS.md](./RAILWAY_GITHUB_SECRETS.md) - Complete secrets reference
- [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) - Vercel configuration
- [.env.example](./.env.example) - All environment variables with descriptions

## Support

If you encounter issues:
1. Check Railway logs for bot errors
2. Check Vercel logs for API errors
3. Check browser console for frontend errors
4. Verify all secrets are set correctly
5. Confirm GitHub Pages is deployed and accessible
