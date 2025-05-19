const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const { getSolBalance } = require('./chains/solana');
const { getLtcBalance } = require('./chains/litecoin');
const db = require('./db/database');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => console.log(`🟢 Logged in as ${client.user.tag}`));

client.on('messageCreate', async msg => {
  if (msg.author.bot) return;

  const [cmd, ...args] = msg.content.split(" ");

  if (cmd === '!balance') {
    const userData = await db.getUserData(msg.author.id);
    const sol = userData.solBalance || 0;
    const ltc = userData.ltcBalance || 0;
    msg.reply(`💰 Balances:\n• Solana: ${sol} SOL\n• Litecoin: ${ltc} LTC`);
  }

  if (cmd === '!tip' && args.length === 3) {
    const [mention, amount, coin] = args;
    const userId = mention.replace(/[<@!>]/g, ''); // Extract user ID from mention
    const userData = await db.getUserData(userId);
    
    if (coin.toLowerCase() === 'sol') {
      const solBalance = userData.solBalance || 0;
      if (solBalance < amount) {
        return msg.reply(`❌ Insufficient balance to send ${amount} SOL.`);
      }
      await db.updateBalance(userId, 'sol', -amount);
      msg.reply(`⏳ Sending ${amount} SOL to <@${userId}>...`);
      // Call sendSol function here
    } else if (coin.toLowerCase() === 'ltc') {
      const ltcBalance = userData.ltcBalance || 0;
      if (ltcBalance < amount) {
        return msg.reply(`❌ Insufficient balance to send ${amount} LTC.`);
      }
      await db.updateBalance(userId, 'ltc', -amount);
      msg.reply(`⏳ Sending ${amount} LTC to <@${userId}>...`);
      // Call sendLtc function here
    } else {
      msg.reply(`❌ Unsupported coin type: ${coin}.`);
    }
  }

  if (cmd === '!registerwallet') {
    const [coin, address] = args;
    await db.registerWallet(msg.author.id, coin, address);
    msg.reply(`✅ Registered ${coin.toUpperCase()} address: ${address}`);
  }
});

client.login(process.env.BOT_TOKEN);