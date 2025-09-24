# JustTheTip Discord Bot - Setup Guide

## Prerequisites
- Node.js (v16 or higher) - Download from https://nodejs.org
- Discord Developer Account - https://discord.com/developers/applications

## Step 1: Discord Bot Setup

1. **Create Discord Application**
   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Give it a name (e.g., "JustTheTip")
   - Save the **Application ID** (this becomes your `CLIENT_ID`)

2. **Create Bot User**
   - In your application, go to "Bot" section
   - Click "Add Bot" if not already created
   - Copy the **Bot Token** (this becomes your `BOT_TOKEN`)
   - **IMPORTANT**: Keep this token secret!

3. **Configure Bot Permissions**
   - In Bot section, enable these intents:
     - ✅ Message Content Intent
     - ✅ Server Members Intent (if you want member-specific features)
   - In OAuth2 > URL Generator:
     - Select scope: `bot` and `applications.commands`
     - Select permissions:
       - Send Messages
       - Use Slash Commands
       - Read Message History
       - Add Reactions
       - Embed Links

4. **Invite Bot to Server**
   - Use the generated OAuth2 URL to invite your bot
   - Make sure you have "Manage Server" permission

## Step 2: Environment Configuration

1. **Copy Environment File**
   ```bash
   cp .env.example .env
   ```

2. **Fill in Required Values in .env:**
   ```env
   # REQUIRED - Get from Discord Developer Portal
   BOT_TOKEN=your_actual_bot_token_here
   CLIENT_ID=your_actual_client_id_here

   # OPTIONAL - For persistent data (recommended)
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/justthetip

   # OPTIONAL - For better Solana performance
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   ```

## Step 3: Database Setup (Optional but Recommended)

**For MongoDB Atlas (Free):**
1. Go to https://www.mongodb.com/atlas/database
2. Create free account and cluster
3. Create database user
4. Get connection string and add to `MONGODB_URI` in `.env`

**Without Database:**
- Bot works in demo mode
- User balances won't persist between restarts

## Step 4: Install and Run

```bash
# Install dependencies
npm install

# Start the bot
npm start
```

## Step 5: Test Your Bot

In Discord, try these commands:
- `/balance` - Check your balance
- `/tip @user 1.5 SOL` - Tip someone
- `/deposit` - Get deposit instructions

## Troubleshooting

**Bot doesn't respond:**
- Check bot token is correct
- Ensure bot has proper permissions
- Check console for error messages

**Database errors:**
- Verify MongoDB connection string
- Bot will work in demo mode without database

**Permission errors:**
- Ensure bot has slash command permissions
- Re-invite bot with proper scopes

## Production Deployment

For production deployment:
1. Set `NODE_ENV=production` in environment
2. Use a process manager like PM2: `npm install -g pm2 && pm2 start bot.js`
3. Set up proper logging and monitoring
4. Use a production MongoDB instance

## Security Notes

- ⚠️ Never commit your `.env` file
- 🔒 Keep your bot token secret
- 🛡️ Use strong passwords for database
- 📝 Regularly rotate tokens and keys

## Support

If you encounter issues:
1. Check the logs in `/logs/` directory
2. Verify all environment variables are set
3. Ensure Discord bot permissions are correct
4. Check Node.js version compatibility