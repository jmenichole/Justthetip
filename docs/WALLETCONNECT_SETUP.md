# WalletConnect Setup Guide

## Overview

WalletConnect (now Reown) provides the infrastructure for connecting mobile and desktop wallets to web applications. JustTheTip uses WalletConnect to enable users to register their Solana wallets from any device, including mobile phones.

## Why You Need This

Without a properly configured WalletConnect Project ID, users will:
- See raw WalletConnect URIs like `wc:e92bdd2d92267fd04e5763cd9b50e1d2ef0c369d4a790a7a3173a5349038eed2@2?expiryTimestamp=...`
- Be unable to connect mobile wallets
- Get connection errors when trying to register

## Quick Setup (5 minutes)

### Step 1: Create a Reown Account

1. Go to https://cloud.reown.com/
2. Click "Sign Up" (or "Get Started")
3. Sign up with your email or GitHub account
4. Verify your email if required

### Step 2: Create a New Project

1. Once logged in, click "Create New Project" or "New Project"
2. Enter project details:
   - **Project Name**: `JustTheTip` (or your bot's name)
   - **Description**: `Solana wallet registration for Discord bot`
   - **Homepage URL**: `https://jmenichole.github.io/Justthetip` (or your domain)
3. Click "Create Project"

### Step 3: Copy Your Project ID

1. In your project dashboard, find the **Project ID**
2. It will look like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
3. Click the copy button or select and copy the entire ID

### Step 4: Add to Your Environment

#### For Local Development

Add to your `.env` file:
```env
WALLETCONNECT_PROJECT_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

#### For Railway

1. Go to your Railway project
2. Click the "Variables" tab
3. Click "+ New Variable"
4. Enter:
   - **Name**: `WALLETCONNECT_PROJECT_ID`
   - **Value**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
5. Click "Add"
6. Railway will automatically redeploy with the new variable

#### For Vercel

1. Go to your Vercel project
2. Click "Settings" → "Environment Variables"
3. Add new variable:
   - **Name**: `WALLETCONNECT_PROJECT_ID`
   - **Value**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
4. Click "Save"
5. Redeploy your application

#### For Other Hosting Platforms

Add the environment variable according to your platform's documentation.

### Step 5: Restart Your Server

After adding the environment variable, restart your API server:

```bash
# Local development
npm start

# PM2
pm2 restart justthetip-api

# Docker
docker-compose restart
```

### Step 6: Test the Connection

1. Run `/register-wallet` in Discord
2. Click the registration link
3. You should now see a proper WalletConnect modal or QR code instead of raw text
4. Test connecting with a mobile wallet

## Verification

To verify your WalletConnect setup is working:

1. Visit your registration page
2. Open the browser's developer console (F12)
3. Look for these messages:
   - ✅ `AppKit initialized successfully`
   - ❌ `Failed to load WalletConnect project ID` (means it's not configured)

You can also check the API endpoint directly:
```bash
curl https://your-api-domain.com/api/walletconnect/config
```

Expected response:
```json
{
  "projectId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

If you get `{"projectId":""}`, the environment variable is not set correctly.

## Pricing & Limits

- ✅ **Free tier**: 1,000,000 requests per month
- ✅ No credit card required for free tier
- ✅ More than enough for most Discord bot deployments

For high-traffic bots, check the pricing at https://cloud.reown.com/pricing

## Security Notes

### Is the Project ID a Secret?

**No!** The Project ID is safe to expose to the public:
- It's designed to be used in frontend applications
- It's visible in browser network requests
- It only identifies your project, not your account credentials

### What Should Be Kept Secret?

- Your Reown account password
- Any API keys (if you upgrade to paid plans)
- Your Discord bot token
- Your Solana private keys

## Troubleshooting

### Users Still Seeing Raw WalletConnect URIs

**Possible Causes**:
1. Environment variable not set correctly
2. Server hasn't been restarted after adding the variable
3. Browser cache showing old version

**Solutions**:
1. Verify the variable is set: Check Railway/Vercel dashboard or run `echo $WALLETCONNECT_PROJECT_ID` locally
2. Restart your server completely
3. Clear browser cache or try incognito mode
4. Check server logs for errors

### "Failed to fetch WalletConnect config" Error

**Possible Causes**:
- API server is not running
- API endpoint is blocked by CORS
- Network connectivity issues

**Solutions**:
1. Verify API server is running: `curl https://your-api-domain.com/api/health`
2. Check CORS configuration in `api/server.js`
3. Check browser console for specific error messages

### WalletConnect Modal Not Appearing

**Possible Causes**:
- Project ID is set but invalid
- Browser blocking third-party resources
- Reown CDN is down

**Solutions**:
1. Verify Project ID is correct (copy it again from Reown dashboard)
2. Check browser console for network errors
3. Try a different browser
4. Check Reown status page: https://status.reown.com/

## Additional Resources

- **Reown Documentation**: https://docs.reown.com/
- **WalletConnect Protocol**: https://walletconnect.com/
- **GitHub Issues**: https://github.com/jmenichole/Justthetip/issues

## Getting Help

If you're still having issues:

1. Check the [Mobile Wallet Guide](./MOBILE_WALLET_GUIDE.md)
2. Review the [Complete Setup Guide](./setup/COMPLETE_SETUP_GUIDE.md)
3. Ask in the Discord support channel
4. Open an issue on GitHub with:
   - Error messages from browser console
   - Server logs
   - Environment variable configuration (without exposing the actual Project ID)
