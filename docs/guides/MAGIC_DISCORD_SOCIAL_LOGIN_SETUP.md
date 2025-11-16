# Magic Link Discord Social Login Setup Guide

## Overview

This guide explains how to properly configure Discord as a social login provider in Magic Link, including the necessary redirect URIs that must be registered in the Discord Developer Portal.

## Problem Statement

When testing the Discord social login connection in the Magic Link dashboard, you may encounter an "invalid redirect URI" error. This occurs because Magic Link uses different redirect URIs for testing versus production, and both must be registered in your Discord application settings.

## Understanding Redirect URIs

Magic Link requires **two different redirect URIs** for Discord OAuth:

1. **Production Redirect URI**: Used for actual user authentication
   - Format: `https://auth.magic.link/v1/oauth2/{CLIENT_ID_HASH}/callback`
   - Example: `https://auth.magic.link/v1/oauth2/yQOcm6A9KjEIVf77yvvfzD9bnvJQgvOLsfe-CkpHXTg=/callback`

2. **Test/Dashboard Redirect URI**: Used when testing the connection in Magic Link dashboard
   - Fixed URL: `https://dashboard.magic.link/app/social_login/test_connection_callback`

## Step-by-Step Configuration

### Step 1: Access Discord Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Sign in with your Discord account
3. Select your application (or create a new one if needed)
   - For JustTheTip bot, the application ID is: `1419742988128616479`

### Step 2: Navigate to OAuth2 Settings

1. In the left sidebar, click on **OAuth2**
2. Click on **General** (if not already selected)
3. Scroll down to the **Redirects** section

### Step 3: Add Required Redirect URIs

You need to add **both** of the following redirect URIs:

#### Production Redirect URI

1. Click **Add Redirect** button
2. Enter your Magic Link production callback URL:
   ```
   https://auth.magic.link/v1/oauth2/yQOcm6A9KjEIVf77yvvfzD9bnvJQgvOLsfe-CkpHXTg=/callback
   ```
3. Click **Save Changes**

**How to find your production redirect URI:**
- Go to [Magic Link Dashboard](https://dashboard.magic.link)
- Navigate to: **Settings** → **Social Login** → **Discord**
- Look for the **Redirect URI** field
- Copy the complete URL (it should start with `https://auth.magic.link/v1/oauth2/`)

#### Test/Dashboard Redirect URI

1. Click **Add Redirect** button again
2. Enter the Magic Link dashboard test callback URL:
   ```
   https://dashboard.magic.link/app/social_login/test_connection_callback
   ```
3. Click **Save Changes**

### Step 4: Verify Configuration

After adding both redirect URIs, your Discord OAuth2 Redirects section should show:

```
✅ https://auth.magic.link/v1/oauth2/yQOcm6A9KjEIVf77yvvfzD9bnvJQgvOLsfe-CkpHXTg=/callback
✅ https://dashboard.magic.link/app/social_login/test_connection_callback
```

### Step 5: Test the Connection

1. Go to [Magic Link Dashboard](https://dashboard.magic.link)
2. Navigate to: **Settings** → **Social Login** → **Discord**
3. Click **Test Connection** button
4. You should now be redirected to Discord's authorization page
5. Authorize the application
6. You should be redirected back to the Magic Link dashboard with a success message

## Troubleshooting

### Error: "Invalid Redirect URI"

**Symptom**: When clicking "Test Connection" in Magic dashboard, you see an error about invalid redirect URI.

**Solution**: 
- Verify that **both** redirect URIs are added to Discord Developer Portal
- Check for typos in the redirect URIs
- Ensure there are no trailing slashes or extra characters
- Make sure you clicked "Save Changes" in Discord Developer Portal

### Error: "Redirect URI Mismatch"

**Symptom**: OAuth flow starts but fails during the redirect.

**Solution**:
- The redirect URI in Magic Link dashboard must **exactly** match what's registered in Discord
- Check for:
  - Extra or missing slashes (`/`)
  - HTTP vs HTTPS
  - Incorrect client ID hash in the production URL

### Test Connection Works but Production Doesn't

**Symptom**: Test connection in Magic dashboard works, but users can't authenticate in your app.

**Solution**:
- Verify the production redirect URI is correctly added to Discord
- Check that the Magic Link client ID hash in the production URL is correct
- Ensure your Magic Link publishable key matches the application configuration

## Configuration Checklist

Use this checklist to ensure everything is configured correctly:

### Discord Developer Portal
- [ ] Application created (ID: 1419742988128616479)
- [ ] Production redirect URI added: `https://auth.magic.link/v1/oauth2/yQOcm6A9KjEIVf77yvvfzD9bnvJQgvOLsfe-CkpHXTg=/callback`
- [ ] Test redirect URI added: `https://dashboard.magic.link/app/social_login/test_connection_callback`
- [ ] Changes saved in Discord Developer Portal
- [ ] Client ID copied to Magic Link dashboard
- [ ] Client Secret copied to Magic Link dashboard

### Magic Link Dashboard
- [ ] Discord social login provider enabled
- [ ] Discord Client ID configured
- [ ] Discord Client Secret configured
- [ ] Redirect URI displayed matches what's in Discord portal
- [ ] Test connection successful
- [ ] Scopes configured (typically `identify` and `email`)

### Environment Variables
- [ ] `DISCORD_CLIENT_ID` set in environment
- [ ] `DISCORD_CLIENT_SECRET` set in GitHub secrets/environment
- [ ] Magic Link keys configured (`MAGIC_PUBLISHABLE_KEY`, `MAGIC_SECRET_KEY`)

## Security Best Practices

1. **Never commit secrets**: Store Discord Client Secret and Magic Secret Key in environment variables or secrets management
2. **Use HTTPS only**: All redirect URIs must use HTTPS (except localhost for development)
3. **Validate redirect URIs**: Only register redirect URIs you actually use
4. **Rotate secrets regularly**: Update Client Secret periodically for security
5. **Monitor OAuth logs**: Check for suspicious authentication attempts

## Related Documentation

- [Magic Link Dashboard](https://dashboard.magic.link)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Magic Link Social Login Docs](https://magic.link/docs/authentication/social-logins/overview)
- [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2)

## Additional Notes

### Why Two Redirect URIs?

Magic Link uses different redirect URIs for different purposes:

1. **Production URI**: Used in your actual application when users authenticate
   - Includes a client-specific hash for security
   - Points to Magic's authentication service

2. **Test URI**: Used by Magic Link dashboard's test feature
   - Fixed URL that doesn't change
   - Points to Magic's dashboard for verification
   - Required for the "Test Connection" button to work

### Client ID Hash Explanation

The production redirect URI includes a hash (e.g., `yQOcm6A9KjEIVf77yvvfzD9bnvJQgvOLsfe-CkpHXTg=`) that:
- Is unique to your Magic Link application
- Provides additional security through obscurity
- Is generated by Magic Link automatically
- Can be found in your Magic Link dashboard under Discord social login settings

## Support

If you continue to experience issues:

1. **Magic Link Support**: support@magic.link or [Magic Discord](https://discord.gg/magic)
2. **Discord Support**: [Discord Developer Support](https://discord.com/developers/docs/intro)
3. **Project Issues**: Create an issue in the JustTheTip GitHub repository with the "magic" and "discord" labels

## Version History

- **v1.0** (2025-11-16): Initial documentation created
  - Added Discord social login redirect URI configuration
  - Documented production and test redirect URIs
  - Added troubleshooting section
