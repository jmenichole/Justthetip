# Magic Link Discord Social Login - Redirect URI Configuration

## Issue Summary

When testing Discord social login in the Magic Link dashboard, you may encounter an "invalid redirect URI" error. This document explains the issue and provides the solution.

## Problem

The error occurs because Magic Link uses two different redirect URIs:

1. **Production redirect URI**: Used in your application for actual user authentication
   - `https://auth.magic.link/v1/oauth2/yQOcm6A9KjEIVf77yvvfzD9bnvJQgvOLsfe-CkpHXTg=/callback`

2. **Test redirect URI**: Used by the Magic Link dashboard's "Test Connection" button
   - `https://dashboard.magic.link/app/social_login/test_connection_callback`

Both URIs must be registered in your Discord application's OAuth2 settings for the integration to work properly.

## Solution

### Quick Fix (5 minutes)

**Part 1: Discord Developer Portal**

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (ID: `1419742988128616479`)
3. Navigate to **OAuth2** → **General**
4. In the **Redirects** section, add both URLs:
   ```
   https://auth.magic.link/v1/oauth2/yQOcm6A9KjEIVf77yvvfzD9bnvJQgvOLsfe-CkpHXTg=/callback
   https://dashboard.magic.link/app/social_login/test_connection_callback
   ```
5. Click **Save Changes**

**Part 2: Magic Link Dashboard (Important!)**

6. Go to [Magic Link Dashboard](https://dashboard.magic.link)
7. Navigate to **Settings** → **Allowlists**
8. Add your application domains to **Allowed Origins**:
   ```
   https://jmenichole.github.io
   http://localhost:3000
   ```
   (Add all domains where your app will run)
9. Click **Save**
10. Test the connection in Magic Link dashboard - it should now work!

**Note**: Without the domain allowlist configuration in Magic Link, your application won't be able to authenticate users even if Discord OAuth is configured correctly.

## Detailed Documentation

For complete setup instructions and troubleshooting, see:

- **Quick Fix Guide**: [docs/guides/MAGIC_DISCORD_REDIRECT_FIX.md](docs/guides/MAGIC_DISCORD_REDIRECT_FIX.md)
- **Complete Setup Guide**: [docs/guides/MAGIC_DISCORD_SOCIAL_LOGIN_SETUP.md](docs/guides/MAGIC_DISCORD_SOCIAL_LOGIN_SETUP.md)
- **Magic Integration Overview**: [docs/MAGIC_README.md](docs/MAGIC_README.md)

## Verification

After configuration, verify both systems:

**Discord OAuth2 Redirects:**
```
✅ https://auth.magic.link/v1/oauth2/yQOcm6A9KjEIVf77yvvfzD9bnvJQgvOLsfe-CkpHXTg=/callback
✅ https://dashboard.magic.link/app/social_login/test_connection_callback
```

**Magic Link Dashboard Allowlists (Settings → Allowlists → Allowed Origins):**
```
✅ https://jmenichole.github.io (or your production domain)
✅ http://localhost:3000 (for development)
```

## Why This Is Required

Magic Link's testing infrastructure uses a different callback URL than the production authentication flow. The test URL allows Magic Link's dashboard to verify that your Discord OAuth configuration is correct without affecting your production application.

This is a standard practice for OAuth providers that offer dashboard testing features, ensuring that:
- Test connections are isolated from production
- You can verify configuration before deploying
- The Magic Link team can debug issues without accessing your production environment

## Additional Resources

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Magic Link Dashboard](https://dashboard.magic.link)
- [Magic Link Documentation](https://magic.link/docs)
- [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2)

## Support

If you continue to experience issues:

1. Check the [troubleshooting section](docs/guides/MAGIC_DISCORD_SOCIAL_LOGIN_SETUP.md#troubleshooting) in the complete guide
2. Contact Magic Link support: support@magic.link
3. Visit Magic Link Discord: https://discord.gg/magic
4. Create a GitHub issue with the "magic" and "discord" labels

---

**Last Updated**: 2025-11-16  
**Status**: ✅ Resolved - Documentation Complete
