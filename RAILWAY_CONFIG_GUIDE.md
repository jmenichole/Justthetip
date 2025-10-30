# Railway Configuration Guide

## Overview

This repository contains configuration for deploying **two separate services** on Railway:

1. **API Server** (Express backend for NFT verification)
2. **Discord Bot** (Discord.js bot for cryptocurrency tipping)

## Configuration Files

### Primary Configuration (API Server)

- **`railway.json`** - Main Railway configuration for API server
  - Starts: `node api/server.js`
  - Used when deploying the API service
  
- **`nixpacks.toml`** - Nixpacks build configuration
  - Aligns with railway.json
  - Starts: `node api/server.js`

- **`Procfile`** - Heroku/Railway fallback configuration
  - Starts: `node api/server.js`

### Bot Configuration (Discord Bot)

- **`railway-bot.json`** - Reference configuration for Discord bot service
  - Starts: `node bot.js`
  - Use this when creating a **second Railway service** for the bot
  - Rename to `railway.json` when deploying bot as a separate service

### Package.json Scripts

- `npm start` → Starts API server (`node api/server.js`)
- `npm run start:bot` → Starts Discord bot (`node bot.js`)
- `npm run start:smart-contract` → Starts smart contract bot (`node bot_smart_contract.js`)

## Deployment Instructions

### Option 1: Deploy API Server Only

1. Connect repository to Railway
2. Railway will automatically detect `railway.json`
3. Deploy with default settings
4. Add required environment variables (see RAILWAY_DEPLOYMENT_GUIDE.md)

### Option 2: Deploy Both Services

#### Service 1: API Server
1. Create new Railway project from GitHub repo
2. Railway uses `railway.json` by default
3. Deploys API server automatically

#### Service 2: Discord Bot
1. Create a **second Railway service** in the same project
2. In Railway dashboard → Settings → Start Command: `node bot.js`
3. Add bot-specific environment variables (see BOT_RAILWAY_SETUP.md)

## Important Notes

⚠️ **Do not create `railway.toml`** - it will conflict with `railway.json` and cause deployment errors

✅ **File Priority**: Railway uses this order:
1. `railway.json` (highest priority)
2. `nixpacks.toml` (for build config)
3. `Procfile` (fallback)

📝 **Each service needs separate environment variables** - see deployment guides for details

## Troubleshooting

### "Wrong service is starting"
- Check which config file Railway is using
- Verify `railway.json` exists and has correct startCommand
- Remove any conflicting `railway.toml` files

### "Service won't start"
- Check Railway logs for errors
- Verify all required environment variables are set
- Ensure correct start command for your service type

## References

- [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md) - API server deployment
- [BOT_RAILWAY_SETUP.md](./BOT_RAILWAY_SETUP.md) - Discord bot deployment
- [Railway Documentation](https://docs.railway.app)
