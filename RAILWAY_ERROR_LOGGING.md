# Railway Error Logging Guide

## Overview

This document describes the error logging improvements added to JustTheTip for better visibility into failures when deployed on Railway.

## What's Been Improved

### 1. Winston Logger Enhanced for Railway
**File:** `src/utils/logger.js`

The winston logger now:
- **Always outputs to console in production** - Railway captures stdout/stderr for log viewing in the dashboard
- **Includes timestamps** - Makes debugging time-sensitive issues easier
- **Includes service name** - Helps identify which service (bot/API) generated the log
- **Logs stack traces** - Full error details for debugging
- **Optional file logging** - Can be enabled with `ENABLE_FILE_LOGGING=true` environment variable

```javascript
// Logger output format in Railway:
[2025-11-10 05:27:23] [justthetip-bot] error: Failed to connect to Discord
Stack trace: Error: ...
```

### 2. Global Error Handlers
**Files:** `bot.js`, `api/server.js`

Both services now catch and log:
- **Unhandled Promise Rejections** - Catches async errors that weren't properly handled
- **Uncaught Exceptions** - Catches synchronous errors that bubble to the top
- **Discord Client Errors** - Specific to bot.js, catches Discord connection/API errors

These handlers ensure that:
1. Errors are logged before the process crashes
2. Stack traces are captured for debugging
3. The process exits gracefully (allowing Railway's auto-restart)

### 3. Improved Railway Startup Script
**File:** `scripts/start-bot-railway.js`

Enhanced to:
- Capture both stdout and stderr from the bot process
- Log detailed error information when the bot fails to start
- Handle process exit codes and signals
- Include its own global error handlers

## How to View Logs in Railway

1. Go to your Railway project dashboard
2. Select the service (Bot or API)
3. Click on the **"Logs"** tab
4. Filter by:
   - **All** - See everything
   - **Error** - See only error messages (lines with `❌` or `error`)
   - **Build** - See build logs
   - **Deploy** - See deployment logs

## Common Error Patterns to Look For

### Discord Bot Login Failure
```
❌ Failed to login to Discord: Error: Incorrect login credentials provided
Stack trace: Error: Incorrect login credentials provided
    at WebSocketManager.connect (...)
Please check your DISCORD_BOT_TOKEN environment variable
```
**Fix:** Verify `DISCORD_BOT_TOKEN` in Railway environment variables

### Unhandled Promise Rejection
```
❌ Unhandled Rejection at: Promise {...}
❌ Reason: MongoNetworkError: connect ECONNREFUSED
Stack trace: MongoNetworkError: connect ECONNREFUSED
    at Server.<anonymous> (...)
```
**Fix:** Check database connection string and network access

### Uncaught Exception
```
❌ Uncaught Exception: TypeError: Cannot read property 'x' of undefined
Stack trace: TypeError: Cannot read property 'x' of undefined
    at functionName (file.js:123:45)
⚠️  Exiting due to uncaught exception...
```
**Fix:** Check the stack trace for the file and line number, fix the code

## Environment Variables

### LOG_LEVEL
Controls the logging level for winston logger:
- `error` - Only errors
- `warn` - Warnings and errors
- `info` - Info, warnings, and errors (default)
- `debug` - All logs including debug info

```bash
# In Railway dashboard
LOG_LEVEL=debug
```

### ENABLE_FILE_LOGGING
Enable file-based logging (in addition to console):
```bash
# In Railway dashboard
ENABLE_FILE_LOGGING=true
```

Note: File logging is useful for local development but not necessary in Railway since logs are captured from stdout/stderr.

## Testing the Error Logging

You can test the error logging locally:

```bash
# Set production mode
export NODE_ENV=production

# Test the logger
node -e "const logger = require('./src/utils/logger'); \
  logger.info('Test info'); \
  logger.error('Test error', new Error('test'));"

# Test bot startup (will fail without proper env vars, which is fine for testing)
npm run start:bot-railway
```

## Troubleshooting

### Logs Not Appearing in Railway?
1. Check that the service is running
2. Verify environment variables are set correctly
3. Check that the service hasn't exited immediately (check exit code)

### Too Many Logs?
Reduce log level:
```bash
LOG_LEVEL=warn  # Only warnings and errors
```

### Need More Debug Info?
Increase log level:
```bash
LOG_LEVEL=debug
```

## Related Files

- `src/utils/logger.js` - Winston logger configuration
- `bot.js` - Discord bot with error handlers
- `api/server.js` - API server with error handlers
- `scripts/start-bot-railway.js` - Railway bot startup script
- `logs/` - Directory for optional file-based logs (gitignored)

## Best Practices

1. **Always log errors** - Use `console.error()` or `logger.error()` for errors
2. **Include context** - Log relevant information (user ID, operation, etc.)
3. **Log stack traces** - Use `error.stack` to get full error details
4. **Use appropriate log levels** - info for normal operations, error for failures
5. **Monitor Railway logs** - Check logs regularly, especially after deployments

## Railway Auto-Restart

When an uncaught exception occurs, the process exits with code 1. Railway's restart policy (configured in `railway.json`) will automatically restart the service:

```json
{
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

This means:
- Service restarts automatically on failure
- Up to 10 retries
- Logs are preserved for debugging

---

**Last Updated:** 2025-11-10  
**Version:** 1.0.0
