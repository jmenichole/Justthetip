# 🚨 Railway Fix - Add Missing Environment Variable

## Problem
Railway bot is crashing with:
```
MissingEnvVarsError: The following variables were defined in .env.example but are not present in the environment:
  SOL_PRIVATE_KEY
```

## Solution
Add `SOL_PRIVATE_KEY` to Railway environment variables.

### Option 1: Via Railway Dashboard (Recommended)
1. Go to https://railway.app/
2. Select your project → **Bot Service**
3. Click **Variables** tab
4. Click **+ New Variable**
5. Add:
   ```
   Name: SOL_PRIVATE_KEY
   Value: []
   ```
6. Click **Add** → Bot will auto-restart

### Option 2: Via Railway CLI
```bash
# Install Railway CLI if needed
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Add variable
railway variables --set SOL_PRIVATE_KEY="[]"
```

## Why This Works
- Your bot uses `dotenv-safe` which validates required env vars
- `.env.example` lists `SOL_PRIVATE_KEY` as required
- Setting it to `[]` means "no private key" (non-custodial mode)
- Bot will use user wallets instead of custodial wallet

## Verification
After adding the variable, check Railway logs. You should see:
```
🟢 Logged in as Just.The.Tip#5849
✅ Connected to MongoDB
```

Instead of the crash loop.

---

**Once fixed**, your bot will be running in **non-custodial mode** - the secure way! 🔒
