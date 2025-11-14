# Vercel Deployment Guide

This guide explains how to deploy the JustTheTip API server to Vercel.

## Overview

The repository is configured for Vercel deployment using serverless functions. The `vercel.json` configuration file handles:
- API routes served by `api/server.js`
- Static file serving from the `docs/` directory
- Automatic serverless initialization

## Prerequisites

1. A Vercel account (free tier works)
2. Vercel CLI installed (optional, for local testing)
   ```bash
   npm install -g vercel
   ```

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository (`jmenichole/Justthetip`)
4. Vercel will automatically detect the `vercel.json` configuration
5. Configure environment variables (see below)
6. Click "Deploy"

### Option 2: Deploy via CLI

```bash
# From the repository root
vercel

# For production deployment
vercel --prod
```

## Environment Variables

Configure these environment variables in the Vercel dashboard (Project Settings → Environment Variables):

### Required for Bot Operation
- `FRONTEND_URL` - **CRITICAL**: Frontend URL where wallet registration page is hosted (default: `https://jmenichole.github.io/Justthetip`). This is used by the Discord bot's `/register-wallet` command to generate wallet registration links. The sign.html page is hosted on GitHub Pages and makes API calls to the Vercel backend.

### Required for API Server
- `DISCORD_CLIENT_SECRET` - Discord OAuth client secret
- `DISCORD_CLIENT_ID` - Discord application client ID
- `DISCORD_REDIRECT_URI` - OAuth redirect URI

### Optional
- `MONGODB_URI` - MongoDB connection string (falls back to SQLite if not set)
- `SOLANA_RPC_URL` - Solana RPC endpoint URL
- `SOLANA_CLUSTER` - Solana cluster (mainnet-beta, devnet, testnet)
- `MINT_AUTHORITY_KEYPAIR` - Base58 encoded keypair for NFT minting
- `NFT_STORAGE_API_KEY` - NFT.Storage API key for metadata storage
- `X402_TREASURY_WALLET` - Treasury wallet address for X402 payments

See `.env.example` for a complete list of environment variables.

## Configuration Details

### vercel.json

The `vercel.json` file configures:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "docs/$1"
    }
  ]
}
```

- **builds**: Defines `api/server.js` as a Node.js serverless function
- **routes**: 
  - `/api/*` routes to the Express server
  - All other routes serve static files from `docs/`

### Serverless Initialization

The `api/server.js` file includes special initialization logic for serverless environments:

- Database and Solana connections are initialized when the module is loaded
- No HTTP server is started (Vercel handles this)
- Same code works both for traditional hosting and serverless

## API Endpoints

After deployment, your API will be available at:

- API: `https://your-project.vercel.app/api/*`
- Static files: `https://your-project.vercel.app/*` (served from `docs/`)

Example endpoints:
- `https://your-project.vercel.app/api/health` - Health check
- `https://your-project.vercel.app/api/tips` - Tips listing
- `https://your-project.vercel.app/landing.html` - Landing page
- `https://your-project.vercel.app/sign.html` - Wallet registration page (used by `/registerwallet` command)

## Testing Locally

You can test the Vercel deployment locally:

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Run local development server
vercel dev

# Access the local server
# API: http://localhost:3000/api/*
# Static files: http://localhost:3000/*
```

## Troubleshooting

### "No entrypoint found" Error

This error occurs when Vercel cannot find a valid entrypoint. The `vercel.json` configuration file resolves this by explicitly pointing to `api/server.js`.

### Database Connection Issues

- Vercel serverless functions have limited execution time (10 seconds for hobby tier)
- Use MongoDB Atlas or another hosted database service
- SQLite fallback is available but uses in-memory storage (data is not persistent)

### Environment Variables Not Working

- Ensure environment variables are set in the Vercel dashboard
- Redeploy after adding/changing environment variables
- Check the deployment logs for initialization errors

### Cold Start Performance

- First request after inactivity may be slower (cold start)
- Consider using Vercel Pro for better performance
- Database connection pooling can help reduce cold start impact

### Wallet Registration Links Show 404

If users clicking the wallet registration link from Discord's `/registerwallet` command see a 404 error:

1. **Check API_BASE_URL**: Ensure the `API_BASE_URL` environment variable is set to your Vercel deployment URL (e.g., `https://your-project.vercel.app`)
2. **Verify sign.html exists**: The file `docs/sign.html` must exist in your repository
3. **Redeploy**: After adding the environment variable, redeploy the bot (not just the API server)
4. **Check Discord bot logs**: Verify the bot is using the correct URL when generating registration links

## Differences from Railway/Heroku Deployment

| Feature | Vercel | Railway/Heroku |
|---------|--------|----------------|
| Architecture | Serverless functions | Traditional server |
| Scaling | Automatic, per-request | Manual or auto-scaling |
| Pricing | Free tier generous | Usage-based |
| Static files | Built-in CDN | Requires separate hosting |
| Long-running processes | Not supported | Supported |
| WebSocket | Limited support | Full support |

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Node.js Runtime](https://vercel.com/docs/runtimes#official-runtimes/node-js)
- [Environment Variables on Vercel](https://vercel.com/docs/concepts/projects/environment-variables)

## Support

For issues specific to Vercel deployment, check:
1. Vercel deployment logs in the dashboard
2. Browser console for client-side errors
3. API endpoint `/api/health` for server status
