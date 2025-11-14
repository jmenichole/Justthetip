# ⚡ 5-Minute Railway Deployment

```
┌─────────────────────────────────────────┐
│  🚂 Deploy to Railway in 5 Minutes     │
└─────────────────────────────────────────┘
```

## Step 1: Prepare (2 min)

```bash
cd /Users/fullsail/justthetip
./setup-railway.sh
```

This generates your mint keypair and creates `mint-keypair.txt`.

---

## Step 2: Deploy (2 min)

1. Go to **https://railway.app**
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Select **`jmenichole/Justthetip`**

---

## Step 3: Configure (1 min)

In Railway **Variables** tab, add:

```bash
DISCORD_CLIENT_ID=1419742988128616479
DISCORD_CLIENT_SECRET=<get_from_discord>
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
MINT_AUTHORITY_KEYPAIR=<paste_from_mint-keypair.txt>
MONGODB_URI=mongodb+srv://justhetip.0z3jtr.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509
PORT=3000
NODE_ENV=production
```

**Get Discord Secret:**
https://discord.com/developers/applications/1419742988128616479/oauth2

---

## Step 4: Get URL

Settings → Networking → **Generate Domain**

Copy: `https://your-app.up.railway.app`

---

## Step 5: Update Frontend

Edit `docs/landing-app.js`:

```javascript
const CONFIG = {
  // ... other config
  API_BASE_URL: 'https://your-app.up.railway.app', // ← Update
};
```

Commit and push:

```bash
git add docs/landing-app.js
git commit -m "feat: Add Railway backend URL"
git push
```

---

## ✅ Done!

Test: `curl https://your-app.up.railway.app/api/health`

---

## 📚 Full Guides

- **Complete Guide:** `DEPLOY_BACKEND.md`
- **Summary:** `DEPLOYMENT_SUMMARY.md`
- **Troubleshooting:** `.env.validation-report.md`

---

## 🆘 Need Help?

**"No mint keypair"** → Run `./setup-railway.sh`  
**"Module not found"** → Check `package.json` in root  
**"CORS error"** → Add frontend URL to `api/server.js` CORS config  
**"Can't connect DB"** → Verify `MONGODB_URI` exactly matches Atlas

---

**Platform:** Railway (free tier: 500 hrs/month)  
**Alternative:** Render (750 hrs/month, spins down)  
**Cost:** Free for testing + small production
