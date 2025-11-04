# 🚀 Complete Setup Guide - JustTheTip NFT Verification System

This guide covers **ALL** the missing pieces identified in the audit and walks you through complete deployment.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend API Setup](#backend-api-setup)
3. [Discord OAuth Configuration](#discord-oauth-configuration)
4. [Solana NFT Collection Setup](#solana-nft-collection-setup)
5. [Database Setup](#database-setup)
6. [Frontend Deployment](#frontend-deployment)
7. [Bot Integration](#bot-integration)
8. [Testing the Complete Flow](#testing-the-complete-flow)
9. [Troubleshooting](#troubleshooting)

---

## 1️⃣ Prerequisites

### Required Tools
```bash
# Node.js 16+ and npm
node --version  # Should be 16.x or higher
npm --version

# Git
git --version

# Solana CLI (for keypair generation)
solana --version

# MongoDB (local or Atlas account)
```

### Required Accounts
- ✅ Discord Developer Account
- ✅ MongoDB Atlas account (free tier works)
- ✅ Solana wallet with ~0.5 SOL for NFT minting
- ✅ GitHub account (for Pages hosting)
- ✅ Domain or use GitHub Pages URL

---

## 2️⃣ Backend API Setup

### Step 1: Install Dependencies
```bash
cd /Users/fullsail/justthetip
npm install express cors @solana/web3.js @metaplex-foundation/js tweetnacl bs58 mongodb dotenv
```

### Step 2: Create Mint Authority Keypair
```bash
# Generate new keypair
solana-keygen new --no-passphrase --outfile mint-authority.json

# Get the public address
solana-keygen pubkey mint-authority.json

# Fund it with SOL (needed for NFT minting)
# Mainnet: Transfer ~0.5 SOL to the address
# Devnet: solana airdrop 2 $(solana-keygen pubkey mint-authority.json) --url devnet
```

### Step 3: Convert Keypair to Base58
```bash
node -e "const fs = require('fs'); const bs58 = require('bs58'); const keypair = JSON.parse(fs.readFileSync('mint-authority.json')); console.log(bs58.encode(Buffer.from(keypair)));"
```

### Step 4: Configure Environment
```bash
cp .env.example .env
nano .env
```

Fill in:
```env
DISCORD_CLIENT_SECRET=<from Discord Developer Portal>
MONGODB_URI=<from MongoDB Atlas>
MINT_AUTHORITY_KEYPAIR=<base58 from step 3>
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### Step 5: Start Backend
```bash
# Development
node api/server.js

# Production (with PM2)
npm install -g pm2
pm2 start api/server.js --name justthetip-api
pm2 save
pm2 startup
```

### Step 6: Deploy to Production (Railway/Render/Fly.io)

**Railway.app (Recommended):**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Add environment variables
railway variables set DISCORD_CLIENT_SECRET="your_secret"
railway variables set MONGODB_URI="your_mongodb_uri"
railway variables set MINT_AUTHORITY_KEYPAIR="your_base58_key"

# Deploy
railway up
```

Your API will be at: `https://your-app.railway.app`

---

## 3️⃣ Discord OAuth Configuration

### Step 1: Create Discord Application
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "JustTheTip"
4. Save the **Application ID** (this is your DISCORD_CLIENT_ID)

### Step 2: Configure OAuth2
1. Go to OAuth2 → General
2. Click "Add Redirect"
3. Add these redirect URIs:
   ```
   https://jmenichole.github.io/Justthetip/landing.html
   http://localhost:5500/docs/landing.html (for local testing)
   ```
4. Copy your **Client Secret**

### Step 3: Set Bot Permissions
1. Go to Bot section
2. Enable these intents:
   - ✅ Server Members Intent
   - ✅ Message Content Intent (if using message commands)
3. Copy your **Bot Token**

### Step 4: Create Bot Invite Link
```
https://discord.com/api/oauth2/authorize?client_id=1419742988128616479&permissions=0&scope=bot%20applications.commands
```

---

## 4️⃣ Solana NFT Collection Setup

### Step 1: Create Collection NFT (Optional but Recommended)
```javascript
// create-collection.js
const { Connection, Keypair } = require('@solana/web3.js');
const { Metaplex, keypairIdentity } = require('@metaplex-foundation/js');
const bs58 = require('bs58');
const fs = require('fs');

async function createCollection() {
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const mintAuthority = Keypair.fromSecretKey(
        bs58.decode(process.env.MINT_AUTHORITY_KEYPAIR)
    );
    
    const metaplex = Metaplex.make(connection).use(keypairIdentity(mintAuthority));
    
    const { nft: collectionNft } = await metaplex.nfts().create({
        uri: 'https://tan-glamorous-porcupine-751.mypinata.cloud/ipfs/bafybeihdwvqhzw3zaecne4o43mtoan23sc5janjgtnqvdrds5qkjk6lowu',
        name: 'JustTheTip Verified Collection',
        sellerFeeBasisPoints: 0,
        symbol: 'JTT',
        isCollection: true
    });
    
    console.log('✅ Collection created:', collectionNft.address.toString());
    return collectionNft.address.toString();
}

createCollection().then(address => {
    console.log('Add this to your .env:');
    console.log(`VERIFIED_COLLECTION_ADDRESS=${address}`);
}).catch(console.error);
```

Run it:
```bash
node create-collection.js
```

### Step 2: Update .env
```env
VERIFIED_COLLECTION_ADDRESS=<output from above>
```

---

## 5️⃣ Database Setup

### Step 1: Create MongoDB Atlas Cluster
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free M0 cluster
3. Create database user (username/password)
4. Whitelist IP: `0.0.0.0/0` (all IPs)
5. Get connection string

### Step 2: Initialize Collections
```javascript
// init-database.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function initDatabase() {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('justthetip');
    
    // Create collections
    await db.createCollection('verifications');
    await db.createCollection('tickets');
    await db.createCollection('wallets');
    
    // Create indexes
    await db.collection('verifications').createIndex({ discordId: 1 }, { unique: true });
    await db.collection('verifications').createIndex({ walletAddress: 1 });
    await db.collection('verifications').createIndex({ nftMintAddress: 1 });
    await db.collection('tickets').createIndex({ discordId: 1 });
    await db.collection('tickets').createIndex({ createdAt: -1 });
    await db.collection('wallets').createIndex({ userId: 1 }, { unique: true });
    
    console.log('✅ Database initialized');
    await client.close();
}

initDatabase().catch(console.error);
```

Run it:
```bash
node init-database.js
```

---

## 6️⃣ Frontend Deployment

### Step 1: Update Configuration in landing-app.js
```javascript
const CONFIG = {
    DISCORD_CLIENT_ID: '1419742988128616479',
    DISCORD_REDIRECT_URI: 'https://jmenichole.github.io/Justthetip/landing.html',
    API_BASE_URL: 'https://your-app.railway.app', // Your backend URL
    VERIFIED_NFT_COLLECTION: 'YOUR_COLLECTION_ADDRESS',
    SOLANA_NETWORK: 'mainnet-beta',
    RPC_ENDPOINT: 'https://api.mainnet-beta.solana.com'
};
```

### Step 2: Test Locally
```bash
# Install live-server
npm install -g live-server

# Serve from docs folder
cd docs
live-server --port=5500
```

Visit: `http://localhost:5500/landing_NEW.html`

### Step 3: Deploy to GitHub Pages
```bash
# Replace old landing page
mv docs/landing.html docs/landing_OLD.html
mv docs/landing_NEW.html docs/landing.html

# Commit and push
git add docs/
git commit -m "Deploy complete onboarding flow with NFT verification"
git push origin main
```

### Step 4: Verify GitHub Pages Settings
1. Go to your repo → Settings → Pages
2. Source: `main` branch, `/docs` folder
3. Custom domain (optional): `justthetip.site`
4. Enforce HTTPS: ✅

---

## 7️⃣ Bot Integration

### Step 1: Add Verification Checker to Bot
```javascript
// In bot_smart_contract.js or similar
const VerificationChecker = require('./utils/verificationChecker');
const database = require('./db/database');

// Initialize
const verificationChecker = new VerificationChecker(
    process.env.SOLANA_RPC_URL,
    process.env.VERIFIED_COLLECTION_ADDRESS,
    database
);

// Use in commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    // Check verification for protected commands
    const verification = await verificationChecker.isUserVerified(interaction.user.id);
    
    if (!verification.verified) {
        return interaction.reply({
            content: `⚠️ **Verification Required**\n\n${verification.message}\n\n🔗 Get verified: https://jmenichole.github.io/Justthetip/landing.html`,
            ephemeral: true
        });
    }
    
    // Command logic here...
});
```

### Step 2: Add Verification Command
```javascript
// commands/verify-status.js
module.exports = {
    data: {
        name: 'verify-status',
        description: 'Check your verification status'
    },
    async execute(interaction, verificationChecker) {
        const stats = await verificationChecker.getVerificationStats(interaction.user.id);
        
        if (!stats) {
            return interaction.reply({
                content: '❌ You are not verified.\n🔗 Get verified: https://jmenichole.github.io/Justthetip/landing.html',
                ephemeral: true
            });
        }
        
        return interaction.reply({
            content: `✅ **Verified!**\n\n` +
                `👤 Discord: ${stats.discordUsername}\n` +
                `💼 Wallet: \`${stats.walletAddress.slice(0, 8)}...${stats.walletAddress.slice(-8)}\`\n` +
                `🎫 NFT: \`${stats.nftMintAddress.slice(0, 8)}...${stats.nftMintAddress.slice(-8)}\`\n` +
                `📅 Verified: ${new Date(stats.verifiedAt).toLocaleDateString()}`,
            ephemeral: true
        });
    }
};
```

---

## 8️⃣ Testing the Complete Flow

### End-to-End Test Checklist

1. **Visit Landing Page**
   ```
   https://jmenichole.github.io/Justthetip/landing.html
   ```

2. **Click "Get Started"**
   - ✅ Terms modal appears
   - ✅ Can't proceed without accepting terms
   - ✅ Terms checkbox works

3. **Accept Terms**
   - ✅ Terms saved to localStorage
   - ✅ Onboarding modal appears
   - ✅ Shows "Step 1: Connect Discord"

4. **Connect Discord**
   - ✅ Redirects to Discord OAuth
   - ✅ Returns with access token
   - ✅ Shows Discord avatar and username
   - ✅ Advances to wallet connection step

5. **Connect Wallet**
   - ✅ Phantom popup appears
   - ✅ Wallet connects successfully
   - ✅ Shows wallet address
   - ✅ Advances to signature step

6. **Sign Message**
   - ✅ Message preview shows correct data
   - ✅ Phantom signature prompt appears
   - ✅ Signature captured
   - ✅ Advances to NFT minting step

7. **Mint NFT**
   - ✅ POST request to `/api/mintBadge`
   - ✅ Backend verifies signature
   - ✅ NFT minted on Solana
   - ✅ Success screen shows NFT address
   - ✅ Solscan link works

8. **Add Bot**
   - ✅ Bot invite link works
   - ✅ Bot added to server
   - ✅ Slash commands appear

9. **Use Bot Command**
   - ✅ `/verify-status` shows verified
   - ✅ `/tip` command works
   - ✅ Unverified users blocked

---

## 9️⃣ Troubleshooting

### Issue: "Discord OAuth error"
**Solution:**
- Verify `DISCORD_CLIENT_SECRET` in .env
- Check redirect URI matches exactly
- Ensure OAuth2 scopes include `identify`

### Issue: "NFT minting failed"
**Solution:**
- Check mint authority has SOL balance
- Verify `MINT_AUTHORITY_KEYPAIR` is correct base58
- Check RPC endpoint is responding
- Try devnet first

### Issue: "Signature verification failed"
**Solution:**
- Ensure message format matches exactly
- Check timestamp format (ISO 8601)
- Verify wallet is actually signing the message

### Issue: "Database connection failed"
**Solution:**
- Check MongoDB URI format
- Whitelist your IP in Atlas
- Verify network access settings
- Test connection with `mongosh`

### Issue: "Bot doesn't check verification"
**Solution:**
- Ensure `verificationChecker` initialized
- Check database connection in bot
- Verify `VERIFIED_COLLECTION_ADDRESS` set
- Clear verification cache if testing

---

## 🎉 Deployment Checklist

Before going live:

- [ ] Backend API deployed and accessible
- [ ] Environment variables configured
- [ ] MongoDB indexes created
- [ ] NFT collection created
- [ ] Discord OAuth configured
- [ ] Frontend deployed to GitHub Pages
- [ ] Bot verification integrated
- [ ] End-to-end flow tested
- [ ] Error handling verified
- [ ] Rate limiting enabled
- [ ] Monitoring/logging set up
- [ ] Backup strategy in place

---

## 🔐 Security Notes

1. **Never commit `.env` file**
2. **Keep `MINT_AUTHORITY_KEYPAIR` secure**
3. **Use HTTPS everywhere**
4. **Implement rate limiting on API**
5. **Monitor for suspicious activity**
6. **Regular security audits**
7. **Keep dependencies updated**

---

## 📞 Support

- **GitHub Issues:** https://github.com/jmenichole/Justthetip/issues
- **Support Page:** https://jmenichole.github.io/Justthetip/support.html
- **Email:** contact@justthetip.bot

---

**Built with ❤️ for the Solana community**
