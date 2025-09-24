const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const solanaService = require('./solana/solanaService');
require('dotenv').config();

// Initialize Discord bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Store user wallet mappings (in production, use database)
const userWallets = new Map();

// Helper function to get user wallet
function getUserWallet(userId) {
    if (!userWallets.has(userId)) {
        const wallet = solanaService.generateUserWallet(userId);
        userWallets.set(userId, wallet);
    }
    return userWallets.get(userId);
}

// Command handlers
const commands = [
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your Solana balance in the tip system'),
    
    new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Get instructions to deposit SOL')
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount of SOL to deposit')
                .setRequired(true)
                .setMinValue(0.001)),
    
    new SlashCommandBuilder()
        .setName('tip')
        .setDescription('Tip SOL to another user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to tip')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount of SOL to tip')
                .setRequired(true)
                .setMinValue(0.001)),
    
    new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Withdraw SOL to your wallet')
        .addStringOption(option =>
            option.setName('address')
                .setDescription('Your Solana wallet address')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount of SOL to withdraw')
                .setRequired(true)
                .setMinValue(0.001)),
    
    new SlashCommandBuilder()
        .setName('wallet')
        .setDescription('Get your deposit wallet address'),
    
    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View JustTheTip program statistics'),
];

// Bot ready event
client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} is online!`);
    
    // Initialize Solana connection
    const solanaReady = await solanaService.initializeSolana();
    if (solanaReady) {
        console.log('🔗 Solana integration ready!');
    } else {
        console.log('⚠️ Solana integration failed - running in demo mode');
    }
    
    // Register slash commands
    try {
        console.log('🔄 Registering application commands...');
        await client.application.commands.set(commands);
        console.log('✅ Successfully registered application commands');
    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
});

// Interaction handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    const { commandName, user } = interaction;
    
    try {
        switch (commandName) {
            case 'balance':
                await handleBalance(interaction);
                break;
            case 'deposit':
                await handleDeposit(interaction);
                break;
            case 'tip':
                await handleTip(interaction);
                break;
            case 'withdraw':
                await handleWithdraw(interaction);
                break;
            case 'wallet':
                await handleWallet(interaction);
                break;
            case 'stats':
                await handleStats(interaction);
                break;
            default:
                await interaction.reply('❌ Unknown command');
        }
    } catch (error) {
        console.error(`❌ Error handling ${commandName}:`, error);
        const errorMessage = '❌ An error occurred while processing your request.';
        
        if (interaction.deferred) {
            await interaction.editReply(errorMessage);
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

/**
 * Handle balance command
 */
async function handleBalance(interaction) {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    const result = await solanaService.getUserBalance(userId);
    
    if (!result.success) {
        // User doesn't exist on-chain yet
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('💰 Your Balance')
            .setDescription('You don\'t have an account yet! Use `/deposit` to get started.')
            .addFields(
                { name: '🟡 SOL Balance', value: '0.000 SOL', inline: true },
                { name: '📊 Total Tipped', value: '0.000 SOL', inline: true },
                { name: '📈 Total Received', value: '0.000 SOL', inline: true }
            )
            .setFooter({ text: 'JustTheTip • Powered by Solana' });
        
        await interaction.editReply({ embeds: [embed] });
        return;
    }
    
    const balance = result.balance;
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('💰 Your Balance')
        .addFields(
            { name: '🟡 SOL Balance', value: `${solanaService.lamportsToSol(balance.sol).toFixed(6)} SOL`, inline: true },
            { name: '📊 Total Tipped', value: `${solanaService.lamportsToSol(balance.totalTipped).toFixed(6)} SOL`, inline: true },
            { name: '📈 Total Received', value: `${solanaService.lamportsToSol(balance.totalReceived).toFixed(6)} SOL`, inline: true }
        )
        .setFooter({ text: 'JustTheTip • Powered by Solana' });
    
    await interaction.editReply({ embeds: [embed] });
}

/**
 * Handle deposit command
 */
async function handleDeposit(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const amount = interaction.options.getNumber('amount');
    const wallet = getUserWallet(interaction.user.id);
    
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('💳 Deposit SOL')
        .setDescription(`To deposit **${amount} SOL**, send it to your deposit address:`)
        .addFields(
            { name: '📍 Your Deposit Address', value: `\`${wallet.publicKey}\`` },
            { name: '💰 Amount', value: `${amount} SOL` },
            { name: '⚠️ Important', value: 'Only send SOL to this address. Tokens sent to wrong addresses will be lost!' }
        )
        .setFooter({ text: 'JustTheTip • Your funds are secured by smart contracts' });
    
    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`create_account_${interaction.user.id}`)
                .setLabel('Create Account')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🆕'),
            new ButtonBuilder()
                .setCustomId(`copy_address_${interaction.user.id}`)
                .setLabel('Copy Address')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋')
        );
    
    await interaction.editReply({ embeds: [embed], components: [buttons] });
}

/**
 * Handle tip command
 */
async function handleTip(interaction) {
    await interaction.deferReply();
    
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getNumber('amount');
    
    if (targetUser.id === interaction.user.id) {
        await interaction.editReply('❌ You cannot tip yourself!');
        return;
    }
    
    if (targetUser.bot) {
        await interaction.editReply('❌ You cannot tip bots!');
        return;
    }
    
    const fromWallet = getUserWallet(interaction.user.id);
    const result = await solanaService.tipSol(
        interaction.user.id,
        targetUser.id,
        amount,
        fromWallet.publicKey
    );
    
    if (!result.success) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Tip Failed')
            .setDescription(result.error)
            .setFooter({ text: 'JustTheTip • Make sure you have sufficient balance' });
        
        await interaction.editReply({ embeds: [embed] });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎉 Tip Sent!')
        .setDescription(`Successfully tipped **${amount} SOL** to ${targetUser}`)
        .addFields(
            { name: '👤 From', value: `${interaction.user}`, inline: true },
            { name: '👤 To', value: `${targetUser}`, inline: true },
            { name: '💰 Amount', value: `${amount} SOL`, inline: true },
            { name: '🔗 Transaction', value: `[View on Explorer](https://explorer.solana.com/tx/${result.transaction}?cluster=devnet)` }
        )
        .setFooter({ text: 'JustTheTip • Powered by Solana Smart Contracts' });
    
    await interaction.editReply({ embeds: [embed] });
}

/**
 * Handle withdraw command
 */
async function handleWithdraw(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const address = interaction.options.getString('address');
    const amount = interaction.options.getNumber('amount');
    
    // Validate Solana address format (basic check)
    if (address.length !== 44) {
        await interaction.editReply('❌ Invalid Solana address format!');
        return;
    }
    
    const userWallet = getUserWallet(interaction.user.id);
    const result = await solanaService.withdrawSol(
        interaction.user.id,
        amount,
        userWallet.publicKey
    );
    
    if (!result.success) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Withdrawal Failed')
            .setDescription(result.error)
            .setFooter({ text: 'JustTheTip • Check your balance and try again' });
        
        await interaction.editReply({ embeds: [embed] });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('💸 Withdrawal Successful!')
        .setDescription(`Successfully withdrew **${amount} SOL** to your wallet`)
        .addFields(
            { name: '📍 To Address', value: `\`${address}\`` },
            { name: '💰 Amount', value: `${amount} SOL` },
            { name: '🔗 Transaction', value: `[View on Explorer](https://explorer.solana.com/tx/${result.transaction}?cluster=devnet)` }
        )
        .setFooter({ text: 'JustTheTip • Your funds are secured by smart contracts' });
    
    await interaction.editReply({ embeds: [embed] });
}

/**
 * Handle wallet command
 */
async function handleWallet(interaction) {
    const wallet = getUserWallet(interaction.user.id);
    
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('👛 Your Wallet')
        .setDescription('Your unique deposit address for the JustTheTip system:')
        .addFields(
            { name: '📍 Deposit Address', value: `\`${wallet.publicKey}\`` },
            { name: '🔐 Security', value: 'This address is generated from your Discord ID and is always the same.' },
            { name: '⚠️ Important', value: 'Only send SOL to this address. Other tokens may be lost!' }
        )
        .setFooter({ text: 'JustTheTip • Powered by Solana Smart Contracts' });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Handle stats command
 */
async function handleStats(interaction) {
    await interaction.deferReply();
    
    const result = await solanaService.getProgramStats();
    
    if (!result.success) {
        await interaction.editReply('❌ Failed to fetch program statistics');
        return;
    }
    
    const stats = result.stats;
    const embed = new EmbedBuilder()
        .setColor(0x9945FF)
        .setTitle('📊 JustTheTip Statistics')
        .addFields(
            { name: '👥 Total Users', value: stats.totalUsers, inline: true },
            { name: '💰 Total Volume', value: `${solanaService.lamportsToSol(stats.totalVolume).toFixed(6)} SOL`, inline: true },
            { name: '💸 Fee Rate', value: `${(stats.feeRate / 100).toFixed(2)}%`, inline: true },
            { name: '🔧 Status', value: stats.paused ? '🔴 Paused' : '🟢 Active', inline: true },
            { name: '🏛️ Program ID', value: `\`${solanaService.PROGRAM_ID.toString()}\`` }
        )
        .setFooter({ text: 'JustTheTip • Powered by Solana Smart Contracts' });
    
    await interaction.editReply({ embeds: [embed] });
}

// Button interaction handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    const [action, userId] = interaction.customId.split('_');
    
    if (interaction.user.id !== userId) {
        await interaction.reply({ content: '❌ This button is not for you!', ephemeral: true });
        return;
    }
    
    if (action === 'create' && interaction.customId.includes('account')) {
        await interaction.deferReply({ ephemeral: true });
        
        const result = await solanaService.createUser(userId, getUserWallet(userId).publicKey);
        
        if (result.success) {
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎉 Account Created!')
                .setDescription('Your on-chain account has been created successfully!')
                .addFields(
                    { name: '📍 Account Address', value: `\`${result.userStatePDA}\`` },
                    { name: '🔗 Transaction', value: `[View on Explorer](https://explorer.solana.com/tx/${result.transaction}?cluster=devnet)` }
                )
                .setFooter({ text: 'JustTheTip • Welcome to decentralized tipping!' });
            
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply(`❌ Failed to create account: ${result.error}`);
        }
    }
    
    if (action === 'copy' && interaction.customId.includes('address')) {
        await interaction.reply({ content: '📋 Address copied to clipboard! (Use Ctrl+C/Cmd+C)', ephemeral: true });
    }
});

// Start the bot
client.login(process.env.BOT_TOKEN).catch(console.error);

module.exports = client;