# Deployment Checklist for /register-wallet Fix

## Current Status

❌ **PR is NOT merged to main yet**  
❌ **GitHub Pages is serving OLD sign.html**  
❌ **Users getting 404 errors**

## Why It's Not Working Yet

The bot is generating links to `https://jmenichole.github.io/Justthetip/sign.html`, but GitHub Pages is serving the OLD version of sign.html from the `main` branch.

**Old version (on main):**
```javascript
const apiBaseUrl = window.location.origin;  // ❌ Points to GitHub Pages (no API there!)
```

**New version (in this PR):**
```javascript
const API_BASE_URL = 'https://justthetip.vercel.app';  // ✅ Points to Vercel API
```

## Deployment Steps

### Step 1: Merge This PR to Main

This PR branch `copilot/fix-register-command-404` contains the fixes needed.

**What this does:**
- ✅ Updates bot.js to use FRONTEND_URL environment variable
- ✅ Updates sign.html to call Vercel API instead of GitHub Pages
- ✅ Adds FRONTEND_URL to Railway deployment workflow
- ✅ Updates documentation

**Action Required:** Merge this PR to main branch

### Step 2: Add GitHub Secret (If Not Already Done)

Go to: https://github.com/jmenichole/Justthetip/settings/secrets/actions

**Add this secret:**
- Name: `FRONTEND_URL`
- Value: `https://jmenichole.github.io/Justthetip`

### Step 3: Wait for GitHub Pages Deployment

After merging to main, GitHub Actions will automatically deploy to GitHub Pages.

**Check deployment:**
1. Go to: https://github.com/jmenichole/Justthetip/actions
2. Wait for "Deploy to GitHub Pages" workflow to complete (usually 1-2 minutes)
3. Verify at: https://jmenichole.github.io/Justthetip/sign.html

### Step 4: Redeploy Bot on Railway

After GitHub Pages deployment completes:

**Option A - Via GitHub Actions:**
1. Go to Actions tab
2. Click "Deploy to Railway" workflow  
3. Click "Run workflow"
4. Select "bot"
5. Click "Run workflow" button

**Option B - Via commit:**
```bash
git commit --allow-empty -m "Deploy bot with FRONTEND_URL [deploy-bot]"
git push origin main
```

### Step 5: Test the Flow

1. Run `/register-wallet` in Discord
2. Click the generated link
3. Verify it opens to: `https://jmenichole.github.io/Justthetip/sign.html?user=...&username=...&nonce=...`
4. Verify page loads successfully (no 404)
5. Click "Connect Phantom Wallet" or "Connect Solflare Wallet"
6. Wallet should prompt for signature ✅
7. After signing, wallet is registered ✅

## What Each Component Does

### Discord Bot (Railway)
- Generates link to GitHub Pages: `https://jmenichole.github.io/Justthetip/sign.html`
- Uses `FRONTEND_URL` environment variable

### Frontend (GitHub Pages)
- Serves static sign.html page
- JavaScript makes API calls to Vercel
- Shows wallet connection UI

### API Backend (Vercel)
- Endpoint: `https://justthetip.vercel.app/api/registerwallet/verify`
- Verifies Solana wallet signature
- Stores wallet registration

## Architecture Flow

```
User types /register-wallet
         ↓
Discord Bot (Railway)
         ↓ Generates link with FRONTEND_URL
https://jmenichole.github.io/Justthetip/sign.html
         ↓ User clicks link
GitHub Pages serves sign.html
         ↓ User connects wallet & signs
JavaScript calls API_BASE_URL
         ↓
https://justthetip.vercel.app/api/registerwallet/verify
         ↓ Verifies signature
Wallet registered! ✅
```

## Troubleshooting

### Still Getting 404 After Merging?

**Check 1:** Is GitHub Pages deployment complete?
- Go to: https://github.com/jmenichole/Justthetip/deployments
- Should show recent deployment to "github-pages"

**Check 2:** Visit sign.html directly
- URL: https://jmenichole.github.io/Justthetip/sign.html
- Should load (not 404)
- Open browser console, check for `API_BASE_URL` value

**Check 3:** Is FRONTEND_URL set on Railway?
- Railway Dashboard → Bot Service → Variables
- Should see: `FRONTEND_URL=https://jmenichole.github.io/Justthetip`

**Check 4:** Did bot redeploy after adding FRONTEND_URL?
- Railway Dashboard → Bot Service → Deployments
- Should see recent deployment

### Wallet Connection Not Working?

**Check 1:** Browser console errors?
- Press F12 to open dev tools
- Check Console tab for errors

**Check 2:** Is Vercel API responding?
- Try: https://justthetip.vercel.app/api/tips
- Should return JSON (not 404)

**Check 3:** CORS issues?
- Look for CORS errors in browser console
- Vercel api/server.js should allow `https://jmenichole.github.io`

## Quick Verification Commands

```bash
# Check if sign.html has the fix (on main branch)
git show main:docs/sign.html | grep "API_BASE_URL"

# Should output:
# const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
#     : (window.JUSTTHETIP_API_URL || 'https://justthetip.vercel.app');

# Check bot.js has FRONTEND_URL (on main branch)  
git show main:bot.js | grep "FRONTEND_URL"

# Should output:
# const frontendBaseUrl = process.env.FRONTEND_URL || 'https://jmenichole.github.io/Justthetip';
```

## Summary

**Current Issue:** PR not merged → GitHub Pages serving old sign.html → 404 errors

**Solution:** Merge PR → GitHub Pages deploys new sign.html → Users can register wallets ✅

**ETA after merge:** 2-5 minutes for GitHub Pages deployment + bot redeploy
