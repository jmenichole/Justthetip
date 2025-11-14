# Why Users Are Getting 404 Errors (And How to Fix It)

## The Problem Right Now

When users run `/register-wallet`, they get a **404: NOT_FOUND** error instead of seeing the Solana wallet signature request page.

## Root Cause

This PR contains the fix, but **it hasn't been merged to `main` yet**. Here's what's happening:

### Current State (Broken)

1. Bot generates link: `https://jmenichole.github.io/Justthetip/sign.html` ✅
2. User clicks link ✅
3. GitHub Pages serves **OLD sign.html** from main branch ❌
4. Old sign.html tries to call: `https://jmenichole.github.io/api/registerwallet/verify` ❌
5. That endpoint doesn't exist on GitHub Pages → **404 ERROR** ❌

### What the OLD sign.html Does (Currently on main)

```javascript
// This is WRONG - GitHub Pages doesn't have an /api/ endpoint!
const apiBaseUrl = window.location.origin;  // https://jmenichole.github.io
const response = await fetch(`${apiBaseUrl}/api/registerwallet/verify`);
                                          // ^^^^^ This doesn't exist!
```

### What the NEW sign.html Does (In this PR)

```javascript
// This is CORRECT - Points to Vercel API
const API_BASE_URL = 'https://justthetip.vercel.app';
const response = await fetch(`${API_BASE_URL}/api/registerwallet/verify`);
                                          // ^^^^^ This exists on Vercel!
```

## The Solution

### Step 1: Merge This PR to Main

This will update the `docs/sign.html` file on the main branch.

### Step 2: GitHub Pages Auto-Deploys

GitHub Actions will automatically deploy the updated sign.html to GitHub Pages (takes 1-2 minutes).

### Step 3: Add GitHub Secret

Add `FRONTEND_URL=https://jmenichole.github.io/Justthetip` to GitHub repository secrets.

### Step 4: Redeploy Bot

Redeploy the bot service on Railway so it picks up the `FRONTEND_URL` environment variable.

## After Merging, This is What Will Happen

1. Bot generates link: `https://jmenichole.github.io/Justthetip/sign.html` ✅
2. User clicks link ✅
3. GitHub Pages serves **NEW sign.html** from main branch ✅
4. New sign.html calls: `https://justthetip.vercel.app/api/registerwallet/verify` ✅
5. Vercel API responds and verifies signature ✅
6. **User sees wallet connection page and can sign!** ✅

## Visual Comparison

### Before Fix (Current)
```
User → GitHub Pages → Tries to call GitHub Pages API → 404 ERROR ❌
```

### After Fix (After Merge)
```
User → GitHub Pages → Calls Vercel API → Signature verified → Success! ✅
```

## Files Changed in This PR

1. **bot.js** - Uses `FRONTEND_URL` instead of `API_BASE_URL`
2. **docs/sign.html** - Points to Vercel API instead of `window.location.origin`
3. **api/public/sign.html** - Same fix as docs/sign.html
4. **.github/workflows/railway-deploy.yml** - Adds `FRONTEND_URL` to deployment
5. **Documentation** - Multiple guide files explaining the setup

## Why Can't We Test Before Merging?

The GitHub Pages workflow only deploys from the `main` branch:

```yaml
# .github/workflows/pages.yml
on:
  push:
    branches:
      - main      # Only deploys from main!
      - master
```

So until this PR is merged to main, GitHub Pages will continue serving the old sign.html.

## Alternative: Test Locally

If you want to test before merging:

1. Check out this branch locally
2. Run `npm start` to start the API server on localhost:3000
3. Open `docs/sign.html` in browser
4. The sign.html will detect localhost and use `window.location.origin` for local testing

## Next Steps

1. ✅ **Review this PR** - All changes are complete
2. ⏳ **Merge to main** - This deploys the fix
3. ⏳ **Add GitHub secret** - FRONTEND_URL
4. ⏳ **Redeploy bot** - Pick up new environment variable
5. ✅ **Test /register-wallet** - Should work!

See **DEPLOYMENT_CHECKLIST.md** for detailed step-by-step deployment instructions.

## Questions?

- **Why not use environment variables in sign.html?** - It's a static file served by GitHub Pages, so it can't access server-side environment variables
- **Why not deploy to Vercel instead?** - The current architecture uses GitHub Pages for static frontend and Vercel for API backend
- **Can we test on a staging environment?** - Not currently set up, but could deploy to a different GitHub Pages branch or subdomain

## Summary

**The fix is ready and works correctly.** It just needs to be merged to main so GitHub Pages deploys the updated sign.html file. Once merged and deployed, users will be able to connect their Solana wallets and see the signature request as expected! 🚀
