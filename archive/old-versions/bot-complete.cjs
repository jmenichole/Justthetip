const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const { getSolBalance, sendSol, getUsdcBalance, sendUsdc } = require('./chains/solana.cjs');
const { getLtcBalance, sendLtc } = require('./chains/litecoin.cjs');
const { getBtcBalance, sendBtc } = require('./chains/bitcoin.cjs');
const { getBchBalance, sendBch } = require('./chains/bitcoincash.cjs');
const db = require('./db/database.cjs');

// In-memory airdrop state (for demo; replace with persistent storage for production)
const airdrops = {};

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => console.log(`🟢 Logged in as ${client.user.tag}`));

client.on('messageCreate', async msg => {
  if (msg.author.bot) return;

  const [cmd, ...args] = msg.content.trim().split(/\s+/);

  if (cmd === '!help') {
    msg.reply(
      '**JustTheTip Bot Commands:**\n' +
      '`!balance` - Show your crypto balances\n' +
      '`!tip @user amount coin` - Tip a user (e.g. !tip @bob 0.1 sol)\n' +
      '`!registerwallet coin address` - Register your wallet address\n' +
      '`!withdraw address amount coin` - Withdraw to external wallet\n' +
      '`!deposit` - Get deposit instructions\n' +
      '`!airdrop amount coin` - Create an airdrop for others to collect\n' +
      '`!collect` - Collect from the latest airdrop (if available)\n' +
      '`!burn amount coin` - Donate to support development\n' +
      '`!help` - Show this help message'
    );
    return;
  }

  if (cmd === '!balance') {
    const userId = msg.author.id;
    try {
      const sol = await db.getBalance(userId, 'SOL');
      const usdc = await db.getBalance(userId, 'USDC');
      const ltc = await db.getBalance(userId, 'LTC');
      const btc = await db.getBalance(userId, 'BTC');
      const bch = await db.getBalance(userId, 'BCH');
      
      await msg.author.send(
        `💰 **Your Balances:**\n` +
        `• Solana: ${sol} SOL\n` +
        `• USDC: ${usdc} USDC\n` +
        `• Litecoin: ${ltc} LTC\n` +
        `• Bitcoin: ${btc} BTC\n` +
        `• Bitcoin Cash: ${bch} BCH`
      );
      if (msg.channel.type !== 1) {
        msg.reply('📬 I have sent your balance in a private message.');
      }
    } catch (e) {
      msg.reply('❌ I could not send you a DM. Please check your privacy settings.');
    }
    return;
  }

  if (cmd === '!registerwallet') {
    const [coin, address] = args;
    if (!coin || !address) {
      msg.reply('❌ Usage: `!registerwallet coin address`');
      return;
    }
    const coinU = coin.toUpperCase();
    if (!['SOL', 'LTC', 'BCH', 'BTC', 'USDC'].includes(coinU)) {
      msg.reply('❌ Supported coins: SOL, USDC, LTC, BTC, BCH');
      return;
    }
    try {
      await db.registerWallet(msg.author.id, coinU, address);
      msg.reply(`✅ Registered ${coinU} address: ${address}`);
    } catch (e) {
      msg.reply('❌ Failed to register wallet. Please try again.');
    }
    return;
  }

  if (cmd === '!ping') {
    msg.reply('🏓 Pong! JustTheTip bot is online with crypto features!');
    return;
  }

  // Add more commands here as needed...
});

// Connect to the database before starting the bot
(async () => {
  try {
    await db.connectToDatabase();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
    console.log('⚠️ Bot will start without database functionality');
  }
})();

const token = process.env.BOT_TOKEN || process.env.DISCORD_TOKEN || process.env.TRAPHOUSE_BOT_TOKEN;

if (!token) {
  console.error('❌ No Discord bot token found!');
  console.error('📝 Please check your .env file for: BOT_TOKEN, DISCORD_TOKEN, or TRAPHOUSE_BOT_TOKEN');
  process.exit(1);
}

console.log('🚀 Starting JustTheTip Bot with crypto features...');
console.log('🔑 Token found, attempting login...');

client.login(token).then(() => {
  console.log('✅ JustTheTip Bot is online with full crypto functionality!');
}).catch(error => {
  console.error('❌ Failed to login:', error.message);
  if (error.message.includes('TOKEN_INVALID')) {
    console.error('🔑 The provided token is invalid. Please check your .env file.');
  }
  process.exit(1);
});