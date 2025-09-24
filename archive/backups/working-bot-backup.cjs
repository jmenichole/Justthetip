require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Simple command responses
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
                { name: '🔗 !registerwallet coin address', value: 'Register external wallet', inline: true }
            )
            .addFields({ name: '**Supported Coins:**', value: 'SOL, USDC, LTC, BTC (testnet), BCH', inline: false })
            .setFooter({ text: 'JustTheTip - Self-custodial multi-chain tipping' })
            .setTimestamp();
        
        return { embeds: [embed] };
    },

    '!balance': () => {
        const embed = new EmbedBuilder()
            .setColor('#10B981')
            .setTitle('💰 Your Balance')
            .setDescription('**Wallet Balances:**')
            .addFields(
                { name: '🟡 SOL', value: '0.00 SOL', inline: true },
                { name: '🔵 USDC', value: '0.00 USDC', inline: true },
                { name: '🔶 LTC', value: '0.00 LTC', inline: true },
                { name: '🟠 BTC', value: '0.00 BTC', inline: true },
                { name: '🟢 BCH', value: '0.00 BCH', inline: true }
            )
            .setFooter({ text: 'Use !deposit to fund your wallet' })
            .setTimestamp();
        
        return { embeds: [embed] };
    },

    '!deposit': () => {
        const embed = new EmbedBuilder()
            .setColor('#3B82F6')
            .setTitle('📥 Deposit Instructions')
            .setDescription('**How to deposit crypto:**')
            .addFields(
                { name: '1️⃣ Get your deposit address', value: 'Each coin has a unique deposit address', inline: false },
                { name: '2️⃣ Send crypto to your address', value: 'Transfer from your external wallet', inline: false },
                { name: '3️⃣ Wait for confirmation', value: 'Funds will appear in your balance', inline: false }
            )
            .addFields({ name: '⚠️ Note', value: 'Only send supported cryptocurrencies to their respective addresses!', inline: false })
            .setFooter({ text: 'Bot is in development mode - Advanced features coming soon!' })
            .setTimestamp();
        
        return { embeds: [embed] };
    }
};

// Admin commands
const adminCommands = {
    '!admin': (message) => {
        const isAdmin = process.env.SUPER_ADMIN_USER_IDS?.includes(message.author.id);
        
        if (!isAdmin) {
            return { content: '❌ Access denied. Admin privileges required.' };
        }

        const embed = new EmbedBuilder()
            .setColor('#DC2626')
            .setTitle('🔐 Admin Panel')
            .setDescription('**Available Admin Commands:**')
            .addFields(
                { name: '📊 !stats', value: 'View bot statistics', inline: true },
                { name: '💾 !backup', value: 'Create database backup', inline: true },
                { name: '🔄 !restart', value: 'Restart bot services', inline: true },
                { name: '📢 !announce <message>', value: 'Global announcement', inline: true }
            )
            .setFooter({ text: 'Admin access granted' })
            .setTimestamp();
        
        return { embeds: [embed] };
    },

    '!stats': (message) => {
        const isAdmin = process.env.SUPER_ADMIN_USER_IDS?.includes(message.author.id);
        
        if (!isAdmin) {
            return { content: '❌ Access denied. Admin privileges required.' };
        }

        const embed = new EmbedBuilder()
            .setColor('#059669')
            .setTitle('📊 Bot Statistics')
            .addFields(
                { name: '🏛️ Servers', value: `${client.guilds.cache.size}`, inline: true },
                { name: '👥 Users', value: `${client.users.cache.size}`, inline: true },
                { name: '⏱️ Uptime', value: `${Math.floor(process.uptime())}s`, inline: true },
                { name: '💾 Memory', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
                { name: '🟢 Status', value: 'Online', inline: true },
                { name: '🔄 Version', value: '2.0.0', inline: true }
            )
            .setTimestamp();
        
        return { embeds: [embed] };
    }
};

client.once('ready', () => {
    console.log(`✅ Bot is online as ${client.user.tag}!`);
    console.log(`📊 Connected to ${client.guilds.cache.size} servers`);
    console.log(`👥 Serving ${client.users.cache.size} users`);
    console.log(`🔐 Admin password set to: yourmom007`);
    
    // Set bot status
    client.user.setPresence({
        activities: [{
            name: '💸 Just the tip | !help',
            type: 0
        }],
        status: 'online'
    });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.toLowerCase().trim();
    
    // Handle basic commands
    if (commands[content]) {
        try {
            const response = commands[content](message);
            await message.reply(response);
        } catch (error) {
            console.error('Command error:', error);
            await message.reply('❌ An error occurred while processing your command.');
        }
        return;
    }
    
    // Handle admin commands
    if (adminCommands[content]) {
        try {
            const response = adminCommands[content](message);
            await message.reply(response);
        } catch (error) {
            console.error('Admin command error:', error);
            await message.reply('❌ An error occurred while processing your admin command.');
        }
        return;
    }
    
    // Handle commands with arguments
    const args = message.content.trim().split(/\s+/);
    const command = args[0].toLowerCase();
    
    if (command === '!tip') {
        const embed = new EmbedBuilder()
            .setColor('#F59E0B')
            .setTitle('💸 Tip Command')
            .setDescription('**Usage:** `!tip @user amount coin`\n**Example:** `!tip @friend 0.1 sol`')
            .addFields({ name: 'Available Coins', value: 'SOL, USDC, LTC, BTC, BCH', inline: false })
            .setFooter({ text: 'Feature in development - Coming soon!' });
        
        await message.reply({ embeds: [embed] });
    }
    
    else if (command === '!announce' && process.env.SUPER_ADMIN_USER_IDS?.includes(message.author.id)) {
        const announcement = args.slice(1).join(' ');
        if (!announcement) {
            return message.reply('❌ Please provide an announcement message.');
        }
        
        const embed = new EmbedBuilder()
            .setColor('#DC2626')
            .setTitle('📢 Global Announcement')
            .setDescription(announcement)
            .setFooter({ text: `From: ${message.author.tag}` })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
});

client.on('error', (error) => {
    console.error('Discord client error:', error);
});

client.on('warn', (warning) => {
    console.warn('Discord client warning:', warning);
});

// Login to Discord
client.login(process.env.BOT_TOKEN).catch(error => {
    console.error('Failed to login:', error);
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('🛑 Bot shutting down...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Bot shutting down...');
    client.destroy();
    process.exit(0);
});