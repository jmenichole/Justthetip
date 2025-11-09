# Deployment Fix: Wallet Registration 404 Error

## Problem Summary

This fix addresses two critical issues in production deployments:

1. **404 Error on Vercel**: The wallet registration page (`/sign.html`) was not accessible because it was located in `api/public/` but Vercel's routing configuration was looking for it in `docs/`.

2. **Localhost URLs in Discord**: The `/registerwallet` Discord command was generating links with `http://localhost:3000` instead of the production URL because the `API_BASE_URL` environment variable was not properly configured.

## What Was Fixed

### 1. File Location
- **Before**: `api/public/sign.html` (not accessible via Vercel routes)
- **After**: `docs/sign.html` (accessible via Vercel routes)
- **Note**: Both files are kept for compatibility with different deployment methods

### 2. Documentation Updates
- Added `API_BASE_URL` to Vercel deployment guide
- Updated `.env.example` with Vercel example
- Added troubleshooting section for wallet registration issues

## How to Deploy

### For Vercel Deployment

1. **Deploy the API Server to Vercel**:
   - Push this branch to GitHub
   - Vercel will automatically deploy if connected to your repository
   - Or manually deploy via Vercel dashboard

2. **Set Environment Variable for Bot**:
   The Discord bot needs to know where your API is deployed. Set this environment variable where your bot is running (Railway, Heroku, local server, etc.):
   
   ```bash
   API_BASE_URL=https://your-project.vercel.app
   ```
   
   Replace `your-project.vercel.app` with your actual Vercel deployment URL.

3. **Restart the Bot**:
   After setting the environment variable, restart your Discord bot application.

### For Other Deployments (Railway, Heroku, etc.)

If you're deploying both the API and bot on the same platform:

1. Set `API_BASE_URL` to your deployment URL:
   ```bash
   API_BASE_URL=https://your-app.railway.app
   ```

2. The bot will now generate correct registration links.

## Verification Steps

After deployment, verify the fix:

1. **Check the API Server**:
   - Visit `https://your-project.vercel.app/sign.html`
   - You should see the wallet registration page (not a 404)

2. **Check the API Health**:
   - Visit `https://your-project.vercel.app/api/health`
   - Should return JSON with `"status": "ok"`

3. **Test the Bot Command**:
   - In Discord, run `/registerwallet`
   - Click the registration link in the bot's response
   - Should open the wallet registration page (not a 404)
   - URL should be `https://your-project.vercel.app/sign.html?user=...&username=...&nonce=...`

## Environment Variables Reference

### Required for Bot Operation

| Variable | Purpose | Example |
|----------|---------|---------|
| `API_BASE_URL` | Base URL of your API server | `https://your-project.vercel.app` |
| `DISCORD_BOT_TOKEN` | Discord bot authentication | From Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Discord application ID | From Discord Developer Portal |

### Optional for Advanced Features

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Persistent storage for wallet registrations |
| `SOLANA_RPC_URL` | Solana blockchain connection |
| `DATABASE_URL` | PostgreSQL for production |

See `.env.example` for complete list.

## Troubleshooting

### Still Getting 404 Errors?

1. **Clear browser cache**: The old 404 response might be cached
2. **Check deployment logs**: Look for errors in Vercel deployment logs
3. **Verify file exists**: Check that `docs/sign.html` is in your repository
4. **Check Vercel routes**: Verify `vercel.json` hasn't been modified

### Bot Still Using Localhost?

1. **Verify environment variable**: Check that `API_BASE_URL` is set in your bot's environment
2. **Restart the bot**: Changes to environment variables require a restart
3. **Check bot logs**: Look for the URL being generated in the logs

### Registration Link Works But Verification Fails?

1. **Check API server logs**: Look for errors in the `/api/registerwallet/verify` endpoint
2. **Verify database**: Ensure MongoDB or PostgreSQL is connected
3. **Check CORS settings**: Verify CORS allows requests from your domain

## Technical Details

### Vercel Routing Configuration

The `vercel.json` file configures how requests are handled:

```json
{
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

- API requests (`/api/*`) → Express server
- All other requests → Static files from `docs/`

### Why Two Copies of sign.html?

- `api/public/sign.html` - Used when running the API server directly (Railway, Heroku, local)
- `docs/sign.html` - Used for Vercel deployments (static file serving)

This ensures compatibility across different deployment methods without requiring configuration changes.

## Support

If you continue to experience issues after following this guide:

1. Check the [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) for detailed Vercel instructions
2. Review the [.env.example](./.env.example) for environment variable examples
3. Open an issue on GitHub with:
   - Your deployment platform (Vercel, Railway, etc.)
   - The URL you're trying to access
   - Any error messages from logs

## Related Files

- `vercel.json` - Vercel routing configuration
- `api/server.js` - Express API server
- `bot.js` - Discord bot (uses API_BASE_URL)
- `docs/sign.html` - Wallet registration page
- `.env.example` - Environment variable examples
