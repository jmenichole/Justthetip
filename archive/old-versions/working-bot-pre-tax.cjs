require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./db/database.cjs');
const { getSolBalance, sendSol, getUsdcBalance, sendUsdc } = require('./chains/solana.cjs');
const { getLtcBalance, sendLtc } = require('./chains/litecoin.cjs');

// Fee system configuration
const FEE_RATE = 0.005; // 0.5% fee rate

function calculateFee(amount) {
  return parseFloat((amount * FEE_RATE).toFixed(8));
}

function getFeeWallet(currency) {
  try {
    const feeWalletPath = path.join(__dirname, 'security', 'feeWallet.json');
    if (fs.existsSync(feeWalletPath)) {
      const feeWallets = JSON.parse(fs.readFileSync(feeWalletPath, 'utf8'));
      return feeWallets[currency.toUpperCase()] || null;
    }
  } catch (error) {
    console.error('Error reading fee wallet config:', error);
  }
  return null;
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const commands = [
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your balance'),
    
    new SlashCommandBuilder()
        .setName('tip')
        .setDescription('Send cryptocurrency to another user (0.5% fee applies)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to tip')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount to tip')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('coin')
                .setDescription('Cryptocurrency to tip')
                .setRequired(true)
                .addChoices(
                    { name: 'Solana (SOL)', value: 'SOL' },
                    { name: 'USD Coin (USDC)', value: 'USDC' },
                    { name: 'Litecoin (LTC)', value: 'LTC' },
                    { name: 'Ethereum (ETH)', value: 'ETH' },
                    { name: 'XRP (XRP)', value: 'XRP' },
                    { name: 'TRON (TRX)', value: 'TRX' }
                )),
                
    new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Withdraw cryptocurrency to external wallet (0.5% fee applies)')
        .addStringOption(option =>
            option.setName('address')
                .setDescription('Wallet address to withdraw to')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount to withdraw')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('coin')
                .setDescription('Cryptocurrency to withdraw')
                .setRequired(true)
                .addChoices(
                    { name: 'Solana (SOL)', value: 'SOL' },
                    { name: 'USD Coin (USDC)', value: 'USDC' },
                    { name: 'Litecoin (LTC)', value: 'LTC' },
                    { name: 'Ethereum (ETH)', value: 'ETH' },
                    { name: 'XRP (XRP)', value: 'XRP' },
                    { name: 'TRON (TRX)', value: 'TRX' }
                )),
                
    new SlashCommandBuilder()
        .setName('registerwallet')
        .setDescription('Register your wallet address for a cryptocurrency')
        .addStringOption(option =>
            option.setName('coin')
                .setDescription('Cryptocurrency type')
                .setRequired(true)
                .addChoices(
                    { name: 'Solana (SOL)', value: 'SOL' },
                    { name: 'USD Coin (USDC)', value: 'USDC' },
                    { name: 'Litecoin (LTC)', value: 'LTC' },
                    { name: 'Ethereum (ETH)', value: 'ETH' },
                    { name: 'XRP (XRP)', value: 'XRP' },
                    { name: 'TRON (TRX)', value: 'TRX' }
                ))
        .addStringOption(option =>
            option.setName('address')
                .setDescription('Your wallet address')
                .setRequired(true)),
                
    new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Get deposit instructions'),
    
    new SlashCommandBuilder()
        .setName('airdrop')
        .setDescription('Create an airdrop for others to collect with buttons')
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount to airdrop')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('coin')
                .setDescription('Cryptocurrency to airdrop')
                .setRequired(true)
                .addChoices(
                    { name: 'Solana (SOL)', value: 'SOL' },
                    { name: 'USD Coin (USDC)', value: 'USDC' },
                    { name: 'Litecoin (LTC)', value: 'LTC' },
                    { name: 'Ethereum (ETH)', value: 'ETH' },
                    { name: 'XRP (XRP)', value: 'XRP' },
                    { name: 'TRON (TRX)', value: 'TRX' }
                )),
    
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show bot commands and information')
];

async function deployCommands() {
    try {
        const rest = new REST().setToken(process.env.BOT_TOKEN);
        console.log('🚀 Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Failed to register slash commands:', error);
    }
}

// Enhanced airdrop state with better tracking
const airdrops = new Map();

client.once('clientReady', async () => {
    console.log(`🟢 JustTheTip Bot logged in as ${client.user.tag}`);
    await deployCommands();
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand() && !interaction.isButton()) return;

    const user = interaction.user;

    // Handle button interactions for airdrop collection
    if (interaction.isButton()) {
        const [action, airdropId] = interaction.customId.split('_');
        
        if (action === 'collect') {
            const airdrop = airdrops.get(airdropId);
            
            if (!airdrop) {
                await interaction.reply({
                    content: '❌ This airdrop is no longer available.',
                    ephemeral: true
                });
                return;
            }
            
            if (airdrop.claimed) {
                await interaction.reply({
                    content: '❌ This airdrop has already been claimed.',
                    ephemeral: true
                });
                return;
            }
            
            if (airdrop.creator === user.id) {
                await interaction.reply({
                    content: '❌ You cannot collect your own airdrop.',
                    ephemeral: true
                });
                return;
            }
            
            // Claim the airdrop
            airdrop.claimed = true;
            airdrop.claimedBy = user.id;
            airdrop.claimedAt = new Date();
            
            const collectorBalance = await db.getBalance(user.id, airdrop.coin);
            await db.updateBalance(user.id, airdrop.coin, collectorBalance + airdrop.amount);
            
            await db.addHistory(user.id, {
                type: 'collect',
                coin: airdrop.coin,
                amount: airdrop.amount,
                from: airdrop.creator,
                date: airdrop.claimedAt
            });
            
            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor('#10B981')
                .setTitle('🎉 Airdrop Collected!')
                .setDescription(`**${user.displayName}** collected **${airdrop.amount} ${airdrop.coin}**!`)
                .addFields(
                    { name: 'Amount Collected', value: `${airdrop.amount} ${airdrop.coin}`, inline: true },
                    { name: 'Your New Balance', value: `${collectorBalance + airdrop.amount} ${airdrop.coin}`, inline: true },
                    { name: 'Claimed At', value: `<t:${Math.floor(airdrop.claimedAt.getTime() / 1000)}:R>`, inline: true }
                )
                .setTimestamp();
            
            // Create disabled button
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`collected_${airdropId}`)
                        .setLabel('Already Collected')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                        .setEmoji('✅')
                );
            
            // Update the original message
            try {
                await interaction.update({ embeds: [successEmbed], components: [disabledRow] });
            } catch (error) {
                await interaction.reply({ embeds: [successEmbed], ephemeral: true });
            }
            
            // Remove from active airdrops after 5 minutes
            setTimeout(() => {
                airdrops.delete(airdropId);
            }, 300000); // 5 minutes
            
            return;
        }
        return;
    }

    // Handle slash commands
    if (interaction.isCommand()) {
        switch (interaction.commandName) {
            case 'help':
                const helpEmbed = new EmbedBuilder()
                    .setColor('#3B82F6')
                    .setTitle('🤖 JustTheTip Bot Commands')
                    .setDescription('A non-custodial Discord crypto tipping bot')
                    .addFields(
                        { name: '/balance', value: 'Check your wallet balances', inline: true },
                        { name: '/tip', value: 'Tip another user crypto (0.5% fee)', inline: true },
                        { name: '/withdraw', value: 'Withdraw to external wallet (0.5% fee)', inline: true },
                        { name: '/registerwallet', value: 'Register your wallet address', inline: true },
                        { name: '/deposit', value: 'Get deposit instructions', inline: true },
                        { name: '/airdrop', value: 'Create an airdrop with collect button', inline: true },
                        { name: '/help', value: 'Show this help message', inline: true }
                    )
                    .setFooter({ text: 'Supported: SOL, USDC, LTC, ETH, XRP, TRX | 0.5% fee applies | Non-custodial service' })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
                break;

            case 'balance':
                try {
                    const solBalance = await getSolBalance();
                    const usdcBalance = await getUsdcBalance(); 
                    const ltcBalance = await getLtcBalance();
                    
                    const trackedSol = await db.getBalance(user.id, 'SOL');
                    const trackedUsdc = await db.getBalance(user.id, 'USDC');
                    const trackedLtc = await db.getBalance(user.id, 'LTC');
                    const trackedEth = await db.getBalance(user.id, 'ETH');
                    const trackedXrp = await db.getBalance(user.id, 'XRP');
                    const trackedTrx = await db.getBalance(user.id, 'TRX');
                    
                    const balanceEmbed = new EmbedBuilder()
                        .setColor('#10B981')
                        .setTitle('💰 Your Balances')
                        .addFields(
                            { name: '🟠 SOL', value: `${trackedSol.toFixed(6)} SOL`, inline: true },
                            { name: '🔵 USDC', value: `${trackedUsdc.toFixed(6)} USDC`, inline: true },
                            { name: '⚡ LTC', value: `${trackedLtc.toFixed(8)} LTC`, inline: true },
                            { name: '💎 ETH', value: `${trackedEth.toFixed(8)} ETH (Soon)`, inline: true },
                            { name: '🌊 XRP', value: `${trackedXrp.toFixed(6)} XRP (Soon)`, inline: true },
                            { name: '🔺 TRX', value: `${trackedTrx.toFixed(6)} TRX (Soon)`, inline: true }
                        )
                        .setFooter({ text: 'Balances are tracked for convenience. You control your own wallets.' })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [balanceEmbed], ephemeral: true });
                } catch (error) {
                    console.error('Balance check error:', error);
                    await interaction.reply({ content: '❌ Error checking balances.', ephemeral: true });
                }
                break;

            case 'tip':
                const recipient = interaction.options.getUser('user');
                const tipAmount = interaction.options.getNumber('amount');
                const tipCoin = interaction.options.getString('coin');
                
                if (recipient.id === user.id) {
                    await interaction.reply({ content: "❌ You can't tip yourself!", ephemeral: true });
                    return;
                }
                
                if (tipAmount <= 0) {
                    await interaction.reply({ content: "❌ Tip amount must be positive!", ephemeral: true });
                    return;
                }
                
                const tipperBalance = await db.getBalance(user.id, tipCoin);
                const tipFee = calculateFee(tipAmount);
                const totalRequired = tipAmount + tipFee;
                
                if (tipperBalance < totalRequired) {
                    await interaction.reply({
                        content: `❌ Insufficient ${tipCoin} balance. You need ${totalRequired.toFixed(8)} ${tipCoin} (${tipAmount.toFixed(8)} + ${tipFee.toFixed(8)} fee).`,
                        ephemeral: true
                    });
                    return;
                }
                
                const feeWallet = getFeeWallet(tipCoin);
                if (!feeWallet) {
                    await interaction.reply({
                        content: `❌ Fee collection not configured for ${tipCoin}. Contact admin.`,
                        ephemeral: true
                    });
                    return;
                }
                
                await interaction.deferReply();
                
                try {
                    const recipientWallet = await db.getWallet(recipient.id, tipCoin);
                    let txid = null;
                    let feeTxid = null;
                    
                    if (tipCoin === 'SOL') {
                        txid = await sendSol(recipientWallet, tipAmount);
                        if (tipFee > 0) {
                            try { feeTxid = await sendSol(feeWallet, tipFee); } catch(e) { console.warn('Fee collection failed:', e); }
                        }
                    } else if (tipCoin === 'USDC') {
                        txid = await sendUsdc(recipientWallet, tipAmount);
                        if (tipFee > 0) {
                            try { feeTxid = await sendUsdc(feeWallet, tipFee); } catch(e) { console.warn('Fee collection failed:', e); }
                        }
                    } else if (tipCoin === 'LTC') {
                        txid = await sendLtc(recipientWallet, tipAmount);
                        if (tipFee > 0) {
                            try { feeTxid = await sendLtc(feeWallet, tipFee); } catch(e) { console.warn('Fee collection failed:', e); }
                        }
                    } else {
                        await interaction.editReply(`⚠️ ${tipCoin} tipping not yet implemented. Currently supported: SOL, USDC, LTC`);
                        return;
                    }
                    
                    // Update balances
                    await db.updateBalance(user.id, tipCoin, tipperBalance - totalRequired);
                    const recipientBalance = await db.getBalance(recipient.id, tipCoin);
                    await db.updateBalance(recipient.id, tipCoin, recipientBalance + tipAmount);
                    
                    // Add to history
                    await db.addHistory(user.id, {
                        type: 'tip_sent',
                        coin: tipCoin,
                        amount: tipAmount,
                        fee: tipFee,
                        to: recipient.id,
                        txid: txid,
                        date: new Date()
                    });
                    
                    await db.addHistory(recipient.id, {
                        type: 'tip_received',
                        coin: tipCoin,
                        amount: tipAmount,
                        from: user.id,
                        txid: txid,
                        date: new Date()
                    });
                    
                    const tipEmbed = new EmbedBuilder()
                        .setColor('#10B981')
                        .setTitle('💸 Tip Sent!')
                        .setDescription(`**${user.displayName}** tipped **${recipient.displayName}** ${tipAmount} ${tipCoin}`)
                        .addFields(
                            { name: 'Amount', value: `${tipAmount} ${tipCoin}`, inline: true },
                            { name: 'Fee (0.5%)', value: `${tipFee.toFixed(8)} ${tipCoin}`, inline: true },
                            { name: 'Transaction', value: txid ? `[View on Explorer](https://explorer.solana.com/tx/${txid})` : 'Processing...', inline: true }
                        )
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [tipEmbed] });
                    
                } catch (error) {
                    console.error('Tip error:', error);
                    await interaction.editReply('❌ Failed to send tip. Please try again later.');
                }
                break;

            case 'withdraw':
                const withdrawAddress = interaction.options.getString('address');
                const withdrawAmount = interaction.options.getNumber('amount');
                const withdrawCoin = interaction.options.getString('coin');
                
                if (withdrawAmount <= 0) {
                    await interaction.reply({ content: "❌ Withdraw amount must be positive!", ephemeral: true });
                    return;
                }
                
                const userBalance = await db.getBalance(user.id, withdrawCoin);
                const withdrawFee = calculateFee(withdrawAmount);
                const totalWithdrawRequired = withdrawAmount + withdrawFee;
                
                if (userBalance < totalWithdrawRequired) {
                    await interaction.reply({
                        content: `❌ Insufficient ${withdrawCoin} balance. You need ${totalWithdrawRequired.toFixed(8)} ${withdrawCoin} (${withdrawAmount.toFixed(8)} + ${withdrawFee.toFixed(8)} fee).`,
                        ephemeral: true
                    });
                    return;
                }
                
                await interaction.deferReply({ ephemeral: true });
                
                try {
                    let txid = null;
                    let feeTxid = null;
                    const withdrawFeeWallet = getFeeWallet(withdrawCoin);
                    
                    if (withdrawCoin === 'SOL') {
                        txid = await sendSol(withdrawAddress, withdrawAmount);
                        if (withdrawFee > 0 && withdrawFeeWallet) {
                            try { feeTxid = await sendSol(withdrawFeeWallet, withdrawFee); } catch(e) { console.warn('Fee collection failed:', e); }
                        }
                    } else if (withdrawCoin === 'USDC') {
                        txid = await sendUsdc(withdrawAddress, withdrawAmount);
                        if (withdrawFee > 0 && withdrawFeeWallet) {
                            try { feeTxid = await sendUsdc(withdrawFeeWallet, withdrawFee); } catch(e) { console.warn('Fee collection failed:', e); }
                        }
                    } else if (withdrawCoin === 'LTC') {
                        txid = await sendLtc(withdrawAddress, withdrawAmount);
                        if (withdrawFee > 0 && withdrawFeeWallet) {
                            try { feeTxid = await sendLtc(withdrawFeeWallet, withdrawFee); } catch(e) { console.warn('Fee collection failed:', e); }
                        }
                    } else {
                        await interaction.editReply(`⚠️ ${withdrawCoin} withdrawals not yet implemented. Currently supported: SOL, USDC, LTC`);
                        return;
                    }
                    
                    await db.updateBalance(user.id, withdrawCoin, userBalance - totalWithdrawRequired);
                    
                    await db.addHistory(user.id, {
                        type: 'withdraw',
                        coin: withdrawCoin,
                        amount: withdrawAmount,
                        fee: withdrawFee,
                        to_address: withdrawAddress,
                        txid: txid,
                        date: new Date()
                    });
                    
                    const withdrawEmbed = new EmbedBuilder()
                        .setColor('#F59E0B')
                        .setTitle('💳 Withdrawal Sent!')
                        .addFields(
                            { name: 'Amount', value: `${withdrawAmount} ${withdrawCoin}`, inline: true },
                            { name: 'Fee (0.5%)', value: `${withdrawFee.toFixed(8)} ${withdrawCoin}`, inline: true },
                            { name: 'To Address', value: `\`${withdrawAddress.substring(0, 20)}...\``, inline: false },
                            { name: 'Transaction', value: txid ? `[View on Explorer](https://explorer.solana.com/tx/${txid})` : 'Processing...', inline: false }
                        )
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [withdrawEmbed] });
                    
                } catch (error) {
                    console.error('Withdraw error:', error);
                    await interaction.editReply('❌ Failed to process withdrawal. Please try again later.');
                }
                break;

            case 'registerwallet':
                const regCoin = interaction.options.getString('coin');
                const regAddress = interaction.options.getString('address');
                
                try {
                    await db.setWallet(user.id, regCoin, regAddress);
                    
                    const registerEmbed = new EmbedBuilder()
                        .setColor('#10B981')
                        .setTitle('✅ Wallet Registered!')
                        .addFields(
                            { name: 'Currency', value: regCoin, inline: true },
                            { name: 'Address', value: `\`${regAddress.substring(0, 20)}...\``, inline: true }
                        )
                        .setFooter({ text: 'Your wallet is now registered for tips and withdrawals' })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [registerEmbed], ephemeral: true });
                } catch (error) {
                    console.error('Register wallet error:', error);
                    await interaction.reply({ content: '❌ Failed to register wallet.', ephemeral: true });
                }
                break;

            case 'deposit':
                const depositEmbed = new EmbedBuilder()
                    .setColor('#3B82F6')
                    .setTitle('💰 Deposit Instructions')
                    .setDescription('To deposit cryptocurrency, you need to register your wallet addresses first.')
                    .addFields(
                        { name: '1️⃣ Register Wallet', value: 'Use `/registerwallet` command for each currency', inline: false },
                        { name: '2️⃣ Send to Your Wallet', value: 'Send crypto to your registered wallet addresses', inline: false },
                        { name: '3️⃣ Update Balance', value: 'Your balance will be tracked for tipping', inline: false }
                    )
                    .setFooter({ text: 'This bot is non-custodial - you control your own keys' })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [depositEmbed], ephemeral: true });
                break;
                
            case 'airdrop':
                const airdropAmount = interaction.options.getNumber('amount');
                const airdropCoin = interaction.options.getString('coin');
                
                if (airdropAmount <= 0) {
                    await interaction.reply({ content: "❌ Airdrop amount must be positive!", ephemeral: true });
                    return;
                }
                
                const creatorBalance = await db.getBalance(user.id, airdropCoin);
                if (creatorBalance < airdropAmount) {
                    await interaction.reply({
                        content: `❌ Insufficient ${airdropCoin} balance for airdrop.`,
                        ephemeral: true
                    });
                    return;
                }
                
                // Create airdrop (no fee for creating)
                await db.updateBalance(user.id, airdropCoin, creatorBalance - airdropAmount);
                
                // Generate unique airdrop ID
                const airdropId = `${Date.now()}_${user.id}`;
                
                const airdropData = {
                    id: airdropId,
                    creator: user.id,
                    amount: airdropAmount,
                    coin: airdropCoin,
                    claimed: false,
                    createdAt: new Date()
                };
                
                airdrops.set(airdropId, airdropData);
                
                await db.addHistory(user.id, {
                    type: 'airdrop_created',
                    coin: airdropCoin,
                    amount: airdropAmount,
                    airdrop_id: airdropId,
                    date: airdropData.createdAt
                });
                
                // Create collect button
                const collectButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`collect_${airdropId}`)
                            .setLabel(`Collect ${airdropAmount} ${airdropCoin}`)
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🎁')
                    );
                
                const airdropEmbed = new EmbedBuilder()
                    .setColor('#F59E0B')
                    .setTitle('🎁 Airdrop Created!')
                    .setDescription(`**${airdropAmount} ${airdropCoin}** is up for grabs!`)
                    .addFields(
                        { name: 'Amount', value: `${airdropAmount} ${airdropCoin}`, inline: true },
                        { name: 'Creator', value: `<@${user.id}>`, inline: true },
                        { name: 'How to Collect', value: 'Click the button below! 👇', inline: false }
                    )
                    .setFooter({ text: 'First come, first served! ⚡' })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [airdropEmbed], components: [collectButton] });
                
                // Auto-cleanup after 30 minutes if not claimed
                setTimeout(() => {
                    if (airdrops.has(airdropId) && !airdrops.get(airdropId).claimed) {
                        const expiredAirdrop = airdrops.get(airdropId);
                        airdrops.delete(airdropId);
                        
                        // Return funds to creator
                        db.updateBalance(expiredAirdrop.creator, expiredAirdrop.coin, 
                            creatorBalance - airdropAmount + expiredAirdrop.amount);
                        
                        console.log(`🕐 Airdrop ${airdropId} expired and funds returned to creator`);
                    }
                }, 1800000); // 30 minutes
                
                break;

            default:
                await interaction.reply({ content: '❌ Unknown command!', ephemeral: true });
        }
    }
});

client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
});

client.on('shardError', (error) => {
    console.error('❌ Discord shard error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

db.connectToDatabase().then(() => {
    console.log('✅ JustTheTip Bot: Database connection established');
    client.login(process.env.BOT_TOKEN);
}).catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
});
