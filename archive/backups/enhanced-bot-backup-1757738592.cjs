require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const db = require('./db/database.cjs');

// Import blockchain functions
const { getSolBalance, sendSol, sendUsdc } = require('./chains/solana.cjs');
const { getLtcBalance, sendLtc } = require('./chains/litecoin.cjs');
const { getBtcBalance, sendBtc } = require('./chains/bitcoin.cjs');
const { getBchBalance, sendBch } = require('./chains/bitcoincash.cjs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// In-memory airdrop storage (for production use database)
const airdrops = {};

// Rate limiting
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 commands per minute

function checkRateLimit(userId) {
    const now = Date.now();
    const userLimits = rateLimits.get(userId) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    
    if (now > userLimits.resetTime) {
        userLimits.count = 0;
        userLimits.resetTime = now + RATE_LIMIT_WINDOW;
    }
    
    if (userLimits.count >= RATE_LIMIT_MAX) {
        return false;
    }
    
    userLimits.count++;
    rateLimits.set(userId, userLimits);
    return true;
}

// Enhanced command responses
// const commands = {
//     '!help': () => {
//         const embed = new EmbedBuilder()
//             .setColor('#9333EA')
//             .setTitle('🤏💸 JustTheTip Bot - Commands')
//             .setDescription('**Self-custodial multi-chain tipping bot**')
//             .addFields(
//                 { name: '💰 !balance', value: 'Check your wallet balances', inline: true },
//                 { name: '💸 !tip @user amount coin', value: 'Tip another user crypto', inline: true },
//                 { name: '🔗 !registerwallet coin address', value: 'Register your wallet', inline: true },
//                 { name: '📥 !deposit', value: 'Get deposit instructions', inline: true },
//                 { name: '📤 !withdraw address amount coin', value: 'Withdraw to external wallet', inline: true },
//                 { name: '🎁 !airdrop amount coin', value: 'Create public airdrop', inline: true },
//                 { name: '🎯 !collect', value: 'Collect from latest airdrop', inline: true },
//                 { name: '🔥 !burn amount coin', value: 'Donate to bot development', inline: true }
//             )
//             .addFields({ 
//                 name: '**Supported Coins:**', 
//                 value: '🟡 SOL • 🔵 USDC • 🔶 LTC • 🟠 BTC (testnet) • 🟢 BCH', 
//                 inline: false 
//             })
//             .addFields({ 
//                 name: '**Admin Commands:**', 
//                 value: '🔐 !admin • 📊 !stats • 📢 !announce <message>', 
//                 inline: false 
//             })
//             .setFooter({ text: 'JustTheTip - Built for degenerates, by degenerates' })
//             .setTimestamp();
//         
//         return { embeds: [embed] };
//     },
// 
//     '!balance': async (message) => {
//         const userId = message.author.id;
//         try {
//             const sol = await db.getBalance(userId, 'SOL');
//             const usdc = await db.getBalance(userId, 'USDC'); 
//             const ltc = await db.getBalance(userId, 'LTC');
//             const btc = await db.getBalance(userId, 'BTC');
//             const bch = await db.getBalance(userId, 'BCH');
// 
//             const embed = new EmbedBuilder()
//                 .setColor('#10B981')
//                 .setTitle('💰 Your Wallet Balances')
//                 .setDescription('**Current Holdings:**')
//                 .addFields(
//                     { name: '🟡 Solana', value: `${sol.toFixed(6)} SOL`, inline: true },
//                     { name: '🔵 USDC', value: `${usdc.toFixed(2)} USDC`, inline: true },
//                     { name: '🔶 Litecoin', value: `${ltc.toFixed(8)} LTC`, inline: true },
//                     { name: '🟠 Bitcoin', value: `${btc.toFixed(8)} BTC`, inline: true },
//                     { name: '🟢 Bitcoin Cash', value: `${bch.toFixed(8)} BCH`, inline: true },
//                     { name: '💡 Tip', value: 'Use `!deposit` to add funds', inline: true }
//                 )
//                 .setFooter({ text: 'Balances updated in real-time' })
//                 .setTimestamp();
//             
//             return { embeds: [embed] };
//         } catch (error) {
//             console.error('Balance error:', error);
//             return { content: '❌ Error retrieving balances. Please try again.' };
//         }
//     },
// 
//     '!deposit': async (message) => {
//         const userId = message.author.id;
//         try {
//             const solAddr = await db.getWallet(userId, 'SOL');
//             const ltcAddr = await db.getWallet(userId, 'LTC');
//             const btcAddr = await db.getWallet(userId, 'BTC');
//             const bchAddr = await db.getWallet(userId, 'BCH');
// 
//             const embed = new EmbedBuilder()
//                 .setColor('#3B82F6')
//                 .setTitle('📥 Deposit Instructions')
//                 .setDescription('**Send crypto to your registered addresses:**')
//                 .addFields(
//                     { 
//                         name: '🟡 Solana (SOL & USDC)', 
//                         value: solAddr ? `\`${solAddr}\`` : '❌ Not registered - use `!registerwallet SOL <address>`', 
//                         inline: false 
//                     },
//                     { 
//                         name: '🔶 Litecoin', 
//                         value: ltcAddr ? `\`${ltcAddr}\`` : '❌ Not registered - use `!registerwallet LTC <address>`', 
//                         inline: false 
//                     },
//                     { 
//                         name: '🟠 Bitcoin (Testnet)', 
//                         value: btcAddr ? `\`${btcAddr}\`` : '❌ Not registered - use `!registerwallet BTC <address>`', 
//                         inline: false 
//                     },
//                     { 
//                         name: '🟢 Bitcoin Cash', 
//                         value: bchAddr ? `\`${bchAddr}\`` : '❌ Not registered - use `!registerwallet BCH <address>`', 
//                         inline: false 
//                     }
//                 )
//                 .addFields({ 
//                     name: '⚠️ Important', 
//                     value: 'Only send supported cryptocurrencies to their respective addresses!\nUSDC uses your Solana address.', 
//                     inline: false 
//                 })
//                 .setFooter({ text: 'Deposits are processed automatically' })
//                 .setTimestamp();
//             
//             return { embeds: [embed] };
//         } catch (error) {
//             console.error('Deposit error:', error);
//             return { content: '❌ Error retrieving deposit information.' };
//         }
//     }
// };

// Admin commands
// const adminCommands = {
//     '!admin': (message) => {
//         const isAdmin = process.env.SUPER_ADMIN_USER_IDS?.includes(message.author.id);
//         
//         if (!isAdmin) {
//             return { content: '❌ Access denied. Admin privileges required.' };
//         }
// 
//         const embed = new EmbedBuilder()
//             .setColor('#DC2626')
//             .setTitle('🔐 Admin Control Panel')
//             .setDescription('**Available Admin Commands:**')
//             .addFields(
//                 { name: '📊 !stats', value: 'View bot statistics', inline: true },
//                 { name: '📢 !announce <message>', value: 'Global announcement', inline: true },
//                 { name: '👥 !users', value: 'User count & activity', inline: true },
//                 { name: '💾 !backup', value: 'Database backup', inline: true },
//                 { name: '🔄 !restart', value: 'Restart bot services', inline: true },
//                 { name: '🚫 !ban <user>', value: 'Ban user from bot', inline: true }
//             )
//             .setFooter({ text: `Admin: ${message.author.tag}` })
//             .setTimestamp();
//         
//         return { embeds: [embed] };
//     },
// 
//     '!stats': (message) => {
//         const isAdmin = process.env.SUPER_ADMIN_USER_IDS?.includes(message.author.id);
//         
//         if (!isAdmin) {
//             return { content: '❌ Access denied. Admin privileges required.' };
//         }
// 
//         const embed = new EmbedBuilder()
//             .setColor('#059669')
//             .setTitle('📊 Bot Statistics')
//             .setDescription('**JustTheTip Bot Status**')
//             .addFields(
//                 { name: '🏛️ Servers', value: `${client.guilds.cache.size}`, inline: true },
//                 { name: '👥 Users', value: `${client.users.cache.size}`, inline: true },
//                 { name: '⏱️ Uptime', value: `${Math.floor(process.uptime())}s`, inline: true },
//                 { name: '💾 Memory', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
//                 { name: '🟢 Status', value: 'Online & Stable', inline: true },
//                 { name: '🔄 Version', value: '2.1.0', inline: true },
//                 { name: '⛓️ Chains', value: 'SOL, USDC, LTC, BTC, BCH', inline: true },
//                 { name: '🔐 Security', value: 'Rate Limited & Monitored', inline: true },
//                 { name: '💸 Commands', value: 'tip, withdraw, deposit, airdrop', inline: true }
//             )
//             .setFooter({ text: 'JustTheTip Production Stats' })
//             .setTimestamp();
//         
//         return { embeds: [embed] };
//     }
// };

client.once('ready', () => {
    console.log(`✅ JustTheTip Bot Online: ${client.user.tag}`);
    console.log(`📊 Servers: ${client.guilds.cache.size} | Users: ${client.users.cache.size}`);
    console.log(`🔐 Admin Password: yourmom007`);
    console.log(`⚡ Command System: / slash commands only`);
    console.log(`⛓️ Multi-chain: SOL, USDC, LTC, BTC, BCH`);
    
    // Set bot status
    client.user.setPresence({
        activities: [{
            name: '💸 Just the tip | !help',
            type: 0
        }],
        status: 'online'
    });

    // Connect to database
    db.connectToDatabase().catch(error => {
        console.error('❌ Database connection failed:', error);
    });
});

// client.on('messageCreate', async (message) => {
//     if (message.author.bot) return;
// 
//     const content = message.content.toLowerCase().trim();
//     const userId = message.author.id;
//     
//     // Rate limiting
//     if (!checkRateLimit(userId)) {
//         return message.reply('⏳ Rate limit exceeded. Please wait before sending more commands.');
//     }
//     
//     // Handle basic commands
//     if (commands[content]) {
//         try {
//             const response = await commands[content](message);
//             await message.reply(response);
//         } catch (error) {
//             console.error('Command error:', error);
//             await message.reply('❌ An error occurred while processing your command.');
//         }
//         return;
//     }
//     
//     // Handle admin commands
//     if (adminCommands[content]) {
//         try {
//             const response = adminCommands[content](message);
//             await message.reply(response);
//         } catch (error) {
//             console.error('Admin command error:', error);
//             await message.reply('❌ An error occurred while processing your admin command.');
//         }
//         return;
//     }
//     
//     // Handle commands with arguments
//     const args = message.content.trim().split(/\s+/);
//     const command = args[0].toLowerCase();
//     
//     // Register wallet command
//     if (command === '!registerwallet') {
//         if (args.length !== 3) {
//             return message.reply('❌ Usage: `!registerwallet coin address`\nExample: `!registerwallet SOL 9WzDX...`');
//         }
//         
//         const [, coin, address] = args;
//         const coinU = coin.toUpperCase();
//         
//         if (!['SOL', 'USDC', 'LTC', 'BTC', 'BCH'].includes(coinU)) {
//             return message.reply('❌ Supported coins: SOL, USDC, LTC, BTC, BCH');
//         }
//         
//         try {
//             await db.registerWallet(userId, coinU === 'USDC' ? 'SOL' : coinU, address);
//             
//             const embed = new EmbedBuilder()
//                 .setColor('#10B981')
//                 .setTitle('✅ Wallet Registered')
//                 .setDescription(`**${coinU} wallet successfully registered!**`)
//                 .addFields(
//                     { name: 'Coin', value: coinU, inline: true },
//                     { name: 'Address', value: `\`${address}\``, inline: false }
//                 )
//                 .setFooter({ text: 'You can now receive tips and deposits' })
//                 .setTimestamp();
//             
//             await message.reply({ embeds: [embed] });
//         } catch (error) {
//             console.error('Register wallet error:', error);
//             await message.reply('❌ Failed to register wallet. Please try again.');
//         }
//     }
//     
//     // Tip command  
//     else if (command === '!tip') {
//         if (args.length !== 4) {
//             return message.reply('❌ Usage: `!tip @user amount coin`\nExample: `!tip @friend 0.1 sol`');
//         }
//         
//         const [, mention, amountStr, coin] = args;
//         const amount = parseFloat(amountStr);
//         const coinU = coin.toUpperCase();
//         
//         if (!mention.startsWith('<@') || isNaN(amount) || amount <= 0) {
//             return message.reply('❌ Invalid format. Example: `!tip @friend 0.1 sol`');
//         }
//         
//         if (!['SOL', 'USDC', 'LTC', 'BTC', 'BCH'].includes(coinU)) {
//             return message.reply('❌ Supported coins: SOL, USDC, LTC, BTC, BCH');
//         }
//         
//         const targetId = mention.replace(/[^0-9]/g, '');
//         if (targetId === userId) {
//             return message.reply("❌ You can't tip yourself!");
//         }
//         
//         try {
//             const senderBalance = await db.getBalance(userId, coinU);
//             if (senderBalance < amount) {
//                 return message.reply(`❌ Insufficient ${coinU} balance. You have ${senderBalance} ${coinU}`);
//             }
//             
//             const recipientWallet = await db.getWallet(targetId, coinU === 'USDC' ? 'SOL' : coinU);
//             if (!recipientWallet) {
//                 return message.reply(`❌ <@${targetId}> hasn't registered a ${coinU} wallet yet.`);
//             }
//             
//             // Update balances
//             await db.updateBalance(userId, coinU, senderBalance - amount);
//             const recipientBalance = await db.getBalance(targetId, coinU);
//             await db.updateBalance(targetId, coinU, recipientBalance + amount);
//             
//             // Add to history
//             await db.addHistory(userId, {
//                 type: 'tip',
//                 to: targetId,
//                 coin: coinU,
//                 amount: amount,
//                 date: new Date()
//             });
//             
//             await db.addHistory(targetId, {
//                 type: 'receive',
//                 from: userId,
//                 coin: coinU,
//                 amount: amount,
//                 date: new Date()
//             });
//             
//             const embed = new EmbedBuilder()
//                 .setColor('#10B981')
//                 .setTitle('💸 Tip Sent Successfully!')
//                 .setDescription(`**${amount} ${coinU}** sent to <@${targetId}>`)
//                 .addFields(
//                     { name: 'From', value: `<@${userId}>`, inline: true },
//                     { name: 'To', value: `<@${targetId}>`, inline: true },
//                     { name: 'Amount', value: `${amount} ${coinU}`, inline: true }
//                 )
//                 .setFooter({ text: 'Transaction recorded in bot database' })
//                 .setTimestamp();
//             
//             await message.reply({ embeds: [embed] });
//             
//         } catch (error) {
//             console.error('Tip error:', error);
//             await message.reply('❌ Tip failed. Please try again.');
//         }
//     }
//     
//     // Admin announce command
//     else if (command === '!announce' && process.env.SUPER_ADMIN_USER_IDS?.includes(userId)) {
//         const announcement = args.slice(1).join(' ');
//         if (!announcement) {
//             return message.reply('❌ Usage: `!announce <message>`');
//         }
//         
//         const embed = new EmbedBuilder()
//             .setColor('#DC2626')
//             .setTitle('📢 Official Announcement')
//             .setDescription(announcement)
//             .setFooter({ text: `From: ${message.author.tag}` })
//             .setTimestamp();
//         
//         await message.reply({ embeds: [embed] });
//     }
//     
//     // Feature in development placeholders
//     else if (['!withdraw', '!airdrop', '!collect', '!burn'].includes(command)) {
//         const featureNames = {
//             '!withdraw': 'Withdraw to External Wallet',
//             '!airdrop': 'Create Public Airdrops',
//             '!collect': 'Collect Airdrops',
//             '!burn': 'Donate to Development'
//         };
//         
//         const embed = new EmbedBuilder()
//             .setColor('#F59E0B')
//             .setTitle(`🚧 ${featureNames[command]}`)
//             .setDescription('**This feature is coming soon!**')
//             .addFields(
//                 { name: 'Status', value: 'In Development', inline: true },
//                 { name: 'ETA', value: 'Next Update', inline: true }
//             )
//             .setFooter({ text: 'JustTheTip - Continuous Development' });
//         
//         await message.reply({ embeds: [embed] });
//     }
// });

client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
});

client.on('warn', (warning) => {
    console.warn('⚠️ Discord client warning:', warning);
});

// Login to Discord
client.login(process.env.BOT_TOKEN).catch(error => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Bot shutting down...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Bot shutting down...');
    client.destroy();
    process.exit(0);
});

// Console branding
console.log(`
🤏💸 JustTheTip Discord Bot v2.1.0
=====================================
Command System: / slash commands only
Multi-chain: SOL, USDC, LTC, BTC, BCH
Admin Password: yourmom007

Built for degenerates, by degenerates.
Self-custodial tipping at its finest!
=====================================
`);