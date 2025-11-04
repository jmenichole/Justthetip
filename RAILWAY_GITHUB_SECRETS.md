# Railway Deployment with GitHub Actions Secrets

This guide explains how to deploy JustTheTip to Railway using GitHub Actions and repository secrets.

## Overview

The repository is configured to automatically deploy to Railway using GitHub Actions workflows. Environment variables are securely stored as GitHub repository secrets and automatically synced to Railway during deployment.

## Setup Instructions

### Step 1: Configure GitHub Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add the following secrets:

#### Railway Configuration Secrets

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `RAILWAY_TOKEN` | Railway API authentication token | Railway Dashboard → Account Settings → Tokens → Create Token |
| `RAILWAY_PROJECT_ID` | Your Railway project identifier | Railway Dashboard → Project Settings → Project ID |
| `RAILWAY_BOT_SERVICE_ID` | Discord bot service identifier | Railway Dashboard → Bot Service → Settings → Service ID |
| `RAILWAY_API_SERVICE_ID` | API server service identifier | Railway Dashboard → API Service → Settings → Service ID |

#### Discord Bot Secrets

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `BOT_TOKEN` | Discord bot token | `MTQxOTc0Mjk4ODEyODYxNjQ3OQ...` |
| `CLIENT_ID` | Discord application client ID | `1419742988128616479` |
| `GUILD_ID` | Discord server/guild ID for testing | `1413961128522023024` |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret | `your_oauth_secret_here` |
| `DISCORD_REDIRECT_URI` | OAuth redirect URL | `https://jmenichole.github.io/Justthetip/landing.html` |

#### Solana Configuration Secrets

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `HELIUS_API_KEY` | Helius RPC API key | `074efb1f-0838-4334-839b-...` |
| `SOLANA_RPC_URL` | Solana RPC endpoint URL | `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY` |
| `SOL_RPC_URL` | Alternate Solana RPC URL | Same as SOLANA_RPC_URL |
| `MINT_AUTHORITY_KEYPAIR` | NFT minting authority keypair (array format) | `[123,45,67,...]` |

#### Database Secrets

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |

#### Admin & Security Secrets

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `SUPER_ADMIN_USER_IDS` | Comma-separated Discord admin IDs | `123456789012345678,987654321098765432` |
| `ADMIN_USER_IDS` | Comma-separated Discord admin IDs | `123456789012345678` |
| `SUPER_ADMIN_SECRET` | Super admin password | `your_secure_password_here` |
| `EMERGENCY_ADMIN_SECRET` | Emergency admin password | `your_emergency_password_here` |

#### Optional Secrets

| Secret Name | Description | Default/Example |
|------------|-------------|-----------------|
| `CORS_ORIGIN` | CORS allowed origin for API | `https://jmenichole.github.io` |

### Step 2: Trigger Deployment

There are two ways to deploy:

#### Option A: Manual Deployment (Recommended for first deploy)

1. Go to Actions tab in your GitHub repository
2. Select "Deploy to Railway" workflow
3. Click "Run workflow"
4. Choose service: `bot` or `api`
5. Click "Run workflow" button

#### Option B: Automatic Deployment

Add commit message flag to trigger deployment:
```bash
# Deploy bot service
git commit -m "Update bot configuration [deploy-bot]"

# Deploy API service
git commit -m "Update API endpoint [deploy-api]"

# Push to main or develop branch
git push origin main
```

### Step 3: Verify Deployment

1. Check GitHub Actions tab for workflow status
2. Go to Railway Dashboard to monitor deployment
3. Check Railway logs for successful startup
4. Test bot commands in Discord (for bot service)
5. Test API endpoints (for API service)

## Railway Configuration Files

This repository includes configuration files that Railway uses for deployment:

### For Discord Bot
- **File:** `railway-bot.json`
- **Purpose:** Defines build and deploy settings for Discord bot
- **Start Command:** `node bot.js`
- **Environment:** Uses secrets from GitHub Actions

### For API Server
- **File:** `railway.json`
- **Purpose:** Defines build and deploy settings for API server
- **Start Command:** `node api/server.js`
- **Environment:** Uses secrets from GitHub Actions

## How It Works

1. **Code Push:** Developer pushes code to `main` or `develop` branch
2. **Workflow Trigger:** GitHub Actions detects commit message flag or manual trigger
3. **Railway CLI:** Workflow installs Railway CLI
4. **Deployment:** Code is deployed to specified Railway service
5. **Environment Sync:** GitHub secrets are automatically set as Railway environment variables
6. **Verification:** Railway builds and starts the service

## Security Best Practices

✅ **DO:**
- Store all sensitive values as GitHub secrets
- Rotate secrets regularly
- Use different secrets for staging/production
- Review Railway logs regularly
- Keep Railway token secure

❌ **DON'T:**
- Commit secrets to repository
- Share Railway token publicly
- Use production secrets in development
- Log sensitive values

## Troubleshooting

### Deployment Fails - "RAILWAY_TOKEN not found"
**Solution:** Add `RAILWAY_TOKEN` to GitHub repository secrets

### Environment Variables Not Syncing
**Solution:** 
1. Verify secret names match exactly (case-sensitive)
2. Check Railway service ID is correct
3. Ensure Railway token has proper permissions

### Bot Won't Start After Deployment
**Solution:**
1. Check Railway logs for errors
2. Verify all required secrets are set
3. Confirm MongoDB connection string is accessible from Railway
4. Check Discord bot token is valid

### API Returns 500 Errors
**Solution:**
1. Check Railway logs for stack traces
2. Verify CORS_ORIGIN matches your frontend domain
3. Ensure MINT_AUTHORITY_KEYPAIR is in correct array format
4. Verify Solana RPC URL is accessible

## Getting Railway Credentials

### Railway Token
1. Log in to https://railway.app
2. Click your profile → Account Settings
3. Go to "Tokens" tab
4. Click "Create Token"
5. Copy token and add to GitHub secrets

### Railway Project ID
1. Open your Railway project
2. Go to Settings tab
3. Copy "Project ID"
4. Add to GitHub secrets as `RAILWAY_PROJECT_ID`

### Railway Service IDs
1. Open your Railway project
2. Click on the service (Bot or API)
3. Go to Settings tab
4. Copy "Service ID"
5. Add to GitHub secrets:
   - Bot service → `RAILWAY_BOT_SERVICE_ID`
   - API service → `RAILWAY_API_SERVICE_ID`

## Manual Railway Setup (Alternative)

If you prefer to set environment variables manually in Railway dashboard:

1. Go to Railway project
2. Select service (Bot or API)
3. Click "Variables" tab
4. Add variables manually using values from GitHub secrets table above
5. Railway will automatically redeploy

## Related Documentation

- [BOT_RAILWAY_SETUP.md](./BOT_RAILWAY_SETUP.md) - Detailed bot deployment guide
- [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md) - API server deployment
- [RAILWAY_CONFIG_GUIDE.md](./RAILWAY_CONFIG_GUIDE.md) - Configuration file reference
- [railway-bot.json](./railway-bot.json) - Bot service configuration
- [railway.json](./railway.json) - API service configuration

## Support

For issues with:
- **Railway deployment:** Check Railway documentation or Railway Discord
- **GitHub Actions:** Review workflow logs and GitHub Actions documentation
- **Bot/API issues:** See main README.md and other project documentation
