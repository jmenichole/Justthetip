# 🚂 Complete Railway Deployment Guide

**Platform:** Railway.app  
**Time:** 20-30 minutes  
**Cost:** Free tier (500 hrs/month, $5 credit)

---

## Step-by-Step Deployment

### 1️⃣ Prepare Your Environment Variables

First, gather all required secrets:

```bash
cd /Users/fullsail/justthetip

# Generate mint authority keypair (if not done)
mkdir -p security
solana-keygen new --outfile security/mint-authority.json --no-bip39-passphrase

# Get public key (fund with 0.5-1 SOL)
solana-keygen pubkey security/mint-authority.json

# Convert to array for Railway
node -e "const fs = require('fs'); const kp = JSON.parse(fs.readFileSync('security/mint-authority.json')); console.log(JSON.stringify(Array.from(kp)));" > mint-keypair.txt

echo "✅ Keypair saved to mint-keypair.txt"
echo "⚠️  Don't commit this file!"
```

### 2️⃣ Create Railway Project

1. Go to **https://railway.app** and sign in with GitHub
2. Click **"New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Select **`jmenichole/Justthetip`** repository
5. Railway will auto-detect Node.js

### 3️⃣ Configure Railway Settings

In your Railway project:

**Settings Tab:**
- **Start Command:** `node api/server.js`
- **Build Command:** `npm install` (auto-detected)
- **Watch Paths:** Leave empty (deploys on any push)

### 4️⃣ Add Environment Variables

In **Variables** tab, add these one by one:

```bash
# Discord OAuth
DISCORD_CLIENT_ID=1419742988128616479
DISCORD_CLIENT_SECRET=<get_from_discord_portal>
DISCORD_REDIRECT_URI=https://jmenichole.github.io/Justthetip/landing.html

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
MINT_AUTHORITY_KEYPAIR=<paste_array_from_mint-keypair.txt>

# MongoDB (already have this)
MONGODB_URI=mongodb+srv://justhetip.0z3jtr.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509

# Server
PORT=3000
NODE_ENV=production
```

**To get DISCORD_CLIENT_SECRET:**
- Go to: https://discord.com/developers/applications/1419742988128616479/oauth2
- Click "Reset Secret" → Copy → Paste in Railway

### 5️⃣ Generate Domain & Deploy

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy your URL (e.g., `justthetip-production.up.railway.app`)
4. Deployment starts automatically!

### 6️⃣ Update Frontend Configuration

Edit `docs/landing-app.js`:

```javascript
const CONFIG = {
  DISCORD_CLIENT_ID: '1419742988128616479',
  DISCORD_REDIRECT_URI: 'https://jmenichole.github.io/Justthetip/landing.html',
  API_BASE_URL: 'https://your-railway-url.up.railway.app', // ← Update this
  TERMS_VERSION: '1.0',
  PINATA_CID: 'bafybeihdwvqhzw3zaecne4o43mtoan23sc5janjgtnqvdrds5qkjk6lowu'
};
```

### 7️⃣ Test Your Deployment

```bash
# Test health endpoint
curl https://your-railway-url.up.railway.app/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-01-XX...","message":"JustTheTip API is running"}

# Test from browser
open https://jmenichole.github.io/Justthetip/landing.html
```

---

## Alternative: Render Deployment

If you prefer Render:

### Quick Render Setup

1. Go to **https://render.com** → Sign in with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect **`jmenichole/Justthetip`** repo
4. Configure:
   - **Name:** `justthetip-api`
   - **Build Command:** `npm install`
   - **Start Command:** `node api/server.js`
   - **Plan:** Free

5. Add Environment Variables (same as Railway list above)
6. Click **"Create Web Service"**
7. Copy your URL: `https://justthetip-api.onrender.com`

---

## MongoDB Certificate Upload (If Needed)

If Railway needs the MongoDB certificate file:

### Option 1: Use Environment Variable

```bash
# Base64 encode the certificate
base64 -i X509-cert-1238302248811631245.pem > cert-base64.txt

# Add to Railway as MONGO_CERT_BASE64
# Then decode in code:
# const cert = Buffer.from(process.env.MONGO_CERT_BASE64, 'base64').toString('utf8');
```

### Option 2: Use Connection String Auth

MongoDB Atlas X.509 auth should work with just the URI. If issues:

1. Go to MongoDB Atlas → Database Access
2. Add new user with password authentication
3. Update connection string in Railway

---

## Verification Checklist

After deployment:

- [ ] Backend deployed successfully (check Railway logs)
- [ ] Health endpoint responds: `curl https://your-url.up.railway.app/api/health`
- [ ] Frontend CONFIG updated with new API_BASE_URL
- [ ] Changes pushed to GitHub (triggers Pages deployment)
- [ ] Test complete flow:
  - [ ] Terms modal appears
  - [ ] Discord OAuth redirects correctly
  - [ ] Wallet connects
  - [ ] Message signs
  - [ ] NFT mints (requires funded mint wallet)
  - [ ] Bot invitation works

---

## Common Issues & Fixes

### "Module not found" errors

Railway didn't install dependencies. Check:
- `package.json` exists in root
- Run `npm install` locally first
- Check Railway build logs

**Fix:** Add to `railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install --production"
  }
}
```

### "Port already in use"

Railway assigns dynamic PORT.

**Fix:** Ensure `api/server.js` uses:
```javascript
const PORT = process.env.PORT || 3000;
```

### CORS errors

Frontend can't reach backend.

**Fix:** Update `api/server.js` CORS config:
```javascript
app.use(cors({
    origin: [
        'https://jmenichole.github.io',
        'https://your-railway-url.up.railway.app'
    ],
    credentials: true
}));
```

### MongoDB connection fails

Certificate or URI issue.

**Fix:** Check Railway Variables:
- `MONGODB_URI` is exactly from MongoDB Atlas
- Try without `MONGO_CERT_PATH` first (X.509 should work from URI alone)

### "Signature verification failed"

Mint authority keypair not loaded.

**Fix:** Verify Railway variable:
- `MINT_AUTHORITY_KEYPAIR` is valid JSON array: `[1,2,3,...64]`
- No spaces or formatting issues
- Exactly 64 numbers

---

## Monitoring & Logs

### Railway Dashboard

- **Deployments:** View build/deploy status
- **Logs:** Real-time application logs
- **Metrics:** CPU/Memory usage
- **Variables:** Manage secrets

### View Logs

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# View logs
railway logs
```

---

## Cost Estimates

### Railway Free Tier
- 500 hours/month execution time
- $5 in usage credits
- Shared resources
- **Enough for testing + small production**

### Railway Pro ($5/month)
- Unlimited hours
- Better resources
- Priority support

### Render Free Tier
- 750 hours/month
- Spins down after 15 min inactivity
- Good for testing

---

## Quick Commands Reference

```bash
# Test health endpoint
curl https://your-railway-url.up.railway.app/api/health

# Test Discord token exchange
curl -X POST https://your-railway-url.up.railway.app/api/discord/token \
  -H "Content-Type: application/json" \
  -d '{"code":"test","redirectUri":"https://jmenichole.github.io/Justthetip/landing.html"}'

# View Railway logs
railway logs --follow

# Redeploy
railway up

# Check status
railway status
```

---

## Next Steps

1. ✅ Deploy backend to Railway (follow steps 1-5 above)
2. ✅ Update `docs/landing-app.js` with Railway URL
3. ✅ Push changes to GitHub
4. ✅ Test complete flow
5. ✅ Fund mint authority wallet with SOL
6. ✅ Create NFT collection (see `.env.validation-report.md`)
7. ✅ Add `VERIFIED_COLLECTION_ADDRESS` to Railway
8. ✅ Integrate verification checker into bot
9. ✅ Monitor logs for errors
10. 🎉 Launch!

---

**Support:**
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Render Docs: https://render.com/docs

**Your Files:**
- `railway.json` - Railway configuration ✅ Created
- `.railwayignore` - Exclude files ✅ Created
- `Procfile` - Process definition ✅ Created
