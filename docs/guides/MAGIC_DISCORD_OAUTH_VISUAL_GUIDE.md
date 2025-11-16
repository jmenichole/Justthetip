# Magic Link Discord OAuth Flow - Visual Guide

## Understanding the Two Redirect URIs

### Why Two Different URLs?

Magic Link uses **two separate redirect URIs** to handle different scenarios:

```
┌─────────────────────────────────────────────────────────────┐
│                    Magic Link Setup                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  1. PRODUCTION REDIRECT URI                         │  │
│  │     (Used in your actual application)               │  │
│  │                                                      │  │
│  │  https://auth.magic.link/v1/oauth2/                 │  │
│  │  yQOcm6A9KjEIVf77yvvfzD9bnvJQgvOLsfe-CkpHXTg=       │  │
│  │  /callback                                           │  │
│  │                                                      │  │
│  │  ✓ Handles real user authentication                 │  │
│  │  ✓ Redirects to Magic's auth service                │  │
│  │  ✓ Includes security hash                           │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  2. TEST REDIRECT URI                               │  │
│  │     (Used by Magic dashboard "Test Connection")     │  │
│  │                                                      │  │
│  │  https://dashboard.magic.link/app/social_login/     │  │
│  │  test_connection_callback                           │  │
│  │                                                      │  │
│  │  ✓ Verifies OAuth configuration                     │  │
│  │  ✓ Shows success/failure in dashboard               │  │
│  │  ✓ Doesn't affect production                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## OAuth Flow Comparison

### Production Flow (User Login)

```
User clicks "Login with Discord" in your app
           ↓
Magic initiates Discord OAuth
           ↓
Discord authorization page
           ↓
User authorizes app
           ↓
Discord redirects to:
https://auth.magic.link/v1/oauth2/yQOcm6A9.../callback
           ↓
Magic processes authentication
           ↓
User logged in to your app
```

### Test Flow (Dashboard Testing)

```
You click "Test Connection" in Magic dashboard
           ↓
Magic initiates Discord OAuth
           ↓
Discord authorization page
           ↓
You authorize app
           ↓
Discord redirects to:
https://dashboard.magic.link/app/social_login/test_connection_callback
           ↓
Magic dashboard shows success/failure
           ↓
Configuration verified ✓
```

## The Problem (Before Fix)

```
Discord Developer Portal
├── Registered Redirect URIs:
│   └── https://auth.magic.link/v1/oauth2/yQOcm6A9.../callback ✓
│
└── Missing:
    └── https://dashboard.magic.link/app/social_login/test_connection_callback ✗

Result: "Invalid redirect URI" error when testing
```

## The Solution (After Fix)

```
Discord Developer Portal
├── Registered Redirect URIs:
│   ├── https://auth.magic.link/v1/oauth2/yQOcm6A9.../callback ✓
│   └── https://dashboard.magic.link/app/social_login/test_connection_callback ✓
│
└── Both flows work correctly! ✓

Results:
  - Production login: Works ✓
  - Dashboard testing: Works ✓
```

## Configuration Steps (Visual)

### Step 1: Access Discord Developer Portal

```
Browser: https://discord.com/developers/applications
         ↓
Select Application: 1419742988128616479 (JustTheTip)
         ↓
Navigate: OAuth2 → General
         ↓
Scroll to: Redirects section
```

### Step 2: Add Both URLs

```
[Add Redirect] button
         ↓
Enter URL #1: https://auth.magic.link/v1/oauth2/yQOcm6A9KjEIVf77yvvfzD9bnvJQgvOLsfe-CkpHXTg=/callback
         ↓
[Add Redirect] button
         ↓
Enter URL #2: https://dashboard.magic.link/app/social_login/test_connection_callback
         ↓
[Save Changes] button
```

### Step 3: Verify

```
Discord Developer Portal shows:
┌─────────────────────────────────────────────────────────┐
│ OAuth2 Redirects                                        │
├─────────────────────────────────────────────────────────┤
│ ✓ https://auth.magic.link/v1/oauth2/yQOcm6A9.../callback│
│ ✓ https://dashboard.magic.link/app/social_login/        │
│   test_connection_callback                              │
└─────────────────────────────────────────────────────────┘

Status: Configuration complete! ✓
```

## Testing Matrix

| Test Scenario | Required URI | Status |
|--------------|--------------|--------|
| Magic dashboard "Test Connection" | `https://dashboard.magic.link/app/social_login/test_connection_callback` | ✓ |
| Production user login | `https://auth.magic.link/v1/oauth2/yQOcm6A9.../callback` | ✓ |
| Local development testing | Both URIs | ✓ |
| Staging environment | Production URI | ✓ |

## Security Notes

Both redirect URIs are secure because:

1. **HTTPS only** - No HTTP redirect URIs accepted
2. **Magic.link domain** - Only Magic's authenticated domains
3. **No wildcard** - Exact URL matching required
4. **OAuth state parameter** - Prevents CSRF attacks
5. **Time-limited tokens** - Tokens expire quickly

## Common Mistakes to Avoid

❌ **Don't do this:**
```
Only adding production URI
Only adding test URI
Adding with typos (extra slashes, etc.)
Forgetting to click Save Changes
```

✅ **Do this:**
```
Add BOTH redirect URIs
Copy-paste URLs exactly
Save changes in Discord portal
Test after saving
```

## Quick Reference Card

```
╔════════════════════════════════════════════════════════════╗
║  MAGIC LINK DISCORD OAUTH - REDIRECT URI CHECKLIST        ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  □ Discord Developer Portal accessed                       ║
║  □ Application selected (1419742988128616479)             ║
║  □ OAuth2 → General → Redirects opened                    ║
║  □ Production URI added:                                   ║
║    https://auth.magic.link/v1/oauth2/                      ║
║    yQOcm6A9KjEIVf77yvvfzD9bnvJQgvOLsfe-CkpHXTg=/callback  ║
║  □ Test URI added:                                         ║
║    https://dashboard.magic.link/app/social_login/          ║
║    test_connection_callback                                ║
║  □ Changes saved                                           ║
║  □ Test connection verified in Magic dashboard             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

## Next Steps

1. ✓ Complete this configuration
2. Test connection in Magic dashboard
3. Implement user login in your application
4. Monitor authentication logs
5. Set up production monitoring

## Resources

- **This Guide**: Quick visual reference
- **Detailed Guide**: [MAGIC_DISCORD_SOCIAL_LOGIN_SETUP.md](./docs/guides/MAGIC_DISCORD_SOCIAL_LOGIN_SETUP.md)
- **Quick Fix**: [MAGIC_DISCORD_OAUTH_FIX.md](./MAGIC_DISCORD_OAUTH_FIX.md)
- **Magic Dashboard**: https://dashboard.magic.link
- **Discord Portal**: https://discord.com/developers/applications

---

**Visual Guide Version**: 1.0  
**Last Updated**: 2025-11-16  
**Status**: Complete ✓
