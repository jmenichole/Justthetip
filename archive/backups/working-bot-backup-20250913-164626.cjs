require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const db = require('./db/database.cjs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Simple command responses with actual balance functionality
const commands = {
    '!help': () => {
        const embed = new EmbedBuilder()
            .setColor('#9333EA')
            .setTitle('🤏💸 JustTheTip Bot - Commands')
            .setDescription('**Available Commands:**')
            .addFields(
                { name: '💰 !balance', value: 'Check your wallet balance', inline: true },
                { name: '💸 !tip @user amount coin', value: 'Tip another user', inline: true },
                { name: '📥 !deposit', value: 'Get deposit address', inline: true },
                { name: '📤 !withdraw address amount coin', value: 'Withdraw to external wallet', inline: true },
                { name: '🎁 !airdrop amount coin', value: 'Create an airdrop', inline: true },
                { name: '🎯 !collect', value: 'Collect from airdrop', inline: true },
                { name: '🔥 !burn amount coin', value: 'Donate to development', inline: true },
                { name: '🆔 !registerwallet coin address', value: 'Register wallet address', inline: true },
                { name: '❓ !help', value: 'Show this help message', inline: true }
            )
            .setFooter({ text: 'JustTheTip - Multi-coin Discord bot' })
            .setTimestamp();
        
        return { embeds: [embed] };
    },

    '!balance': async (message) => {
        const userId = message.author.id;
        const SUPPORTED_COINS = ['SOL', 'USDC', 'LTC', 'BTC', 'BCH'];
        
        try {
            const balances = await Promise.all(
                SUPPORTED_COINS.map(async (coin) => {
                    const balance = await db.getBalance(userId, coin);
                    const formattedBalance = db.getFormattedBalance(balance, coin);
                    return { coin, balance: formattedBalance };
                })
            );

            const embed = new EmbedBuilder()
                .setColor('#10B981')
                .setTitle('💰 Your Balance')
                .setDescription('**Wallet Balances:**')
                .addFields(
                    { name: '🟡 SOL', value: `${balances[0].balance} SOL`, inline: true },
                    { name: '🔵 USDC', value: `${balances[1].balance} USDC`, inline: true },
                    { name: '🔶 LTC', value: `${balances[2].balance} LTC`, inline: true },
                    { name: '🟠 BTC', value: `${balances[3].balance} BTC`, inline: true },
                    { name: '🟢 BCH', value: `${balances[4].balance} BCH`, inline: true }
                )
                .setFooter({ text: 'Use !deposit to fund your wallet' })
                .setTimestamp();
            
            return { embeds: [embed] };
        } catch (error) {
            console.error('Balance command error:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#EF4444')
                .setTitle('❌ Error')
                .setDescription('Failed to fetch balances. Please try again later.')
                .setTimestamp();
            
            return { embeds: [errorEmbed] };
        }
    },

    '!deposit': () => {
        const embed = new EmbedBuilder()
            .setColor('#3B82F6')
            .setTitle('📥 Deposit Instructions')
            .setDescription('**How to deposit crypto:**')
            .addFields(
                { name: '1️⃣ Get your deposit address', value: 'Each coin has a unique deposit address', inline: false },
                { name: '2️⃣ Send crypto to that address', value: 'Transfer from your external wallet', inline: false },
                { name: '3️⃣ Wait for confirmation', value: 'Funds will appear in your balance', inline: false }
            )
            .setFooter({ text: 'Contact support if you need help' })
            .setTimestamp();
        
        return { embeds: [embed] };
    }
};

client.once('clientReady', () => {
    console.log(`🟢 Working Bot logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const content = message.content.trim();
    const command = content.split(' ')[0].toLowerCase();
    
    if (commands[command]) {
        try {
            const response = await commands[command](message);
            if (response) {
                await message.reply(response);
            }
        } catch (error) {
            console.error(`Error executing command ${command}:`, error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#EF4444')
                .setTitle('❌ Command Error')
                .setDescription('Something went wrong. Please try again later.')
                .setTimestamp();
            
            await message.reply({ embeds: [errorEmbed] });
        }
    }
});

// Connect to database before starting
(async () => {
    try {
        await db.connectToDatabase();
        console.log('✅ Working Bot: Database connection established');
        client.login(process.env.BOT_TOKEN);
    } catch (error) {
        console.error('❌ Working Bot: Failed to connect to database:', error);
        process.exit(1);
    }
})();