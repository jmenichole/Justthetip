const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db/database.cjs');

// Simple tip bot - NO CUSTODIAL FEATURES, just internal Discord tip balances
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Simple in-memory storage for airdrops (replace with database for persistence)
const airdrops = new Map();

// Pricing data for USD conversion (simplified - in production use real API)
const CRYPTO_PRICES = {
    'SOL': 140.50,
    'USDC': 1.00,
    'LTC': 65.30,
    'BTC': 58000,
    'BCH': 320.15
};

client.once('clientReady', () => console.log(`🟢 ${client.user.tag} is online! Simplified tip bot ready.`));

// Slash command definitions
const commands = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show bot help and commands'),
    
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your Discord tip balances'),
    
    new SlashCommandBuilder()
        .setName('registerwallet')
        .setDescription('Register your wallet address for receiving tips')
        .addStringOption(option => 
            option.setName('coin')
                .setDescription('Cryptocurrency type')
                .setRequired(true)
                .addChoices(
                    { name: 'Solana (SOL)', value: 'sol' },
                    { name: 'USDC', value: 'usdc' },
                    { name: 'Litecoin (LTC)', value: 'ltc' },
                    { name: 'Bitcoin Cash (BCH)', value: 'bch' }
                ))
        .addStringOption(option => 
            option.setName('address')
                .setDescription('Your wallet address')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('airdrop')
        .setDescription('Create an airdrop for others to collect')
        .addNumberOption(option => 
            option.setName('amount')
                .setDescription('Amount in USD to airdrop')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('coin')
                .setDescription('Cryptocurrency type')
                .setRequired(true)
                .addChoices(
                    { name: 'Solana (SOL)', value: 'sol' },
                    { name: 'USDC', value: 'usdc' },
                    { name: 'Litecoin (LTC)', value: 'ltc' },
                    { name: 'Bitcoin Cash (BCH)', value: 'bch' }
                ))
];

// Register slash commands on startup
async function registerCommands() {
    try {
        console.log('🔄 Registering slash commands...');
        await client.application.commands.set(commands);
        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error('❌ Error registering slash commands:', error);
    }
}

client.once('ready', registerCommands);

// Helper functions
function convertUsdToCrypto(usdAmount, coin) {
    const price = CRYPTO_PRICES[coin.toUpperCase()];
    return price ? (usdAmount / price) : 0;
}

function formatBalance(balances) {
    const coins = ['SOL', 'USDC', 'LTC', 'BCH'];
    let totalUsd = 0;
    let balanceLines = [];
    
    for (const coin of coins) {
        const balance = balances[coin] || 0;
        const usdValue = balance * (CRYPTO_PRICES[coin] || 0);
        totalUsd += usdValue;
        balanceLines.push(`**${coin}:** ${balance.toFixed(6)} (~$${usdValue.toFixed(2)})`);
    }
    
    return {
        lines: balanceLines,
        totalUsd: totalUsd
    };
}

// Slash command handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

    try {
        if (interaction.isChatInputCommand()) {
            const { commandName, options, user } = interaction;

            switch (commandName) {
                case 'help':
                    await handleHelp(interaction);
                    break;
                case 'balance':
                    await handleBalance(interaction, user);
                    break;
                case 'registerwallet':
                    const coin = options.getString('coin');
                    const address = options.getString('address');
                    await handleRegisterWallet(interaction, user, coin, address);
                    break;
                case 'airdrop':
                    const airdropAmount = options.getNumber('amount');
                    const airdropCoin = options.getString('coin');
                    await handleAirdrop(interaction, user, airdropAmount, airdropCoin);
                    break;
            }
        } else if (interaction.isButton()) {
            await handleButtonInteraction(interaction);
        }
    } catch (error) {
        console.error('❌ Interaction error:', error);
        const reply = { content: '❌ An error occurred while processing your request.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

async function handleHelp(interaction) {
    const helpEmbed = new EmbedBuilder()
        .setTitle('🎯 JustTheTip Bot - Simple Discord Tips')
        .setDescription('**This bot manages internal Discord tip balances only - NOT a crypto wallet!**')
        .addFields([
            {
                name: '💰 Commands',
                value: [
                    '`/balance` - Check your Discord tip balances',
                    '`/registerwallet` - Register wallet for receiving tips',
                    '`/airdrop` - Create dollar-based airdrops',
                ].join('\n'),
                inline: false
            },
            {
                name: '🔍 How It Works',
                value: [
                    '• Tip balances are internal to Discord (like Discord credits)',
                    '• Register your wallet to receive tips from other users', 
                    '• Airdrops give everyone a chance to collect crypto',
                    '• This is NOT a custodial wallet - just for fun tips!'
                ].join('\n'),
                inline: false
            },
            {
                name: '🪙 Supported Coins',
                value: 'SOL, USDC, LTC, BCH',
                inline: true
            }
        ])
        .setColor(0x00AE86)
        .setFooter({ text: 'JustTheTip Bot • Simple Discord tips, no custodial storage' });

    await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
}

async function handleBalance(interaction, user) {
    try {
        const balances = await db.getUserBalances(user.id);
        const formattedBalance = formatBalance(balances);
        
        const balanceEmbed = new EmbedBuilder()
            .setTitle('💰 Your Discord Tip Balances')
            .setColor(0x00AE86);
        
        if (formattedBalance.totalUsd > 0) {
            balanceEmbed
                .setDescription([
                    '**💡 These are internal Discord tip balances, not wallet balances!**',
                    '',
                    formattedBalance.lines.join('\n'),
                    '',
                    `**Portfolio Value:** ~$${formattedBalance.totalUsd.toFixed(2)} USD`
                ].join('\n'));
        } else {
            balanceEmbed.setDescription([
                '**You have no tip balance yet!**',
                '',
                'Ways to get started:',
                '• Collect from airdrops when available',
                '• Receive tips from other users (coming soon)',
                '• Ask friends to create airdrops!',
                '',
                'Remember: These are Discord tip balances, not real wallet balances.'
            ].join('\n'));
        }
        
        balanceEmbed.setFooter({ text: 'JustTheTip Bot • Internal Discord balances only' });
        
        await interaction.reply({ embeds: [balanceEmbed], ephemeral: true });
    } catch (error) {
        console.error('❌ Balance error:', error);
        await interaction.reply({ content: '❌ Could not retrieve balance. Please try again.', ephemeral: true });
    }
}

async function handleRegisterWallet(interaction, user, coin, address) {
    try {
        const success = await db.registerWallet(user.id, coin.toUpperCase(), address);
        
        if (success) {
            await interaction.reply({
                content: `✅ **${coin.toUpperCase()} wallet registered successfully!**\n\n` +
                        `**Address:** \`${address}\`\n\n` +
                        `📝 **Note:** This wallet is for receiving tips from other Discord users. ` +
                        `The bot doesn't hold your crypto - it just tracks internal tip balances.`,
                ephemeral: true
            });
        } else {
            await interaction.reply({ 
                content: '❌ Failed to register wallet. Please try again.', 
                ephemeral: true 
            });
        }
    } catch (error) {
        console.error('❌ Wallet registration error:', error);
        await interaction.reply({ 
            content: '❌ Error registering wallet. Please try again.', 
            ephemeral: true 
        });
    }
}

async function handleAirdrop(interaction, user, usdAmount, coin) {
    if (usdAmount <= 0 || usdAmount > 100) {
        await interaction.reply({ content: '❌ Airdrop amount must be between $0.01 and $100.', ephemeral: true });
        return;
    }
    
    try {
        const cryptoAmount = convertUsdToCrypto(usdAmount, coin);
        const userBalance = await db.getBalance(user.id, coin.toUpperCase());
        
        if (userBalance < cryptoAmount) {
            await interaction.reply({ 
                content: `❌ Insufficient ${coin.toUpperCase()} balance. You need ${cryptoAmount.toFixed(6)} ${coin.toUpperCase()} but have ${userBalance.toFixed(6)}.`, 
                ephemeral: true 
            });
            return;
        }
        
        // Create airdrop
        const airdropId = `airdrop_${Date.now()}_${user.id}`;
        airdrops.set(airdropId, {
            creator: user.id,
            coin: coin.toUpperCase(),
            amount: cryptoAmount,
            usdAmount: usdAmount,
            collected: new Set(),
            createdAt: Date.now()
        });
        
        // Deduct from creator's balance
        await db.updateBalance(user.id, coin.toUpperCase(), userBalance - cryptoAmount);
        await db.addHistory(user.id, {
            type: 'airdrop_create',
            coin: coin.toUpperCase(),
            amount: cryptoAmount,
            usdAmount: usdAmount
        });
        
        const airdropEmbed = new EmbedBuilder()
            .setTitle('🎁 Crypto Airdrop Created!')
            .setDescription([
                `**${user.displayName}** created a **$${usdAmount}** airdrop!`,
                '',
                `**Amount:** ${cryptoAmount.toFixed(6)} ${coin.toUpperCase()}`,
                `**USD Value:** ~$${usdAmount}`,
                '',
                '**Click the button below to collect your share!**'
            ].join('\n'))
            .setColor(0xFFD700)
            .setFooter({ text: 'JustTheTip Bot • Click to collect airdrop!' });
        
        const collectButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(airdropId)
                    .setLabel('💰 Collect Airdrop')
                    .setStyle(ButtonStyle.Success)
            );
        
        await interaction.reply({ 
            embeds: [airdropEmbed], 
            components: [collectButton]
        });
        
    } catch (error) {
        console.error('❌ Airdrop creation error:', error);
        await interaction.reply({ content: '❌ Failed to create airdrop. Please try again.', ephemeral: true });
    }
}

async function handleButtonInteraction(interaction) {
    const airdropId = interaction.customId;
    const airdrop = airdrops.get(airdropId);
    
    if (!airdrop) {
        await interaction.reply({ content: '❌ This airdrop is no longer available.', ephemeral: true });
        return;
    }
    
    if (airdrop.collected.has(interaction.user.id)) {
        await interaction.reply({ content: '❌ You have already collected from this airdrop.', ephemeral: true });
        return;
    }
    
    if (interaction.user.id === airdrop.creator) {
        await interaction.reply({ content: '❌ You cannot collect from your own airdrop.', ephemeral: true });
        return;
    }
    
    try {
        // Calculate individual collection amount (split evenly, max 10 collectors)
        const maxCollectors = Math.min(10, 20 - airdrop.collected.size);
        const individualAmount = airdrop.amount / maxCollectors;
        
        // Add to user's balance
        const currentBalance = await db.getBalance(interaction.user.id, airdrop.coin);
        await db.updateBalance(interaction.user.id, airdrop.coin, currentBalance + individualAmount);
        
        // Record collection
        airdrop.collected.add(interaction.user.id);
        await db.addHistory(interaction.user.id, {
            type: 'airdrop_collect',
            coin: airdrop.coin,
            amount: individualAmount,
            from: airdrop.creator
        });
        
        const usdValue = individualAmount * (CRYPTO_PRICES[airdrop.coin] || 0);
        
        await interaction.reply({
            content: `✅ **Airdrop collected!**\n\n` +
                    `**Received:** ${individualAmount.toFixed(6)} ${airdrop.coin}\n` +
                    `**USD Value:** ~$${usdValue.toFixed(2)}\n\n` +
                    `💰 Added to your Discord tip balance!`,
            ephemeral: true
        });
        
        // If all spots are taken, disable the button
        if (airdrop.collected.size >= maxCollectors) {
            const disabledButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(airdropId + '_disabled')
                        .setLabel('🔒 Airdrop Complete')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
            
            await interaction.message.edit({ components: [disabledButton] });
        }
        
    } catch (error) {
        console.error('❌ Airdrop collection error:', error);
        await interaction.reply({ content: '❌ Failed to collect airdrop. Please try again.', ephemeral: true });
    }
}

client.login(process.env.BOT_TOKEN);
