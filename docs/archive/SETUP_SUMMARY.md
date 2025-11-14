# 🚀 Quick Setup Summary: Bot 24/7 + New Commands

## ✅ What We've Done

### 1. Backend API - LIVE ✓
- ✅ Deployed at: https://overflowing-acceptance-production.up.railway.app
- ✅ Database: Connected (MongoDB with username/password)
- ✅ Solana: Connected (Helius RPC)
- ✅ Mint Wallet: Funded with 0.25 SOL
- ✅ NFT Minting: Ready (needs base58 keypair update in Railway)

### 2. New Slash Commands Created
- ✅ Created `IMPROVED_SLASH_COMMANDS.js` with user-friendly commands
- ✅ Created `register-commands.js` to update Discord
- ⚠️ Bot token needs refreshing in Discord Developer Portal

---

## 🔧 IMMEDIATE ACTION ITEMS

### A. Refresh Discord Bot Token
Your current bot token appears to be invalid/expired.

**Steps:**
1. Go to https://discord.com/developers/applications
2. Select your application (ID: 1419742988128616479)
3. Go to "Bot" section
4. Click "Reset Token" button
5. Copy the new token
6. Update in three places:
   - Local `.env` file: `DISCORD_BOT_TOKEN=new_token_here`
   - Railway API service: Update `DISCORD_BOT_TOKEN` variable
   - Railway bot service (when created): Add `DISCORD_BOT_TOKEN` variable

###  B. Update Mint Authority Keypair in Railway
Your API needs the base58 format, not JSON array.

**Current (wrong):** `[213,77,31,179,...]`  
**Correct format:** `5GM2rPG2macgM8pXTCb6WYQttG2tPQMPY97kZX4BwfeHeZ2vj5gP41kXQPK8w8yXyWecdQHaBrR3h4c2ofwJVMRH`

**Railway Steps:**
1. Go to your Railway project
2. Click on API service
3. Go to Variables
4. Find `MINT_AUTHORITY_KEYPAIR`
5. Replace entire value with the base58 string above
6. Save (Railway will auto-redeploy)

### C. Register New Slash Commands

**Option 1: Automated (After token refresh)**
```bash
# Update .env with new DISCORD_BOT_TOKEN first
node register-commands.js
```

**Option 2: Manual (Discord Developer Portal)**
1. Go to https://discord.com/developers/applications/1419742988128616479
2. Go to "Bot" → "Commands"
3. Delete all existing commands
4. Copy commands from `IMPROVED_SLASH_COMMANDS.js`
5. Add them one by one

### D. Deploy Bot for 24/7 Operation

**Railway Deployment (Recommended - $5/month):**

1. Create new service in Railway:
   ```
   Name: justthetip-discord-bot
   Source: GitHub repository (jmenichole/Justthetip)
   Build Command: npm install
   Start Command: node bot.js
   ```

2. Add environment variables:
   ```
   DISCORD_BOT_TOKEN=<your_new_token>
   DISCORD_CLIENT_ID=1419742988128616479
   DISCORD_APP_ID=1419742988128616479
   GUILD_ID=1413961128522023024
   LOG_CHANNEL_ID=1414091527969439824
   
   MONGODB_URI=mongodb+srv://justthetip1:JWjwE7xgOmmc6k3O@justhetip.0z3jtr.mongodb.net/?retryWrites=true&w=majority
   
   SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=074efb1f-0838-4334-839b-2f5780b43eca
   HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=074efb1f-0838-4334-839b-2f5780b43eca
   
   FEE_PAYMENT_SOL_ADDRESS=H8m2gN2GEPSbk4u6PoWa8JYkEZRJWH45DyWjbAm76uCX
   
   NODE_ENV=production
   ```

3. Deploy and monitor logs

---

## 📋 NEW SLASH COMMANDS

### User Commands
| Command | Description |
|---------|-------------|
| `/verify` | Complete Discord verification and get NFT badge |
| `/connect-wallet` | Link Solana wallet to Discord account |
| `/get-badge` | Mint verification NFT (requires payment) |
| `/balance` | Check wallet balance and verification status |
| `/status` | Check verification status and NFT details |
| `/check-payment` | Verify if verification payment received |
| `/help` | View all commands and user guide |
| `/support` | Get help or report an issue |
| `/pricing` | View verification costs |
| `/info` | Learn about verification system |
| `/stats` | View bot statistics |

### Admin Commands
| Command | Description |
|---------|-------------|
| `/admin-stats` | Detailed analytics (Admin only) |
| `/admin-user` | Look up user verification (Admin only) |

---

## 🔐 Security Checklist

- [x] MongoDB using username/password auth (not X509)
- [x] All secrets in Railway environment variables
- [x] RAILWAY_ENV_VARS.txt added to .gitignore
- [x] Mint authority wallet funded (0.25 SOL)
- [x] Backend API deployed and running
- [ ] **Bot token refreshed** ← DO THIS FIRST
- [ ] **Mint keypair updated to base58** ← DO THIS SECOND
- [ ] Discord bot deployed to Railway
- [ ] New slash commands registered
- [ ] Test complete verification flow

---

## 🧪 Testing Checklist (After Setup)

Once everything is deployed, test these in order:

1. **Backend Health Check**
   ```bash
   curl https://overflowing-acceptance-production.up.railway.app/api/health
   ```
   Should show: `"database": "connected"`, `"solana": "connected"`, `"nftMinting": "enabled"`

2. **Discord Bot Online**
   - Bot should show as online in Discord
   - Type `/` in Discord to see new commands
   - Test `/help` command

3. **Verification Flow**
   ```
   /connect-wallet → /check-payment → /get-badge → /status
   ```

4. **Monitor Logs**
   - Railway API logs: Check for errors
   - Railway bot logs: Check connection status
   - MongoDB: Verify records are being created

---

## 💰 Cost Breakdown

| Service | Cost | Purpose |
|---------|------|---------|
| Railway (API) | $5/month | Backend API + Database |
| Railway (Bot) | Same $5 | Discord bot (included) |
| MongoDB Atlas | Free | Database storage |
| Solana Network | ~$0.00025/tx | Blockchain fees |
| **Total** | **$5/month** | Everything running 24/7 |

---

## 📞 Support

**Documentation Created:**
- `BOT_247_DEPLOYMENT_GUIDE.md` - Complete 24/7 hosting guide
- `IMPROVED_SLASH_COMMANDS.js` - New command definitions
- `register-commands.js` - Command registration script
- `RAILWAY_ENV_VARS.txt` - All environment variables (updated)

**Next Steps:**
1. Refresh bot token in Discord Developer Portal
2. Update `MINT_AUTHORITY_KEYPAIR` in Railway to base58 format
3. Register new slash commands
4. Deploy bot to Railway
5. Test complete flow

**You're 90% there! Just need to refresh the bot token and update the mint keypair format.** 🚀
