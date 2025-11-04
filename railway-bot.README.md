# railway-bot.json - Discord Bot Configuration

## Purpose

This file is a **reference configuration** for deploying the Discord Bot as a separate Railway service.

## Usage

### When to use this file:

1. You want to deploy the Discord Bot as a **second Railway service**
2. You're creating a bot-only deployment separate from the API server

### How to use:

**Option A: Rename approach (recommended for single bot deployment)**
```bash
# If deploying ONLY the bot (not the API)
mv railway.json railway-api.json.backup
mv railway-bot.json railway.json
# Then deploy to Railway
```

**Option B: Manual configuration (recommended for multi-service setup)**
1. Create a new Railway service in your project
2. In Railway dashboard → Settings → Deploy
3. Override Start Command: `node bot.js`
4. Keep default build command: `npm install`

## Configuration Details

- **Start Command**: `node bot.js` - Starts the Discord bot
- **Restart Policy**: ON_FAILURE with max 10 retries
- **Builder**: NIXPACKS (Railway's default)
- **Build Command**: `npm install` (installs dependencies)

## Required Environment Variables

### Option 1: Automated Deployment with GitHub Secrets (Recommended)

Use GitHub Actions to automatically deploy and sync environment variables from repository secrets:

1. Configure GitHub repository secrets (see [RAILWAY_GITHUB_SECRETS.md](./RAILWAY_GITHUB_SECRETS.md))
2. Trigger deployment via GitHub Actions
3. Environment variables automatically sync to Railway

**Required GitHub Secrets:**
- `RAILWAY_TOKEN` - Railway API token
- `RAILWAY_PROJECT_ID` - Railway project ID  
- `RAILWAY_BOT_SERVICE_ID` - Railway bot service ID
- `BOT_TOKEN` - Discord bot token
- `CLIENT_ID` - Discord client ID
- `GUILD_ID` - Discord guild ID
- `MONGODB_URI` - MongoDB connection string
- `SOLANA_RPC_URL` - Solana RPC endpoint
- `HELIUS_API_KEY` - Helius API key
- Plus admin and security secrets

**See [RAILWAY_GITHUB_SECRETS.md](./RAILWAY_GITHUB_SECRETS.md) for complete list and setup instructions.**

### Option 2: Manual Configuration in Railway Dashboard

See [BOT_RAILWAY_SETUP.md](./BOT_RAILWAY_SETUP.md) for complete list. Key variables:

```
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=1419742988128616479
GUILD_ID=your_guild_id
MONGODB_URI=your_mongodb_connection_string
SOLANA_RPC_URL=your_solana_rpc_endpoint
NODE_ENV=production
```

## Important Notes

⚠️ **Do NOT rename this to `railway.json` if you want to deploy the API server**
- The repository defaults to API server deployment via `railway.json`
- Only rename if you want bot-only deployment
- For dual deployment, use Railway's start command override instead

✅ **For multi-service setup**:
- Service 1: API (uses `railway.json`)
- Service 2: Bot (override start command to `node bot.js`)

## See Also

- [RAILWAY_GITHUB_SECRETS.md](./RAILWAY_GITHUB_SECRETS.md) - **Automated deployment with GitHub Actions & secrets**
- [RAILWAY_CONFIG_GUIDE.md](./RAILWAY_CONFIG_GUIDE.md) - Complete Railway configuration overview
- [BOT_RAILWAY_SETUP.md](./BOT_RAILWAY_SETUP.md) - Step-by-step bot deployment guide
