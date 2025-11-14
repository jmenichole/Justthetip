# 🚂 Railway Deployment Guide - JustTheTip Backend

**Platform:** Railway.app  
**Service:** Backend API (Express + Solana + MongoDB)  
**Estimated Time:** 20-30 minutes  
**Cost:** Free tier available (500 hours/month)

> **📖 Configuration Reference:** See [RAILWAY_CONFIG_GUIDE.md](./RAILWAY_CONFIG_GUIDE.md) for detailed information about Railway configuration files and multi-service setup.

---

## Why Railway?

✅ **Easy Node.js Deployment** - Automatic detection  
✅ **Environment Variables UI** - Simple secret management  
✅ **GitHub Integration** - Auto-deploy on push  
✅ **Free SSL/HTTPS** - Automatic certificates  
✅ **Generous Free Tier** - 500 hours/month, $5 credit  
✅ **Instant Deployment** - Live in 2-3 minutes  

---

## Prerequisites

Before starting, ensure you have:

- [x] GitHub account with Justthetip repository
- [x] Railway account (sign up at https://railway.app)
- [x] Discord DISCORD_CLIENT_SECRET (from Developer Portal)
- [x] Mint authority keypair generated (see Quick Setup below)
- [x] MongoDB URI (already in your .env)
- [x] 0.5-1 SOL in mint authority wallet

---

## Quick Setup (If Not Done)

### 1. Get Discord Client Secret

```bash
# Go to: https://discord.com/developers/applications/1419742988128616479/oauth2
# Click "Reset Secret" (if first time) or copy existing
# Save it - you'll need it for Railway
```

### 2. Generate Mint Authority Keypair

```bash
cd /Users/fullsail/justthetip
mkdir -p security
solana-keygen new --outfile security/mint-authority.json --no-bip39-passphrase

# Get the public key (you'll fund this wallet)
solana-keygen pubkey security/mint-authority.json

# Convert to base58 array for Railway
node -e "const fs = require('fs'); const kp = JSON.parse(fs.readFileSync('security/mint-authority.json')); console.log(JSON.stringify(Array.from(kp)));"

# Copy the output - you'll paste this in Railway as MINT_AUTHORITY_KEYPAIR
```

### 3. Fund Mint Wallet

```bash
# Send 0.5-1 SOL to the public key from step 2
# Use Phantom or Solflare to transfer from your main wallet
```

---

## Railway Deployment Steps

### Step 1: Create Railway Account & Project

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select repository: **`jmenichole/Justthetip`**
6. Railway will detect Node.js and create the project

### Step 2: Configure Build Settings

Railway auto-detects `package.json`, but let's verify:

1. In Railway dashboard, click your project
2. Go to **Settings** tab
3. Verify:
   - **Build Command:** `npm install` (auto-detected)
   - **Start Command:** `node api/server.js` (may need to set manually)
   - **Root Directory:** Leave empty (or set to `/` if issues)

### Step 3: Add Environment Variables

In Railway dashboard, go to **Variables** tab and add:

#### Required Variables

```bash
# Discord OAuth
DISCORD_CLIENT_ID=1419742988128616479
DISCORD_CLIENT_SECRET=YOUR_SECRET_FROM_DISCORD_PORTAL
DISCORD_REDIRECT_URI=https://jmenichole.github.io/Justthetip/landing.html

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
MINT_AUTHORITY_KEYPAIR=[paste the array from Quick Setup step 2]
VERIFIED_COLLECTION_ADDRESS=REPLACE_AFTER_CREATING_COLLECTION

# MongoDB
MONGODB_URI=mongodb+srv://justhetip.0z3jtr.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509
MONGO_CERT_PATH=X509-cert-1238302248811631245.pem

# Server
PORT=3000
NODE_ENV=production

# Optional but recommended
CORS_ORIGIN=https://jmenichole.github.io
```

#### How to Add Variables in Railway

1. Click **"+ New Variable"**
2. Enter variable name (e.g., `DISCORD_CLIENT_SECRET`)
3. Paste value
4. Click **"Add"**
5. Repeat for all variables above

### Step 4: Deploy!

1. Railway will automatically deploy after adding variables
2. Wait 2-3 minutes for deployment
3. Check **Deployments** tab for status

### Step 5: Get Your Railway URL

1. Go to **Settings** tab
2. Find **Domains** section
3. Click **"Generate Domain"**
4. Copy the generated URL (e.g., `https://justthetip-production.up.railway.app`)
5. **Save this URL** - you'll use it in your frontend

---

## Post-Deployment Configuration

### Update Frontend with Railway URL

<function_calls>
<invoke name="read_file">
<parameter name="filePath">/Users/fullsail/justthetip/docs/landing-app.js