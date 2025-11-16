# 🔧 Quick Fix: Magic Link Discord "Invalid Redirect URI" Error

## The Problem

When clicking **"Test Connection"** in the Magic Link dashboard for Discord social login, you see an error:

```
Error: redirect_uri did not match a registered redirect URI
```

## The Solution (5 Minutes)

You need to add **BOTH** redirect URIs to your Discord application settings.

### Step 1: Go to Discord Developer Portal

1. Visit: https://discord.com/developers/applications
2. Select application ID: `1419742988128616479` (JustTheTip bot)
3. Click **OAuth2** in the left sidebar

### Step 2: Add Test Redirect URI

In the **Redirects** section, add:

```
https://dashboard.magic.link/app/social_login/test_connection_callback
```

### Step 3: Add Production Redirect URI

Also add (if not already present):

```
https://auth.magic.link/v1/oauth2/yQOcm6A9KjEIVf77yvvfzD9bnvJQgvOLsfe-CkpHXTg=/callback
```

### Step 4: Save

Click **"Save Changes"** at the bottom of the page.

### Step 5: Configure Magic Link Dashboard

1. Go to [Magic Link Dashboard](https://dashboard.magic.link)
2. Navigate to **Settings** → **Allowlists**
3. Add your application domain to **Allowed Origins**:
   - `https://jmenichole.github.io` (for production)
   - `http://localhost:3000` (for development)

### Step 6: Test

1. Go back to Magic Link dashboard
2. Navigate to **Settings** → **Social Login** → **Discord**
3. Click **"Test Connection"** again
4. ✅ It should now work!

## Why This Happens

Magic Link uses two different redirect URIs:

1. **Test URI** - Used by Magic dashboard's test button
2. **Production URI** - Used in your actual app

Both must be registered in Discord for everything to work.

## Need More Help?

See the complete guide: [MAGIC_DISCORD_SOCIAL_LOGIN_SETUP.md](./MAGIC_DISCORD_SOCIAL_LOGIN_SETUP.md)

## Verification Checklist

After configuration, verify:

**In Discord Developer Portal:**
```
✅ https://auth.magic.link/v1/oauth2/yQOcm6A9KjEIVf77yvvfzD9bnvJQgvOLsfe-CkpHXTg=/callback
✅ https://dashboard.magic.link/app/social_login/test_connection_callback
```

**In Magic Link Dashboard (Settings → Allowlists):**
```
✅ https://jmenichole.github.io (or your domain)
✅ http://localhost:3000 (for development)
```

---

**Quick Links:**
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Magic Link Dashboard](https://dashboard.magic.link)
- [Full Setup Guide](./MAGIC_DISCORD_SOCIAL_LOGIN_SETUP.md)
