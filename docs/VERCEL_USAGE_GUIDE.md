# Vercel Deployment Usage Guide

## Overview

This document explains what Vercel is being used for in the JustTheTip project and clarifies deployment strategy.

## What is Vercel Being Used For?

Vercel hosts the **API server** and **static documentation** for JustTheTip:

### 1. API Server (`api/server.js`)
The Express.js API server is deployed as a serverless function on Vercel, providing:

- **Discord OAuth endpoints** (`/api/discord/*`)
- **Wallet registration endpoints** (`/api/registerwallet/*`, `/api/verify-signature`)
- **NFT minting endpoints** (`/api/mintBadge`)
- **Tips and transaction endpoints** (`/api/tips/*`)
- **Health and status endpoints** (`/api/health`)
- **Admin dashboard API** (`/api/admin/*`)
- **Magic Link embedded wallet routes** (`/api/magic/*`)
- **Stripe Crypto Onramp routes** (`/api/stripe/onramp/*`) ✅
- **Coinbase Commerce payment endpoints** (`/api/payments/coinbase/*`)
- **x402 payment protocol endpoints** (`/api/x402/*`)
- **Solana dev tools endpoints** (`/api/solana/devtools/*`)

### 2. Static Documentation (`docs/`)
All files in the `docs/` directory are served as static content via Vercel's CDN:

- Landing pages
- Registration pages (e.g., `sign.html`, `register-magic.html`)
- Documentation and guides
- Static assets

## Stripe Crypto Onramp on Vercel

**Yes, Vercel should be used for the Stripe crypto onramp functionality.**

The Stripe crypto onramp integration is fully deployed on Vercel through the API server routes:
- `POST /api/stripe/onramp/session` - Create purchase session
- `GET /api/stripe/onramp/session/:sessionId` - Check session status
- `POST /api/stripe/onramp/webhook` - Handle Stripe webhooks
- `GET /api/stripe/onramp/config` - Get public configuration

**Why Vercel is the right choice:**
1. ✅ **Already configured** - The API server is already on Vercel
2. ✅ **Serverless scaling** - Automatically handles traffic spikes
3. ✅ **Low latency** - Global CDN for fast responses
4. ✅ **SSL/HTTPS** - Built-in secure connections required by Stripe
5. ✅ **Easy deployment** - Automatic deployments from Git
6. ✅ **Environment variables** - Secure secret management

## Deployment URLs

### Production Deployment
- **Vercel API Server**: `https://justthetip.vercel.app`
- **GitHub Pages (Frontend)**: `https://jmenichole.github.io/Justthetip`

### API Endpoints (via Vercel)
All API endpoints should use the Vercel deployment:
```
https://justthetip.vercel.app/api/stripe/onramp/session
https://justthetip.vercel.app/api/magic/register
https://justthetip.vercel.app/api/health
```

### Static Pages (via GitHub Pages)
User-facing pages are hosted on GitHub Pages:
```
https://jmenichole.github.io/Justthetip/sign.html
https://jmenichole.github.io/Justthetip/register-magic.html
https://jmenichole.github.io/Justthetip/landing.html
```

## Environment Configuration

### For the Discord Bot
The bot needs to know where the API server is deployed:

```bash
# Set this to your Vercel deployment URL
API_BASE_URL=https://justthetip.vercel.app

# Frontend URL remains on GitHub Pages
FRONTEND_URL=https://jmenichole.github.io/Justthetip
```

**Important**: The bot should use `API_BASE_URL` environment variable instead of hardcoded values.

### For the API Server (Vercel)
Set these in the Vercel dashboard under Project Settings → Environment Variables:

```bash
# Discord OAuth
DISCORD_CLIENT_SECRET=your_secret_here
DISCORD_CLIENT_ID=your_client_id_here

# Stripe Crypto Onramp
STRIPE_SECRET_KEY=sk_test_or_live_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Other configurations...
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Migration from mischief-manager

### Old Configuration (Deprecated)
```javascript
// ❌ OLD - Hardcoded mischief-manager URL
const API_URL = 'https://api.mischief-manager.com';
```

### New Configuration (Recommended)
```javascript
// ✅ NEW - Uses environment variable with Vercel as fallback
const API_URL = process.env.API_BASE_URL || 'https://justthetip.vercel.app';
```

### Why Change?
1. **Consistency** - Single deployment platform (Vercel) for all API functionality
2. **Maintainability** - One place to update and monitor
3. **Scalability** - Vercel's serverless architecture scales automatically
4. **Modern** - Uses industry-standard serverless deployment
5. **Cost-effective** - Vercel's free tier is generous for API hosting

## What Could Vercel Be Used For?

Vercel is ideal for:

### ✅ Currently Using
- API server (Express.js as serverless function)
- Static file hosting (documentation, HTML pages)
- Webhook endpoints (Stripe, Coinbase)
- Authentication flows (OAuth, Magic Link)

### ✅ Good Candidates for Vercel
- **Additional API endpoints** - Easy to add new routes
- **Serverless functions** - Convert heavy operations to separate functions
- **Preview deployments** - Test changes before production
- **A/B testing** - Use Vercel's edge config for experiments

### ❌ Not Suitable for Vercel
- **Discord bot process** - Needs persistent WebSocket connection
  - **Solution**: Deploy bot to Railway, Heroku, or dedicated server
- **Long-running background jobs** - Serverless has 10-second timeout (hobby tier)
  - **Solution**: Use cron jobs or separate worker service
- **Large file uploads** - Limited payload size
  - **Solution**: Use cloud storage (S3, Cloudflare R2)

## Best Practices

### 1. Use Environment Variables
Never hardcode URLs or API keys:
```javascript
// ✅ Good
const API_URL = process.env.API_BASE_URL;

// ❌ Bad
const API_URL = 'https://api.mischief-manager.com';
```

### 2. Set Appropriate Fallbacks
Provide sensible defaults:
```javascript
// ✅ Good - Falls back to Vercel deployment
const API_URL = process.env.API_BASE_URL || 'https://justthetip.vercel.app';

// ❌ Bad - Falls back to potentially non-existent service
const API_URL = process.env.API_BASE_URL || 'https://api.mischief-manager.com';
```

### 3. Document Your Deployment
Keep deployment URLs and environment variables documented:
- In `.env.example` file
- In `README.md`
- In deployment guides

### 4. Monitor Your Deployment
Use Vercel's built-in monitoring:
- Check function logs in Vercel dashboard
- Set up alerts for errors
- Monitor response times

## Testing

### Local Development
```bash
# Install Vercel CLI
npm install -g vercel

# Run local development server
vercel dev

# Test endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/stripe/onramp/config
```

### Production Testing
```bash
# Test API endpoints
curl https://justthetip.vercel.app/api/health
curl https://justthetip.vercel.app/api/stripe/onramp/config
```

## Troubleshooting

### Issue: Bot can't reach API
**Solution**: Ensure `API_BASE_URL` is set to `https://justthetip.vercel.app`

### Issue: 404 errors from Vercel
**Solution**: Check `vercel.json` routes configuration and ensure files exist

### Issue: Crypto onramp not working
**Solution**: 
1. Verify `STRIPE_SECRET_KEY` is set in Vercel environment variables
2. Check Stripe dashboard for API key validity
3. Ensure Crypto Onramp is enabled in Stripe account

### Issue: CORS errors
**Solution**: Update CORS configuration in `api/server.js` to include your frontend URL

## Summary

**Should you use Vercel for crypto onramp?** 

**✅ YES** - Vercel is the recommended deployment platform for the crypto onramp functionality and all other API endpoints. It provides secure, scalable, and cost-effective hosting for the API server.

**Should you migrate from mischief-manager to Vercel?**

**✅ YES** - Update all references to use Vercel deployment URLs instead of mischief-manager. This provides a single, consistent deployment platform.

## Additional Resources

- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT_GUIDE.md)
- [Stripe Onramp Integration](../STRIPE_ONRAMP_INTEGRATION.md)
- [Environment Variables Reference](../.env.example)
- [Vercel Documentation](https://vercel.com/docs)
