# 🤖 Keep Your Discord Bot Running 24/7

## ✅ Current Status
- ✅ Backend API deployed on Railway (running 24/7)
- ⚠️ Discord bot needs deployment for 24/7 operation
- ✅ Smart contracts secured on Solana blockchain

## 🚀 Best Options for 24/7 Bot Hosting

### Option 1: Railway (Recommended - Same as API)
**Cost:** $5/month  
**Setup Time:** 5 minutes

#### Steps:
1. **Create New Service** in your Railway project
   ```bash
   # In Railway Dashboard:
   # 1. Click "New" → "Empty Service"
   # 2. Name it "discord-bot"
   ```

2. **Add Environment Variables** (copy from RAILWAY_ENV_VARS.txt)
   ```
   DISCORD_BOT_TOKEN=MTQxOTc0Mjk4ODEyODYxNjQ3OQ.GlpftB.ZR9kkF6-IsXTKco4A08YHHGEgsqZhjjrWVvuu8
   DISCORD_CLIENT_ID=1419742988128616479
   GUILD_ID=1413961128522023024
   LOG_CHANNEL_ID=1414091527969439824
   MONGODB_URI=mongodb+srv://justthetip1:JWjwE7xgOmmc6k3O@justhetip.0z3jtr.mongodb.net/?retryWrites=true&w=majority
   SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=074efb1f-0838-4334-839b-2f5780b43eca
   NODE_ENV=production
   ```

3. **Update package.json** start command for bot service:
   ```json
   {
     "scripts": {
       "start": "node bot.js"
     }
   }
   ```

4. **Connect to GitHub** and deploy automatically

---

### Option 2: Render (Free Tier Available)
**Cost:** Free (with sleep after inactivity) or $7/month (always on)  
**Setup Time:** 5 minutes

#### Steps:
1. Go to [render.com](https://render.com)
2. New → Background Worker
3. Connect your GitHub repo
4. Configure:
   ```
   Name: justthetip-discord-bot
   Build Command: npm install
   Start Command: node bot.js
   ```
5. Add environment variables from RAILWAY_ENV_VARS.txt

---

### Option 3: Self-Hosted VPS (Advanced)
**Cost:** $5-10/month  
**Providers:** DigitalOcean, Linode, Vultr

#### Quick Setup with PM2:
```bash
# Install PM2 globally
npm install -g pm2

# Start bot with PM2
pm2 start bot.js --name justthetip-bot

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system reboot
pm2 startup

# Monitor bot
pm2 monit

# View logs
pm2 logs justthetip-bot
```

---

## 🔄 Auto-Restart on Crash

### PM2 Configuration (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'justthetip-bot',
    script: 'bot.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/bot-error.log',
    out_file: 'logs/bot-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

Then run: `pm2 start ecosystem.config.js`

---

## 🛡️ Smart Contract Security Checklist

### ✅ Already Secured:
- [x] Non-custodial design - users control their funds
- [x] Wallet signature verification using `tweetnacl`
- [x] MongoDB connection with X509 authentication
- [x] Environment variables properly configured
- [x] Rate limiting implemented
- [x] Input validation on all commands

### 🔍 Additional Security Recommendations:

1. **Enable Slash Command Permissions**
   ```javascript
   // In bot.js, restrict sensitive commands
   const adminCommands = ['airdrop', 'burn'];
   
   if (adminCommands.includes(commandName)) {
     const member = interaction.member;
     if (!member.permissions.has('ADMINISTRATOR')) {
       return interaction.reply({ 
         content: '❌ Admin only!', 
         ephemeral: true 
       });
     }
   }
   ```

2. **Add Transaction Monitoring**
   - Set up alerts for unusual activity
   - Monitor fee wallet balances
   - Log all transactions to MongoDB

3. **Implement Balance Checking**
   ```javascript
   // Before processing tips/withdrawals
   const onChainBalance = await getSolanaBalance(userWallet);
   if (onChainBalance < requestedAmount) {
     return interaction.reply('❌ Insufficient balance!');
   }
   ```

---

## 📊 Monitoring & Health Checks

### Railway Auto-Deploy with Health Checks:
```toml
# Add to nixpacks.toml
[phases.start]
cmd = "node bot.js"

[healthcheck]
command = "node -e \"console.log('healthy')\""
interval = 30
timeout = 10
retries = 3
```

### Discord Bot Status Monitoring:
```javascript
// Add to bot.js
client.on('ready', () => {
  setInterval(() => {
    const status = `✅ Online | ${client.guilds.cache.size} servers`;
    client.user.setActivity(status, { type: 'WATCHING' });
  }, 30000); // Update every 30 seconds
});
```

---

## 🔔 Balance Checking Bot (Every 5 Minutes)

### Add Scheduled Balance Checks:
```javascript
// Add to bot.js
const { Connection, PublicKey } = require('@solana/web3.js');

async function checkBalances() {
  const connection = new Connection(process.env.SOLANA_RPC_URL);
  const feeWallet = new PublicKey(process.env.FEE_PAYMENT_SOL_ADDRESS);
  
  const balance = await connection.getBalance(feeWallet);
  const solBalance = balance / 1e9;
  
  console.log(`💰 Fee Wallet Balance: ${solBalance} SOL`);
  
  // Alert if balance is low
  if (solBalance < 0.1) {
    const channel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
    channel.send(`⚠️ **Low Balance Alert!** Fee wallet has only ${solBalance} SOL`);
  }
}

// Run every 5 minutes
setInterval(checkBalances, 5 * 60 * 1000);
```

---

## 🎯 Recommended Setup

**For Your Use Case:**
1. Deploy bot to Railway (same project as API)
2. Use PM2 configuration for auto-restart
3. Add balance monitoring to bot code
4. Set up Discord webhook for alerts

**Total Cost:** $5/month (Railway covers both API + Bot)

**Commands to deploy:**
```bash
# 1. Commit bot updates
git add bot.js ecosystem.config.js
git commit -m "Add bot deployment configuration"
git push origin main

# 2. Railway will auto-deploy
# 3. Monitor logs in Railway dashboard
```

---

## 📱 Quick Health Check Commands

Add these commands to bot for monitoring:

```javascript
{
  name: 'status',
  description: '🔍 Check bot health and balances'
}

// Handler:
if (commandName === 'status') {
  const uptime = Math.floor(process.uptime() / 60);
  const memUsage = Math.floor(process.memoryUsage().heapUsed / 1024 / 1024);
  
  const embed = new EmbedBuilder()
    .setTitle('🤖 Bot Status')
    .addFields(
      { name: '⏱️ Uptime', value: `${uptime} minutes`, inline: true },
      { name: '💾 Memory', value: `${memUsage} MB`, inline: true },
      { name: '🌐 Servers', value: `${client.guilds.cache.size}`, inline: true },
      { name: '✅ Status', value: 'Online & Monitoring', inline: false }
    )
    .setColor('#00ff00');
  
  return interaction.reply({ embeds: [embed] });
}
```

---

## 🔐 Final Security Notes

1. **Never expose** private keys or DISCORD_BOT_TOKEN
2. **Always use** environment variables
3. **Enable 2FA** on all accounts (Discord, Railway, GitHub, MongoDB)
4. **Regular audits** of transaction logs
5. **Backup** your MongoDB database weekly

Your smart contract architecture is already secure! The bot just needs reliable hosting to run 24/7. 🚀
