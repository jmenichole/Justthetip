# Deployment URL Configuration Guide

## Overview

This guide explains the correct deployment URLs for the JustTheTip bot and how to verify your configuration.

## ⚠️ Important: Deprecated URLs

**DO NOT USE** the following deprecated URLs:
- ❌ `api.mischief-manager.com` - **No longer maintained**
- ❌ `mischief-manager.com` - **Outdated deployment**

These deployments are not configured with the correct environment variables and will cause issues with:
- Magic SDK wallet registration
- Stripe crypto onramp
- Other API features

## ✅ Correct Deployment URLs

### Production Deployment

**API Server (Backend):**
```
https://justthetip.vercel.app
```

**Frontend (GitHub Pages):**
```
https://jmenichole.github.io/Justthetip
```

### Local Development

**API Server:**
```
http://localhost:3000
```

**Frontend:**
```
http://localhost:5500
```

## Environment Variable Configuration

### For Discord Bot (Railway/Heroku)

Set these environment variables in your deployment platform:

```bash
# REQUIRED: Points to the Vercel API deployment
API_BASE_URL=https://justthetip.vercel.app

# REQUIRED: Points to GitHub Pages frontend
FRONTEND_URL=https://jmenichole.github.io/Justthetip

# Other required variables
DISCORD_BOT_TOKEN=your_token_here
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### For API Server (Vercel)

Configure these in the Vercel dashboard (Environment Variables section):

```bash
# Discord OAuth
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret

# Magic Embedded Wallets (REQUIRED for /register-magic)
MAGIC_PUBLISHABLE_KEY=pk_live_or_test_key
MAGIC_SECRET_KEY=sk_live_or_test_key
MAGIC_SOLANA_NETWORK=mainnet-beta
MAGIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
REGISTRATION_TOKEN_SECRET=your_secure_secret

# Stripe Crypto Onramp
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_PUBLISHABLE_KEY=pk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Verifying Your Configuration

### 1. Check API Health Endpoint

Visit the health endpoint to verify the API server is properly configured:

```bash
curl https://justthetip.vercel.app/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T05:57:24.930Z",
  "database": "connected (SQLite)",
  "solana": "connected",
  "nftMinting": "enabled",
  "version": "2025-11-07-x402"
}
```

### 2. Check Magic Configuration

Visit the Magic health endpoint to verify Magic SDK is properly configured:

```bash
curl https://justthetip.vercel.app/api/magic/health
```

**Expected Response (Properly Configured):**
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
  },
  "deployment": {
    "recommended_url": "https://justthetip.vercel.app",
    "frontend_url": "https://jmenichole.github.io/Justthetip",
    "deprecated_urls": [
      "api.mischief-manager.com (no longer maintained)"
    ]
  },
  "timestamp": "2025-11-17T05:57:24.930Z"
}
```

**Response When Misconfigured:**
```json
{
  "status": "ok",
  "magic_configured": false,
  "fully_configured": false,
  "configuration": {
    "publishable_key": false,
    "secret_key": false,
    "registration_token_secret": false,
    "solana_network": false,
    "solana_rpc_url": false
  },
  "deployment": {
    "recommended_url": "https://justthetip.vercel.app",
    "frontend_url": "https://jmenichole.github.io/Justthetip",
    "deprecated_urls": [
      "api.mischief-manager.com (no longer maintained)"
    ]
  },
  "timestamp": "2025-11-17T05:57:24.930Z"
}
```

If `magic_configured` is `false`, you need to add the missing environment variables to your Vercel deployment.

### 3. Test Magic Registration Flow

1. In Discord, run `/register-magic` command
2. Click the registration link provided by the bot
3. The URL should be: `https://justthetip.vercel.app/register-magic.html?token=...`
4. If you see an error about Magic SDK not being initialized, verify your environment variables

## Common Issues and Solutions

### Issue: "Magic SDK not initialized"

**Symptoms:**
- Error message: "undefined is not an object (evaluating 'magic.auth')"
- Console shows: "Magic publishable key not configured"

**Cause:** The deployment you're accessing doesn't have `MAGIC_PUBLISHABLE_KEY` configured.

**Solution:**
1. Verify you're using the correct URL: `https://justthetip.vercel.app`
2. Check that environment variables are set in Vercel dashboard
3. If variables were just added, redeploy the application

### Issue: Bot generates wrong registration URLs

**Symptoms:**
- Bot sends registration links to `api.mischief-manager.com`
- Registration page returns 404 or shows errors

**Cause:** `API_BASE_URL` environment variable is not set or points to the wrong URL.

**Solution:**
1. Update `API_BASE_URL` in your bot deployment (Railway/Heroku):
   ```bash
   API_BASE_URL=https://justthetip.vercel.app
   ```
2. Restart the bot service
3. Check bot logs for: `📡 Using API URL: https://justthetip.vercel.app`
4. If you see a warning about mischief-manager, update your configuration immediately

### Issue: CORS errors when accessing API

**Symptoms:**
- Browser console shows CORS policy errors
- Requests from frontend to API fail

**Cause:** Frontend URL is not in the API server's CORS allowed origins.

**Solution:**
The current configuration already includes the correct URLs. If you're hosting the frontend elsewhere, you need to update the CORS configuration in `api/server.js`:

```javascript
app.use(cors({
    origin: [
        'https://jmenichole.github.io',
        'https://justthetip.vercel.app',
        'http://localhost:3000',
        'http://localhost:5500',
        'YOUR_CUSTOM_FRONTEND_URL'  // Add your URL here
    ],
    credentials: true
}));
```

## Updating Bot Configuration

### Railway Deployment

1. Go to your Railway project dashboard
2. Select your bot service
3. Click on "Variables" tab
4. Update or add `API_BASE_URL`:
   ```
   API_BASE_URL=https://justthetip.vercel.app
   ```
5. Click "Deploy" to restart with new configuration

### Heroku Deployment

```bash
heroku config:set API_BASE_URL=https://justthetip.vercel.app --app your-app-name
```

### Docker Deployment

Update your `docker-compose.yml` or pass environment variable:

```bash
docker run -e API_BASE_URL=https://justthetip.vercel.app your-image
```

## Monitoring and Validation

### Bot Startup Logs

When the bot starts, you should see:

```
🟢 JustTheTip Smart Contract Bot logged in as YourBot#1234
📡 Using API URL: https://justthetip.vercel.app
✅ Smart contract commands registered
```

**Warning Signs:**
If you see this warning, your configuration needs updating:
```
⚠️  WARNING: You are using a deprecated API URL (mischief-manager.com)
⚠️  This deployment is no longer maintained and may not have proper configuration.
⚠️  Please update API_BASE_URL to: https://justthetip.vercel.app
⚠️  Magic wallet registration and other features may not work correctly.
```

### Continuous Monitoring

Set up periodic health checks to ensure your deployment is functioning correctly:

```bash
# Add to your monitoring system (e.g., UptimeRobot, Pingdom)
https://justthetip.vercel.app/api/health
https://justthetip.vercel.app/api/magic/health
```

## Security Considerations

### Environment Variables

**Never commit sensitive values to version control:**
- ❌ Don't include API keys in `.env` files committed to Git
- ✅ Use platform-specific secret management (Railway Secrets, Vercel Environment Variables)
- ✅ Use GitHub Secrets for CI/CD pipelines

### Production Deployment Checklist

Before going live, verify:

- [ ] `API_BASE_URL` points to Vercel deployment
- [ ] All Magic environment variables are set in Vercel
- [ ] All Stripe environment variables are set in Vercel
- [ ] Discord OAuth redirect URIs are registered
- [ ] Health endpoints return `magic_configured: true`
- [ ] Bot logs show correct API URL on startup
- [ ] Test registration flow end-to-end

## Additional Resources

- [Vercel Deployment Guide](./guides/VERCEL_DEPLOYMENT_GUIDE.md)
- [Magic Integration Guide](./guides/MAGIC_QUICKSTART_GUIDE.md)
- [Environment Variables Reference](../.env.example)
- [Vercel vs Mischief-Manager Documentation](../VERCEL_VS_MISCHIEF_MANAGER.md)

## Support

If you continue to experience issues after following this guide:

1. Check the [GitHub Issues](https://github.com/jmenichole/Justthetip/issues)
2. Review bot logs for error messages
3. Verify all environment variables are set correctly
4. Test health endpoints to identify misconfiguration
5. Open a new issue with:
   - Health endpoint responses
   - Bot startup logs (with sensitive data redacted)
   - Steps to reproduce the issue
