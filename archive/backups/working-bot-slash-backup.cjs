require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./db/database.cjs');
const { getSolBalance, sendSol, getUsdcBalance, sendUsdc } = require('./chains/solana.js');
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
    console.error('Error reading fee wallet configuration:', error);
  }
  const envKey = `FEE_WALLET_${currency.toUpperCase()}`;
  return process.env[envKey] || null;
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Define slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your wallet balances'),
    
    new SlashCommandBuilder()
        .setName('tip')
        .setDescription('Tip another user cryptocurrency')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to tip')
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
        .setDescription('Withdraw cryptocurrency to external wallet')
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
                .setDescription('Cryptocurrency')
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
        .setDescription('Create an airdrop for others to collect')
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
        .setName('collect')
        .setDescription('Collect from available airdrops'),
    
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show bot commands and information')
];

// Register slash commands
async function deployCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    
    try {
        console.log('🔄 Refreshing slash commands...');
        
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands.map(command => command.toJSON()) }
        );
        
        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error('❌ Failed to register slash commands:', error);
    }
}

// In-memory airdrop state
const airdrops = {};

client.once('clientReady', async () => {
    console.log(`🟢 JustTheTip Bot logged in as ${client.user.tag}`);
    await deployCommands();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const { commandName, user } = interaction;
    
    try {
        switch (commandName) {
            case 'help':
                const helpEmbed = new EmbedBuilder()
                    .setColor('#9333EA')
                    .setTitle('🤏💸 JustTheTip Bot - Slash Commands')
                    .setDescription('**Available Commands:**')
                    .addFields(
                        { name: '/balance', value: 'Check your wallet balances', inline: true },
                        { name: '/tip', value: 'Tip another user crypto (0.5% fee)', inline: true },
                        { name: '/withdraw', value: 'Withdraw to external wallet (0.5% fee)', inline: true },
                        { name: '/registerwallet', value: 'Register your wallet address', inline: true },
                        { name: '/deposit', value: 'Get deposit instructions', inline: true },
                        { name: '/airdrop', value: 'Create an airdrop', inline: true },
                        { name: '/collect', value: 'Collect from airdrops', inline: true },
                        { name: '/help', value: 'Show this help message', inline: true }
                    )
                    .setFooter({ text: 'Supported: SOL, USDC, LTC, ETH, XRP, TRX | 0.5% fee applies' })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [helpEmbed] });
                break;
                
            case 'balance':
                const userId = user.id;
                const SUPPORTED_COINS = ['SOL', 'USDC', 'LTC', 'ETH', 'XRP', 'TRX'];
                
                const balances = await Promise.all(
                    SUPPORTED_COINS.map(async (coin) => {
                        const balance = await db.getBalance(userId, coin);
                        return { coin, balance: balance || 0 };
                    })
                );
                
                const balanceEmbed = new EmbedBuilder()
                    .setColor('#10B981')
                    .setTitle('💰 Your Wallet Balances')
                    .addFields(
                        { name: '🟡 Solana (SOL)', value: `${balances[0].balance} SOL`, inline: true },
                        { name: '🔵 USD Coin (USDC)', value: `${balances[1].balance} USDC`, inline: true },
                        { name: '🔶 Litecoin (LTC)', value: `${balances[2].balance} LTC`, inline: true },
                        { name: '🟠 Ethereum (ETH)', value: `${balances[3].balance} ETH`, inline: true },
                        { name: '🔷 XRP (XRP)', value: `${balances[4].balance} XRP`, inline: true },
                        { name: '🔴 TRON (TRX)', value: `${balances[5].balance} TRX`, inline: true }
                    )
                    .setFooter({ text: '💡 0.5% fee applies to tips and withdrawals' })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [balanceEmbed], ephemeral: true });
                break;
                
            case 'tip':
                const targetUser = interaction.options.getUser('user');
                const tipAmount = interaction.options.getNumber('amount');
                const tipCoin = interaction.options.getString('coin');
                
                if (targetUser.id === user.id) {
                    await interaction.reply({ content: "❌ You can't tip yourself!", ephemeral: true });
                    return;
                }
                
                if (tipAmount <= 0) {
                    await interaction.reply({ content: "❌ Tip amount must be positive!", ephemeral: true });
                    return;
                }
                
                // Calculate fee
                const tipFee = calculateFee(tipAmount);
                const totalTipRequired = tipAmount + tipFee;
                const senderBalance = await db.getBalance(user.id, tipCoin);
                
                if (senderBalance < totalTipRequired) {
                    await interaction.reply({ 
                        content: `❌ Insufficient ${tipCoin} balance. Need ${totalTipRequired} ${tipCoin} (${tipAmount} + ${tipFee} fee) but have ${senderBalance} ${tipCoin}.`,
                        ephemeral: true 
                    });
                    return;
                }
                
                // Check if recipient has registered wallet
                const recipientWallet = await db.getWallet(targetUser.id, tipCoin);
                if (!recipientWallet) {
                    await interaction.reply({ 
                        content: `❌ ${targetUser.username} hasn't registered a ${tipCoin} wallet yet.`,
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
                    await db.updateBalance(user.id, tipCoin, senderBalance - totalTipRequired);
                    const recipientBalance = await db.getBalance(targetUser.id, tipCoin);
                    await db.updateBalance(targetUser.id, tipCoin, recipientBalance + tipAmount);
                    
                    // Record history
                    await db.addHistory(user.id, { 
                        type: 'tip', 
                        to: targetUser.id, 
                        coin: tipCoin, 
                        amount: tipAmount, 
                        fee: tipFee, 
                        txid, 
                        date: new Date() 
                    });
                    await db.addHistory(targetUser.id, { 
                        type: 'receive', 
                        from: user.id, 
                        coin: tipCoin, 
                        amount: tipAmount, 
                        txid, 
                        date: new Date() 
                    });
                    
                    const successEmbed = new EmbedBuilder()
                        .setColor('#10B981')
                        .setTitle('✅ Tip Sent Successfully!')
                        .setDescription(`Sent **${tipAmount} ${tipCoin}** to ${targetUser}`)
                        .addFields(
                            { name: 'Amount', value: `${tipAmount} ${tipCoin}`, inline: true },
                            { name: 'Fee (0.5%)', value: `${tipFee} ${tipCoin}`, inline: true },
                            { name: 'Transaction', value: `[View on Explorer](${getExplorerLink(tipCoin, txid)})`, inline: true }
                        )
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [successEmbed] });
                    
                } catch (error) {
                    console.error('Tip error:', error);
                    await interaction.editReply(`❌ Transaction failed: ${error.message}`);
                }
                break;
                
            case 'registerwallet':
                const regCoin = interaction.options.getString('coin');
                const regAddress = interaction.options.getString('address');
                
                await db.registerWallet(user.id, regCoin, regAddress);
                
                const regEmbed = new EmbedBuilder()
                    .setColor('#10B981')
                    .setTitle('✅ Wallet Registered!')
                    .setDescription(`Successfully registered your ${regCoin} wallet address`)
                    .addFields(
                        { name: 'Cryptocurrency', value: regCoin, inline: true },
                        { name: 'Address', value: `\`${regAddress}\``, inline: false }
                    )
                    .setTimestamp();
                
                await interaction.reply({ embeds: [regEmbed], ephemeral: true });
                break;
                
            case 'deposit':
                const depositEmbed = new EmbedBuilder()
                    .setColor('#3B82F6')
                    .setTitle('📥 Deposit Instructions')
                    .setDescription('To deposit cryptocurrency into your JustTheTip wallet:')
                    .addFields(
                        { name: '1️⃣ Register Your Wallet', value: 'Use `/registerwallet` to add your wallet address for each coin', inline: false },
                        { name: '2️⃣ Send Crypto', value: 'Transfer from your external wallet to your registered address', inline: false },
                        { name: '3️⃣ Update Balance', value: 'Contact support to update your bot balance after deposit confirmation', inline: false }
                    )
                    .setFooter({ text: 'Supported: SOL, USDC, LTC, ETH, XRP, TRX' })
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
                airdrops[airdropCoin] = { 
                    creator: user.id, 
                    amount: airdropAmount, 
                    coin: airdropCoin, 
                    claimed: false 
                };
                
                await db.addHistory(user.id, { 
                    type: 'airdrop', 
                    coin: airdropCoin, 
                    amount: airdropAmount, 
                    date: new Date() 
                });
                
                const airdropEmbed = new EmbedBuilder()
                    .setColor('#F59E0B')
                    .setTitle('🎁 Airdrop Created!')
                    .setDescription(`**${airdropAmount} ${airdropCoin}** is up for grabs!`)
                    .addFields(
                        { name: 'Amount', value: `${airdropAmount} ${airdropCoin}`, inline: true },
                        { name: 'How to Collect', value: 'Use `/collect` command', inline: true }
                    )
                    .setFooter({ text: 'First come, first served!' })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [airdropEmbed] });
                break;
                
            case 'collect':
                let collected = false;
                let collectEmbed;
                
                for (const [coin, airdrop] of Object.entries(airdrops)) {
                    if (!airdrop.claimed) {
                        // Claim the airdrop
                        airdrop.claimed = true;
                        const collectorBalance = await db.getBalance(user.id, coin);
                        await db.updateBalance(user.id, coin, collectorBalance + airdrop.amount);
                        
                        await db.addHistory(user.id, { 
                            type: 'collect', 
                            coin: coin, 
                            amount: airdrop.amount, 
                            from: airdrop.creator, 
                            date: new Date() 
                        });
                        
                        collectEmbed = new EmbedBuilder()
                            .setColor('#10B981')
                            .setTitle('�� Airdrop Collected!')
                            .setDescription(`You collected **${airdrop.amount} ${coin}**!`)
                            .addFields(
                                { name: 'Amount', value: `${airdrop.amount} ${coin}`, inline: true },
                                { name: 'New Balance', value: `${collectorBalance + airdrop.amount} ${coin}`, inline: true }
                            )
                            .setTimestamp();
                        
                        collected = true;
                        break;
                    }
                }
                
                if (!collected) {
                    collectEmbed = new EmbedBuilder()
                        .setColor('#EF4444')
                        .setTitle('❌ No Airdrops Available')
                        .setDescription('There are no unclaimed airdrops right now.')
                        .setFooter({ text: 'Check back later or create one with /airdrop' })
                        .setTimestamp();
                }
                
                await interaction.reply({ embeds: [collectEmbed] });
                break;
                
            default:
                await interaction.reply({ content: '❌ Unknown command!', ephemeral: true });
        }
        
    } catch (error) {
        console.error(`Error executing ${commandName}:`, error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#EF4444')
            .setTitle('❌ Command Error')
            .setDescription('Something went wrong. Please try again later.')
            .setTimestamp();
        
        if (interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
});

function getExplorerLink(coin, txid) {
    switch (coin) {
        case 'SOL':
        case 'USDC':
            return `https://explorer.solana.com/tx/${txid}`;
        case 'LTC':
            return `https://live.blockcypher.com/ltc/tx/${txid}`;
        default:
            return '#';
    }
}

// Connect to database and start bot
(async () => {
    try {
        await db.connectToDatabase();
        console.log('✅ JustTheTip Bot: Database connection established');
        await client.login(process.env.BOT_TOKEN);
    } catch (error) {
        console.error('❌ JustTheTip Bot: Failed to start:', error);
        process.exit(1);
    }
})();
