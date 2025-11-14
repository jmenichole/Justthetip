# JustTheTip Discord Bot - Invite Links

## 🤖 Simple Bot Invite (Recommended for Users)
Use this link to add the bot to a Discord server:

```
https://discord.com/api/oauth2/authorize?client_id=1419742988128616479&permissions=2147534848&scope=bot%20applications.commands
```

**Permissions included:**
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands
- Manage Messages
- Add Reactions

---

## 🔐 OAuth2 User Login (For Website Integration)
Use this for users logging in via your website:

```
https://discord.com/oauth2/authorize?client_id=1419742988128616479&redirect_uri=https://overflowing-acceptance-production.up.railway.app/callback&response_type=code&scope=identify%20guilds
```

This is what `DISCORD_CLIENT_SECRET` and `REDIRECT_URI` are used for.

---

## ⚙️ Why "Integration requires code grant" appears

This error shows when users try to add your bot to "Personal Apps" instead of a server. Your bot is configured for **server use** with OAuth2 capabilities.

**Solution:** Use the "Simple Bot Invite" link above - it adds the bot directly to servers without OAuth2 complications.

---

## 🛠️ To Update in Discord Developer Portal

1. Go to: https://discord.com/developers/applications/1419742988128616479
2. Navigate to: **OAuth2** → **General**
3. Under **Default Authorization Link**, select: `In-app Authorization`
4. Set **Authorization Method**: `None` (or `In-app Authorization`)
5. Set **Install Link**: Use the Simple Bot Invite URL above

This will change the default behavior when users click "Add App".
