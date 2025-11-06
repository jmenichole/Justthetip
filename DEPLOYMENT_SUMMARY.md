# 🚀 Deployment Summary - Railway/Render Setup

**Created:** 2025-01-XX  
**Status:** Ready to Deploy  
**Platform:** Railway (recommended) or Render

---

## What We Just Created

### ✅ Deployment Configuration Files

1. **`railway.json`** - Railway build/deploy settings
2. **`.railwayignore`** - Excludes unnecessary files (docs, tests, security files)
3. **`Procfile`** - Process definition for deployment platforms
4. **`setup-railway.sh`** - Automated setup script ⚡
5. **`DEPLOY_BACKEND.md`** - Complete deployment guide

---

## Quick Start (5 Minutes)

### Option 1: Automated Setup (Recommended)

```bash
cd /Users/fullsail/justthetip

# Run the setup script
./setup-railway.sh

# This will:
# ✅ Generate mint authority keypair
# ✅ Convert keypair to Railway format
# ✅ Check Discord secret
# ✅ Verify deployment files
# ✅ (Optional) Test server locally
```

### Option 2: Manual Setup

Follow **`DEPLOY_BACKEND.md`** for step-by-step instructions.

---

## Railway Deployment (Fastest)

### 1. Go to Railway

```
https://railway.app
→ Sign in with GitHub
→ New Project
→ Deploy from GitHub repo
→ Select: jmenichole/Justthetip
```

### 2. Add Environment Variables

In Railway **Variables** tab:

```bash
DISCORD_CLIENT_ID=1419742988128616479
DISCORD_CLIENT_SECRET=<from_discord_portal>
DISCORD_REDIRECT_URI=https://jmenichole.github.io/Justthetip/landing.html

SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
MINT_AUTHORITY_KEYPAIR=<from_mint-keypair.txt>

MONGODB_URI=mongodb+srv://justhetip.0z3jtr.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509

PORT=3000
NODE_ENV=production
```

### 3. Generate Domain

```
Settings → Networking → Generate Domain
→ Copy URL (e.g., justthetip-production.up.railway.app)
```

### 4. Update Frontend

Edit `docs/landing-app.js`:

```javascript
const CONFIG = {
  DISCORD_CLIENT_ID: '1419742988128616479',
  DISCORD_REDIRECT_URI: 'https://jmenichole.github.io/Justthetip/landing.html',
  API_BASE_URL: 'https://your-railway-url.up.railway.app', // ← Update
  TERMS_VERSION: '1.0',
  PINATA_CID: 'bafybeihdwvqhzw3zaecne4o43mtoan23sc5janjgtnqvdrds5qkjk6lowu'
};
```

### 5. Push & Deploy

```bash
git add docs/landing-app.js
git commit -m "feat: Update API_BASE_URL for Railway deployment"
git push origin main
```

**Done!** Railway auto-deploys. Frontend updates via GitHub Pages.

---

## Alternative: Render Deployment

If you prefer Render:

### 1. Go to Render

```
https://render.com
→ Sign in with GitHub
→ New + → Web Service
→ Connect jmenichole/Justthetip
```

### 2. Configure

```
Name: justthetip-api
Build Command: npm install
Start Command: node api/server.js
Plan: Free
```

### 3. Add Environment Variables

Same list as Railway (see above).

### 4. Deploy

Render will build and deploy automatically. Use the provided URL in your frontend.

---

## Cost Comparison

| Platform | Free Tier | Pros | Cons |
|----------|-----------|------|------|
| **Railway** | 500 hrs/month, $5 credit | Easy setup, great DX, auto-deploy | Usage-based pricing |
| **Render** | 750 hrs/month | More free hours, simple | Spins down after 15min inactivity |
| **Vercel** | Unlimited | Edge functions, fast CDN | Not ideal for long-running servers |
| **Supabase** | Good for DB | Built-in DB, auth | Would require architecture change |

**Recommendation:** Railway for backend, GitHub Pages for frontend (already set up).

---

## What Your Architecture Looks Like Now

```
┌─────────────────────────────────────────────────────┐
│                      FRONTEND                        │
│  GitHub Pages (jmenichole.github.io/Justthetip)    │
│  • docs/landing.html                                │
│  • docs/landing-app.js                              │
│  • docs/landing-styles.css                          │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ HTTPS requests
                      │
┌─────────────────────▼───────────────────────────────┐
│                  BACKEND API                         │
│  Railway/Render (your-app.up.railway.app)          │
│  • api/server.js                                     │
│  • POST /api/mintBadge                              │
│  • POST /api/discord/token                          │
│  • GET  /api/verification/:discordId                │
│  • POST /api/ticket                                 │
│  • GET  /api/health                                 │
└─────────┬────────────────────────┬──────────────────┘
          │                        │
          │                        │
┌─────────▼────────┐     ┌────────▼─────────┐
│  MongoDB Atlas   │     │   Solana Network  │
│  • Verifications │     │   • NFT Minting   │
│  • Wallets       │     │   • Transactions  │
│  • Tickets       │     │   • Verification  │
└──────────────────┘     └───────────────────┘
```

---

## Required Secrets Checklist

Before deploying, ensure you have:

- [ ] **DISCORD_CLIENT_SECRET**
  - Get from: https://discord.com/developers/applications/1419742988128616479/oauth2
  - Add to Railway/Render variables
  
- [ ] **MINT_AUTHORITY_KEYPAIR**
  - Generated by `setup-railway.sh` script
  - Saved in `mint-keypair.txt` (don't commit!)
  - Add array to Railway/Render variables
  
- [ ] **Mint Wallet Funded**
  - Public key shown by setup script
  - Send 0.5-1 SOL for testing
  - Check balance: `solana balance <pubkey>`
  
- [ ] **MongoDB URI**
  - Already in your .env: `mongodb+srv://justhetip.0z3jtr.mongodb.net/...`
  - Copy to Railway/Render variables
  
- [ ] **Frontend Updated**
  - API_BASE_URL changed to Railway/Render URL
  - Committed and pushed to GitHub

---

## Testing Your Deployment

### 1. Test Backend Health

```bash
# Replace with your Railway/Render URL
curl https://your-app.up.railway.app/api/health

# Expected:
# {"status":"ok","timestamp":"...","message":"JustTheTip API is running"}
```

### 2. Test Frontend

```bash
# Open in browser
open https://jmenichole.github.io/Justthetip/landing.html

# Or test locally
open docs/landing.html

# Check:
# ✓ Terms modal appears
# ✓ Discord OAuth button works
# ✓ No console errors
```

### 3. Test Complete Flow

1. Click "Get Started"
2. Accept Terms
3. Click "Connect Discord" (redirects to Discord)
4. Authorize app
5. Connect Phantom wallet
6. Sign message
7. Mint NFT (requires funded mint wallet)
8. Install bot

---

## Troubleshooting

### "Cannot find module" error

**Cause:** Dependencies not installed  
**Fix:** Check Railway build logs, ensure `package.json` is in root

### "Port 3000 already in use"

**Cause:** Railway assigns dynamic port  
**Fix:** Already handled - `api/server.js` uses `process.env.PORT`

### CORS errors

**Cause:** Frontend domain not whitelisted  
**Fix:** Check `api/server.js` CORS config includes your frontend URL

### "Signature verification failed"

**Cause:** Mint keypair not loaded correctly  
**Fix:** Ensure `MINT_AUTHORITY_KEYPAIR` in Railway is valid JSON array `[1,2,3,...64]`

### MongoDB connection failed

**Cause:** URI or certificate issue  
**Fix:** 
- Verify `MONGODB_URI` is exact from MongoDB Atlas
- Try without `MONGO_CERT_PATH` first
- Check MongoDB Atlas network access (allow Railway IPs)

---

## Files Created

```
/Users/fullsail/justthetip/
├── DEPLOY_BACKEND.md              ← Complete deployment guide
├── DEPLOYMENT_SUMMARY.md          ← This file (quick reference)
├── setup-railway.sh               ← Automated setup script
├── railway.json                   ← Railway configuration
├── .railwayignore                 ← Exclude files from deployment
├── Procfile                       ← Process definition
└── mint-keypair.txt               ← Generated by script (DON'T COMMIT!)
```

---

## Next Steps

### Immediate (Now)

1. Run `./setup-railway.sh` to prepare deployment
2. Go to Railway.app and create project
3. Add environment variables
4. Generate domain

### After Deployment (15 min)

5. Update `docs/landing-app.js` with Railway URL
6. Push changes to GitHub
7. Test health endpoint
8. Test complete flow

### Before Production (30 min)

9. Fund mint authority wallet with SOL
10. Create NFT collection (see `docs/testing/.env.validation-report.md`)
11. Add `VERIFIED_COLLECTION_ADDRESS` to Railway
12. Integrate verification checker into bot

### Production (Go Live!)

13. Test everything end-to-end
14. Monitor Railway logs
15. Set up error tracking (optional: Sentry)
16. Announce to community 🎉

---

## Cost Estimates

### Railway Free Tier
- **500 hours/month** - ~20 days if running 24/7
- **$5 usage credit**
- **Shared resources**
- Perfect for testing + small production

### Railway Pro ($5/month)
- **Unlimited hours**
- **Better resources** (more CPU/RAM)
- **Priority support**

### Render Free Tier
- **750 hours/month** - ~31 days
- **Spins down after 15 min** (wakes on request)
- **Good for testing**

**Recommendation:** Start with Railway free tier, upgrade if needed.

---

## Support & Resources

### Documentation
- **DEPLOY_BACKEND.md** - Full deployment guide
- **docs/testing/.env.validation-report.md** - Environment config
- **QUICK_FIX_GUIDE.md** - Quick fixes
- **CONFIG_TEST_SUMMARY.md** - Test results

### External Links
- **Railway:** https://railway.app
- **Railway Docs:** https://docs.railway.app
- **Render:** https://render.com
- **Render Docs:** https://render.com/docs

### Discord Developer
- **Portal:** https://discord.com/developers/applications
- **OAuth2:** https://discord.com/developers/applications/1419742988128616479/oauth2

---

## Security Reminders

⚠️ **NEVER commit these files:**
- `mint-keypair.txt`
- `security/*.json`
- `security/*.pem`
- `.env` or `.env.*`

✅ **Always use:**
- `.gitignore` (already configured)
- Environment variables for secrets
- Railway/Render secret management
- Separate dev/prod configs

---

**Status:** 🟢 Ready to Deploy  
**Platform:** Railway (recommended)  
**Time Required:** 20-30 minutes  
**Difficulty:** Easy (automated script + UI)  

🚀 **Let's deploy!** Run `./setup-railway.sh` to start.
