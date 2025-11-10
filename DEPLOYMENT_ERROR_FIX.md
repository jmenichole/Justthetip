# Deployment Error Fix - Railway Bot Startup

## Critical Error Found and Fixed

### Issue
Railway deployments were failing because the startup script referenced a non-existent file.

**File**: `scripts/start-bot-railway.js`  
**Line**: 134  
**Error**: Attempting to start `bot.js` which doesn't exist in the repository

### Root Cause
The repository uses `bot_smart_contract.js` as the main bot entry point, but the Railway startup script was hardcoded to start `bot.js` (likely from an older version or legacy setup).

### The Fix
```diff
- const botPath = path.join(__dirname, '..', 'bot.js');
+ const botPath = path.join(__dirname, '..', 'bot_smart_contract.js');
```

### Impact
- **Before Fix**: Railway would spawn a Node.js process trying to load a non-existent file, causing immediate failure
- **After Fix**: Railway correctly starts the smart contract bot using the actual file

## Verification Steps Performed

### 1. File Existence Check
```bash
$ ls -la bot*.js
-rw-rw-r-- 1 runner runner 19636 bot_smart_contract.js
```
✅ Only `bot_smart_contract.js` exists

### 2. Package.json Configuration
```json
{
  "main": "bot_smart_contract.js",
  "scripts": {
    "start:bot-railway": "node scripts/start-bot-railway.js",
    "start:smart-contract": "npm run verify-env -- --smart-contract && node bot_smart_contract.js"
  }
}
```
✅ All references point to `bot_smart_contract.js`

### 3. Dockerfile Configuration
```dockerfile
CMD ["npm", "run", "start:smart-contract"]
```
✅ Docker correctly uses the npm script that runs `bot_smart_contract.js`

### 4. Railway Configuration
```json
{
  "deploy": {
    "startCommand": "npm run start:bot-railway"
  }
}
```
✅ Railway uses the startup script we just fixed

### 5. Syntax Validation
```bash
$ node -c scripts/start-bot-railway.js
# No output = syntax OK
```
✅ No syntax errors

## Related Files Checked

All these files correctly reference `bot_smart_contract.js`:
- ✅ `package.json` - main entry point
- ✅ `Dockerfile` - CMD uses correct npm script
- ✅ `railway-bot.json` - references startup script
- ✅ `scripts/verify-env.js` - works with both modes
- ✅ All npm scripts in package.json

## Why This Error Occurred

The startup script was likely copied from an older version of the bot when it was called `bot.js`. When the codebase transitioned to the smart contract implementation (`bot_smart_contract.js`), this hardcoded path wasn't updated.

## Deployment Checklist

To prevent similar issues in the future:

- [ ] **Always verify file paths** in startup scripts match actual files
- [ ] **Use package.json scripts** instead of hardcoding paths when possible
- [ ] **Test locally** before deploying to Railway
- [ ] **Check Railway logs** immediately after deployment
- [ ] **Keep documentation updated** when renaming key files

## Testing the Fix

### Local Test
```bash
# This will verify the bot can start (Ctrl+C to stop after login)
node scripts/start-bot-railway.js
```

### Railway Test
After merging this fix:
1. Railway will automatically redeploy
2. Check logs for: `Starting bot from: /path/to/bot_smart_contract.js`
3. Verify bot comes online in Discord
4. Check for any runtime errors

## Additional Notes

### Other Bot Entry Points
The codebase has multiple entry points:
- `bot_smart_contract.js` - Main non-custodial bot (used by Railway)
- `api/server.js` - API server (used by Vercel)
- `deprecated/bot.js.legacy` - Old custodial version (not used)

### Environment Variables
The bot requires these variables to run:
- `DISCORD_BOT_TOKEN` - From Discord Developer Portal
- `DISCORD_CLIENT_ID` - Application ID
- `MONGODB_URI` - Database connection string
- `SOLANA_RPC_URL` - Solana RPC endpoint

Railway should have these configured in the project settings.

## Commit Reference
**Commit**: ea437cb  
**Date**: 2025-11-10  
**Changes**: 1 file, 1 line changed  

## Status
✅ **FIXED** - Ready for deployment to Railway
