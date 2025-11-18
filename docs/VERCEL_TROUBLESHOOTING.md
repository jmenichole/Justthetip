# Vercel NOT_FOUND Error Troubleshooting Guide

## Overview

This guide helps you troubleshoot different types of NOT_FOUND (404) errors on Vercel deployments. There are different root causes depending on what type of resource is returning 404.

---

## Quick Diagnosis

### Step 1: Identify What's Returning 404

**Static Files (e.g., `/landing.html`, `/index.html`, `/`)**
- Location: `docs/` directory
- Served from: Vercel CDN
- Fix documented in: `VERCEL_NOT_FOUND_FIX_GUIDE.md`

**API Routes (e.g., `/api/magic/register-magic.html`, `/api/health`)**
- Location: `api/` directory (served by Express)
- Served from: Vercel Serverless Function
- Fix documented in: `VERCEL_404_FIX.md` (existing) and this guide

---

## NOT_FOUND Error for API Routes

### Symptom
```
404: NOT_FOUND
URL: https://justthetip.vercel.app/api/magic/register-magic.html?token=...
```

### Common Causes

#### 1. Missing File Includes in vercel.json

**Problem**: Files loaded with `fs.readFileSync()` aren't automatically detected by Vercel.

**Solution**: Ensure `vercel.json` includes the necessary directories:

```json
{
  "builds": [
    {
      "src": "api/server.js",
      "use": "@vercel/node",
      "config": {
        "includeFiles": [
          "api/public/**",     // ← Required for register-magic.html
          "api/routes/**",     // ← Required for route modules
          "api/middleware/**"  // ← Required for middleware
        ]
      }
    }
  ]
}
```

**Verify**: Check Vercel build logs to confirm files are included:
```
✓ [api/server.js] @vercel/node
  - Including: api/public/**
  - Including: api/routes/**
  - Including: api/middleware/**
```

#### 2. Route Not Mounted Correctly

**Problem**: Express route not mounted in `api/server.js`.

**Check**: In `api/server.js`, verify:
```javascript
const magicRoutes = require('./routes/magicRoutes');
app.use('/api/magic', magicRoutes);
```

**Test Locally**:
```bash
node api/server.js
curl http://localhost:3000/api/magic/register-magic.html
```

#### 3. Route Pattern Not Matching in vercel.json

**Problem**: Vercel route configuration doesn't match the API path.

**Solution**: Ensure route pattern covers all API paths:
```json
{
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/server.js"
    }
  ]
}
```

**Test**: The pattern `/api/(.*)` should match:
- `/api/health` ✅
- `/api/magic/register-magic.html` ✅
- `/api/magic/wallet/123` ✅

#### 4. File Path Resolution Issue

**Problem**: `path.join(__dirname, ...)` resolves incorrectly in serverless environment.

**Check**: In `api/routes/magicRoutes.js`:
```javascript
router.get('/register-magic.html', (req, res) => {
  const htmlPath = path.join(__dirname, '../public/register-magic.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  // ...
});
```

**Verify Path**:
```javascript
console.log('__dirname:', __dirname);
console.log('htmlPath:', htmlPath);
console.log('File exists:', fs.existsSync(htmlPath));
```

#### 5. Missing Environment Variables

**Problem**: Function fails due to missing env vars, returns 500 or unexpected 404.

**Check Vercel Dashboard**:
- Go to Project Settings → Environment Variables
- Verify all required variables are set:
  - `MAGIC_PUBLISHABLE_KEY`
  - `MAGIC_SECRET_KEY`
  - `REGISTRATION_TOKEN_SECRET`
  - `MAGIC_SOLANA_NETWORK`
  - `MAGIC_SOLANA_RPC_URL`

**Test Health Endpoint**:
```bash
curl https://yourapp.vercel.app/api/magic/health
```

Expected response:
```json
{
  "status": "ok",
  "magic_configured": true,
  "fully_configured": true,
  "configuration": {
    "publishable_key": true,
    "secret_key": true,
    "registration_token_secret": true,
    "solana_network": true,
    "solana_rpc_url": true
  }
}
```

---

## NOT_FOUND Error for Static Files

### Symptom
```
404: NOT_FOUND
URL: https://justthetip.vercel.app/
URL: https://justthetip.vercel.app/landing.html
```

### Solution

See comprehensive guide: `VERCEL_NOT_FOUND_FIX_GUIDE.md`

**Quick Fix**: Add static build configuration to `vercel.json`:
```json
{
  "builds": [
    {
      "src": "docs/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/docs/$1"
    }
  ]
}
```

---

## Debugging Steps

### 1. Check Vercel Build Logs

**In Vercel Dashboard:**
1. Go to your deployment
2. Click on "Building" or "Build Logs"
3. Verify both builds succeeded:
   ```
   ✓ [api/server.js] @vercel/node
   ✓ [docs/**] @vercel/static
   ```

**Look for**:
- ✅ "Including: api/public/**"
- ✅ No errors during build
- ❌ Any warnings about missing files

### 2. Check Vercel Function Logs

**In Vercel Dashboard:**
1. Go to your deployment
2. Click on "Functions"
3. Click on "View Logs"

**Look for**:
- Error messages
- Path resolution issues
- Missing file errors
- Environment variable errors

### 3. Test with cURL

**API Route Test**:
```bash
# Should return HTML
curl -v https://yourapp.vercel.app/api/magic/register-magic.html

# Should return JSON
curl -v https://yourapp.vercel.app/api/magic/health
```

**Static File Test**:
```bash
# Should return HTML
curl -v https://yourapp.vercel.app/

# Should return HTML
curl -v https://yourapp.vercel.app/landing.html
```

**Check Response**:
- Status code: Should be `200 OK`
- Headers: Check `x-vercel-cache` (for static files)
- Body: Should contain actual content

### 4. Test in Incognito/Private Mode

**Why**: Browser cache can show old 404 pages.

**How**:
1. Open incognito/private window
2. Navigate to the URL
3. Check if it works

### 5. Check Deployment Status

**In Vercel Dashboard:**
1. Verify deployment is "Ready" (not "Building" or "Failed")
2. Check deployment age (recent = latest code)
3. Look at commit SHA (matches your latest commit?)

---

## Common Misconceptions

### ❌ "If it works locally, it works on Vercel"
**Reality**: Local Node.js ≠ Vercel Serverless
- Local: Files accessed from disk at runtime
- Vercel: Files must be included at build time

### ❌ "Routes are enough"
**Reality**: Need both `builds` AND `routes`
- `builds`: HOW to process files
- `routes`: WHERE to route requests

### ❌ "Vercel auto-detects everything"
**Reality**: Explicit configuration required
- Static files need `@vercel/static` builder
- Dynamic files need `includeFiles` in config

---

## Specific Issue: Magic Wallet Link 404

### The Issue
When users click the "Create Wallet" button in Discord, they get a 404 error at `/api/magic/register-magic.html`.

### Root Cause
The HTML file `api/public/register-magic.html` is loaded dynamically with `fs.readFileSync()` in the route handler. Vercel doesn't automatically include files loaded this way.

### Solution
Already implemented in current `vercel.json`:

```json
{
  "builds": [
    {
      "src": "api/server.js",
      "use": "@vercel/node",
      "config": {
        "includeFiles": [
          "api/public/**"  // ← This includes register-magic.html
        ]
      }
    }
  ]
}
```

### Verification Steps

1. **Check Build Logs**:
   ```
   ✓ Building...
   ✓ [api/server.js] @vercel/node
   ✓ Including: api/public/**
   ```

2. **Test Health Endpoint**:
   ```bash
   curl https://justthetip.vercel.app/api/magic/health
   ```
   Should return `200 OK` with JSON

3. **Test Registration Page**:
   ```bash
   curl https://justthetip.vercel.app/api/magic/register-magic.html
   ```
   Should return `200 OK` with HTML

4. **Check Function Logs**:
   - No "ENOENT" errors (file not found)
   - No path resolution errors

### If Still Broken After Config Fix

1. **Verify deployment has latest code**:
   ```bash
   git log -1 --oneline
   # Compare with deployment commit SHA in Vercel
   ```

2. **Trigger redeploy**:
   - Push a new commit, or
   - Redeploy in Vercel dashboard

3. **Check environment variables**:
   - All Magic-related env vars set in Vercel
   - No typos in variable names

4. **Test URL generation**:
   In `src/commands/handlers/magicHandler.js`:
   ```javascript
   const API_URL = process.env.API_BASE_URL || process.env.FRONTEND_URL || 'https://justthetip.vercel.app';
   const registrationUrl = `${API_URL}/api/magic/register-magic.html?token=${registrationToken}`;
   ```
   
   Verify:
   - `API_BASE_URL` env var is set to correct Vercel URL
   - Generated URL is correct (log it in console)

---

## Quick Reference

### Checklist for API Route 404s

- [ ] File exists at `api/public/register-magic.html`
- [ ] `includeFiles` has `api/public/**` in vercel.json
- [ ] Route pattern `/api/(.*)` exists in vercel.json
- [ ] Express route mounted correctly in api/server.js
- [ ] Build logs show files included
- [ ] Deployment is complete (status: Ready)
- [ ] Environment variables set in Vercel
- [ ] Tested in incognito mode (no cache)
- [ ] Function logs show no errors

### Checklist for Static File 404s

- [ ] File exists in `docs/` directory
- [ ] Static build config exists in vercel.json
- [ ] `"handle": "filesystem"` in routes
- [ ] Catch-all route points to `/docs/$1`
- [ ] Build logs show static build succeeded
- [ ] Deployment is complete (status: Ready)
- [ ] Tested in incognito mode (no cache)

---

## Getting Help

If you've tried everything and still seeing 404s:

1. **Gather information**:
   - Exact URL returning 404
   - Screenshot of error
   - Build logs (copy full text)
   - Function logs (if available)
   - Environment: Browser, device, network

2. **Check documentation**:
   - `VERCEL_NOT_FOUND_FIX_GUIDE.md` - Static files
   - `VERCEL_404_FIX.md` - API routes (Magic)
   - `VERCEL_FIX_VISUAL_GUIDE.md` - Visual diagrams
   - This guide - Troubleshooting

3. **Test systematically**:
   - Local first (node api/server.js)
   - Then vercel dev (local Vercel simulation)
   - Then preview deployment
   - Finally production

4. **Common quick fixes**:
   - Redeploy (sometimes fixes deployment issues)
   - Clear browser cache (incognito mode)
   - Wait 1-2 minutes (CDN propagation)
   - Check correct domain (not old deployment URL)

---

## Related Documentation

- **`VERCEL_NOT_FOUND_FIX_GUIDE.md`** - Comprehensive guide for static file 404s
- **`VERCEL_FIX_VISUAL_GUIDE.md`** - Visual diagrams of request flow
- **`VERCEL_FIX_SUMMARY.md`** - Quick overview of all fixes
- **`VERCEL_404_FIX.md`** - Original Magic API route fix documentation
- **`VERCEL_USAGE_GUIDE.md`** - General Vercel deployment guide

---

*Last Updated: 2025-11-18*
*Status: Active*
