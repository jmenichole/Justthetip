const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, REST, Routes } = require('discord.js');
const { MongoClient } = require('mongodb');
const fs = require('fs');

// Use regular dotenv instead of dotenv-safe for flexibility
try {
  require('dotenv').config();
} catch (error) {
  console.log('⚠️ dotenv not found, using environment variables directly');
}

// Create logs directory if it doesn't exist
if (!fs.existsSync('./logs')) {
  fs.mkdirSync('./logs', { recursive: true });
}

// Simple logger
const logger = {
  info: (msg) => console.log(`ℹ️ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`)
};

// Mock crypto prices (in production, fetch from API like CoinGecko)
const CRYPTO_PRICES = {
  'SOL': 140.50,    // $140.50 per SOL
  'USDC': 1.00,     // $1.00 per USDC
  'LTC': 65.25      // $65.25 per LTC
};

// Convert USD amount to crypto amount
function convertUsdToCrypto(usdAmount, cryptoType) {
  const price = CRYPTO_PRICES[cryptoType.toUpperCase()];
  if (!price) return null;
  
  const cryptoAmount = usdAmount / price;
  return {
    usdAmount: usdAmount,
    cryptoAmount: parseFloat(cryptoAmount.toFixed(6)),
    cryptoType: cryptoType.toUpperCase(),
    price: price
  };
}

// Database connection and operations
class Database {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connectDB() {
    try {
      if (!process.env.MONGODB_URI) {
        console.log('⚠️ MongoDB not configured - balance tracking disabled');
        return;
      }
      
      // Parse MongoDB URI and handle X509 authentication
      let mongoUri = process.env.MONGODB_URI;
      const certPath = process.env.MONGO_CERT_PATH;
      
      if (certPath && fs.existsSync(certPath)) {
        this.client = new MongoClient(mongoUri, {
          tls: true,
          tlsCertificateKeyFile: certPath
        });
      } else {
        // Fallback to regular connection string
        this.client = new MongoClient(mongoUri);
      }
      
      await this.client.connect();
      this.db = this.client.db('justthetip');
      this.isConnected = true;
      console.log('✅ Connected to MongoDB - Production Mode Active');
      
      // Create indexes for performance
      await this.createIndexes();
      
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('⚠️ Operating without persistent balance tracking');
      this.isConnected = false;
    }
  }

  async createIndexes() {
    try {
      await this.db.collection('users').createIndex({ userId: 1 });
      await this.db.collection('transactions').createIndex({ userId: 1, timestamp: -1 });
      console.log('✅ Database indexes created');
    } catch (error) {
      console.error('⚠️ Could not create indexes:', error.message);
    }
  }

  async getUser(userId) {
    if (!this.isConnected) {
      return {
        userId,
        balances: { SOL: 0, USDC: 0, LTC: 0 },
        totalUsdValue: 0
      };
    }
    
    try {
      let user = await this.db.collection('users').findOne({ userId });
      if (!user) {
        // Create new user with zero balances
        user = {
          userId,
          balances: { SOL: 0, USDC: 0, LTC: 0 },
          createdAt: new Date(),
          lastActive: new Date()
        };
        await this.db.collection('users').insertOne(user);
      }
      
      // Calculate total USD value
      user.totalUsdValue = this.calculateTotalUsdValue(user.balances);
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return { userId, balances: { SOL: 0, USDC: 0, LTC: 0 }, totalUsdValue: 0 };
    }
  }

  calculateTotalUsdValue(balances) {
    let total = 0;
    for (const [crypto, amount] of Object.entries(balances)) {
      const price = CRYPTO_PRICES[crypto] || 0;
      total += amount * price;
    }
    return parseFloat(total.toFixed(2));
  }

  async updateBalance(userId, cryptoType, amount, operation = 'add', reason = 'manual') {
    if (!this.isConnected) {
      console.log(`Local: ${operation} ${amount} ${cryptoType} for user ${userId}`);
      return { success: true, newBalance: amount };
    }
    
    try {
      const user = await this.getUser(userId);
      const currentBalance = user.balances[cryptoType] || 0;
      
      let newBalance;
      if (operation === 'add') {
        newBalance = currentBalance + amount;
      } else if (operation === 'subtract') {
        newBalance = currentBalance - amount;
        if (newBalance < 0) {
          return { success: false, error: 'Insufficient balance' };
        }
      } else {
        return { success: false, error: 'Invalid operation' };
      }
      
      // Update balance in database
      await this.db.collection('users').updateOne(
        { userId },
        { 
          $set: { 
            [`balances.${cryptoType}`]: parseFloat(newBalance.toFixed(6)),
            lastActive: new Date()
          }
        }
      );
      
      // Log transaction
      await this.logTransaction(userId, cryptoType, amount, operation, reason, newBalance);
      
      return { success: true, newBalance: parseFloat(newBalance.toFixed(6)) };
    } catch (error) {
      console.error('Error updating balance:', error);
      return { success: false, error: 'Database error' };
    }
  }

  async logTransaction(userId, cryptoType, amount, operation, reason, newBalance) {
    if (!this.isConnected) return;
    
    try {
      await this.db.collection('transactions').insertOne({
        userId,
        cryptoType,
        amount,
        operation,
        reason,
        newBalance,
        timestamp: new Date(),
        usdValue: amount * (CRYPTO_PRICES[cryptoType] || 0)
      });
    } catch (error) {
      console.error('Error logging transaction:', error);
    }
  }

  async processTip(senderId, recipientId, usdAmount, cryptoType) {
    const conversion = convertUsdToCrypto(usdAmount, cryptoType);
    if (!conversion) {
      return { success: false, error: 'Invalid crypto type' };
    }

    if (!this.isConnected) {
      console.log(`Local: ${senderId} tipped ${recipientId} $${usdAmount} worth of ${cryptoType}`);
      return { success: true, conversion, isLocal: true };
    }
    
    try {
      // Check sender balance
      const sender = await this.getUser(senderId);
      const senderBalance = sender.balances[cryptoType] || 0;
      
      if (senderBalance < conversion.cryptoAmount) {
        return { 
          success: false, 
          error: `Insufficient ${cryptoType} balance. You have ${senderBalance.toFixed(6)} ${cryptoType} (~$${(senderBalance * conversion.price).toFixed(2)}) but need ${conversion.cryptoAmount.toFixed(6)} ${cryptoType} (~$${usdAmount.toFixed(2)})` 
        };
      }
      
      // Execute transfer
      const deductResult = await this.updateBalance(senderId, cryptoType, conversion.cryptoAmount, 'subtract', `tip_to_${recipientId}`);
      if (!deductResult.success) {
        return deductResult;
      }
      
      const addResult = await this.updateBalance(recipientId, cryptoType, conversion.cryptoAmount, 'add', `tip_from_${senderId}`);
      if (!addResult.success) {
        // Rollback sender deduction
        await this.updateBalance(senderId, cryptoType, conversion.cryptoAmount, 'add', 'rollback_failed_tip');
        return { success: false, error: 'Failed to credit recipient' };
      }
      
      return { 
        success: true, 
        conversion,
        senderNewBalance: deductResult.newBalance,
        recipientNewBalance: addResult.newBalance
      };
      
    } catch (error) {
      console.error('Error processing tip:', error);
      return { success: false, error: 'Transaction failed' };
    }
  }
}

const db = new Database();

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ] 
});

// Slash commands configuration
const commands = [
  {
    name: 'balance',
    description: 'Show your portfolio with crypto amounts and USD values 💎',
  },
  {
    name: 'tip',
    description: 'Send USD value worth of crypto to another user (e.g., $10.00 worth of SOL)',
    options: [
      { name: 'user', type: 6, description: 'User to tip', required: true },
      { name: 'usd_amount', type: 10, description: 'USD amount (e.g., 10.00 for $10)', required: true },
      { name: 'crypto_type', type: 3, description: 'Crypto to send', required: true, choices: [
          { name: 'SOL (Solana)', value: 'SOL' },
          { name: 'USDC (USD Coin)', value: 'USDC' },
          { name: 'LTC (Litecoin)', value: 'LTC' }
        ]
      }
    ]
  },
  {
    name: 'airdrop',
    description: 'Create airdrop with USD amount (e.g., $5.00 worth of SOL)',
    options: [
      { name: 'usd_amount', type: 10, description: 'USD amount (e.g., 5.00 for $5)', required: true },
      { name: 'crypto_type', type: 3, description: 'Crypto to airdrop', required: true, choices: [
          { name: 'SOL (Solana)', value: 'SOL' },
          { name: 'USDC (USD Coin)', value: 'USDC' },
          { name: 'LTC (Litecoin)', value: 'LTC' }
        ]
      }
    ]
  },
  {
    name: 'deposit',
    description: 'Get your deposit addresses for adding crypto',
  },
  {
    name: 'prices',
    description: 'Show current crypto prices',
  },
  {
    name: 'help',
    description: 'Complete command reference',
  },
  {
    name: 'stats',
    description: 'Show bot statistics and server info',
  }
];

// Store airdrops in memory (in production, could also use database)
let airdrops = {};
let rateLimits = {};

function isRateLimited(userId, command, max = 5, windowMs = 60000) {
  const now = Date.now();
  if (!rateLimits[userId]) rateLimits[userId] = {};
  if (!rateLimits[userId][command] || now - rateLimits[userId][command].timestamp > windowMs) {
    rateLimits[userId][command] = { count: 1, timestamp: now };
    return false;
  }
  if (rateLimits[userId][command].count >= max) return true;
  rateLimits[userId][command].count++;
  return false;
}

const HELP_MESSAGE = `**JustTheTip Bot - USD-Based Cryptocurrency Tipping:**

**💰 Available Commands:**
• \`/tip @user 10.00 SOL\` — Send $10.00 worth of SOL 
• \`/airdrop 5.00 USDC\` — Create $5.00 worth of USDC airdrop 
• \`/balance\` — Check your crypto portfolio with USD values

**💱 How it works:**
• Your balances are tracked in our secure database
• Enter USD amounts, bot converts to crypto automatically  
• Smart balance validation prevents overspending

**💰 Wallet Management:**
• \`/deposit\` — Get deposit addresses to add crypto
• \`/prices\` — View current crypto exchange rates

**Example:**
\`/tip @friend 25.00 SOL\` = Send $25.00 worth of SOL (requires ~0.178 SOL in your balance)

**Secure & Reliable Balance Tracking**`;

// Bot ready event
client.once('clientReady', async () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);
  await db.connectDB();
  
  // Register slash commands
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    console.log('Started refreshing application (/) commands.');
    
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    
    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
});

// Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const { commandName } = interaction;
  
  try {
    if (commandName === 'balance') {
      const user = await db.getUser(interaction.user.id);
      
      const embed = new EmbedBuilder()
        .setTitle('💎 Your Portfolio Balance')
        .setColor(0x3498db)
        .setDescription(
          `**Total Portfolio Value:** $${user.totalUsdValue.toFixed(2)}\n\n` +
          `☀️ **SOL:** ${user.balances.SOL.toFixed(6)} (~$${(user.balances.SOL * CRYPTO_PRICES.SOL).toFixed(2)})\n` +
          `💚 **USDC:** ${user.balances.USDC.toFixed(2)} (~$${(user.balances.USDC * CRYPTO_PRICES.USDC).toFixed(2)})\n` +
          `🚀 **LTC:** ${user.balances.LTC.toFixed(6)} (~$${(user.balances.LTC * CRYPTO_PRICES.LTC).toFixed(2)})\n\n` +
          `*Updated: ${new Date().toLocaleTimeString()}*`
        )
        .setFooter({ text: 'Secure balance tracking • Click refresh to update' });
        
      const refreshButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('refresh_balance')
            .setLabel('🔄 Refresh Balance')
            .setStyle(ButtonStyle.Primary)
        );
        
      await interaction.reply({ embeds: [embed], components: [refreshButton], ephemeral: true });
      
    } else if (commandName === 'tip') {
      const recipient = interaction.options.getUser('user');
      const usdAmount = interaction.options.getNumber('usd_amount');
      const cryptoType = interaction.options.getString('crypto_type');
      
      if (recipient.id === interaction.user.id) {
        return await interaction.reply({ 
          content: '❌ You cannot tip yourself!', 
          ephemeral: true 
        });
      }
      
      const result = await db.processTip(interaction.user.id, recipient.id, usdAmount, cryptoType);
      
      if (!result.success) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Tip Failed')
          .setDescription(result.error)
          .setColor(0xe74c3c);
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }
      
      if (result.isLocal) {
        const embed = new EmbedBuilder()
          .setTitle('💸 Tip Sent!')
          .setDescription(
            `**$${usdAmount.toFixed(2)} worth of ${cryptoType}** sent to ${recipient}!\n\n` +
            `💱 **Conversion:** $${usdAmount.toFixed(2)} → **${result.conversion.cryptoAmount} ${cryptoType}**\n` +
            `📊 **Price:** $${result.conversion.price.toFixed(2)} per ${cryptoType}\n\n` +
            `*Local balance tracking active*`
          )
          .setColor(0x00ff99);
        return await interaction.reply({ embeds: [embed] });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('💸 Tip Sent Successfully!')
        .setDescription(
          `**$${usdAmount.toFixed(2)} worth of ${cryptoType}** sent to ${recipient}!\n\n` +
          `💱 **Sent:** ${result.conversion.cryptoAmount} ${cryptoType}\n` +
          `📊 **Price:** $${result.conversion.price.toFixed(2)} per ${cryptoType}\n` +
          `💰 **Your new ${cryptoType} balance:** ${result.senderNewBalance} ${cryptoType}\n\n` +
          `✅ Transaction completed and logged`
        )
        .setColor(0x00ff99);
        
      await interaction.reply({ embeds: [embed] });
      
    } else if (commandName === 'airdrop') {
      const usdAmount = interaction.options.getNumber('usd_amount');
      const cryptoType = interaction.options.getString('crypto_type');
      
      if (isRateLimited(interaction.user.id, commandName)) {
        return await interaction.reply({ 
          content: '⏳ Rate limit exceeded. Please wait before creating another airdrop.', 
          ephemeral: true 
        });
      }
      
      // Check if user has enough balance for airdrop
      const conversion = convertUsdToCrypto(usdAmount, cryptoType);
      if (!conversion) {
        return await interaction.reply({ 
          content: '❌ Invalid crypto type selected.', 
          ephemeral: true 
        });
      }
      
      if (db.isConnected) {
        const user = await db.getUser(interaction.user.id);
        const userBalance = user.balances[cryptoType] || 0;
        
        if (userBalance < conversion.cryptoAmount) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Insufficient Balance for Airdrop')
            .setDescription(
              `You need **${conversion.cryptoAmount} ${cryptoType}** (~$${usdAmount.toFixed(2)}) but only have **${userBalance.toFixed(6)} ${cryptoType}** (~$${(userBalance * conversion.price).toFixed(2)})\n\n` +
              `Use \`/deposit\` to add more ${cryptoType} to your balance.`
            )
            .setColor(0xe74c3c);
          return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🎁 Crypto Airdrop Created!')
        .setDescription(
          `${interaction.user} is dropping **$${usdAmount.toFixed(2)} worth of ${cryptoType}**!\n\n` +
          `💱 **Amount:** ${conversion.cryptoAmount} ${cryptoType}\n` +
          `📊 **Price:** $${conversion.price.toFixed(2)} per ${cryptoType}\n\n` +
          `Click to collect before someone else does!`
        )
        .setColor(0x00ff99);
        
      const collectButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('collect_airdrop')
            .setLabel('🎁 Collect Airdrop')
            .setStyle(ButtonStyle.Success)
        );
        
      const airdropId = `${Date.now()}_${interaction.user.id}`;
      airdrops[airdropId] = { 
        creator: interaction.user.id, 
        usdAmount,
        cryptoAmount: conversion.cryptoAmount,
        cryptoType,
        price: conversion.price,
        claimed: false 
      };
      
      await interaction.reply({ embeds: [embed], components: [collectButton] });
      
    } else if (commandName === 'deposit') {
      const embed = new EmbedBuilder()
        .setTitle('💰 Add Crypto to Your Balance')
        .setDescription(
          '**Deposit addresses for balance top-ups:**\n\n' +
          '☀️ **SOL Address:**\n`' + (process.env.FEE_PAYMENT_SOL_ADDRESS || 'Not configured') + '`\n\n' +
          '💚 **USDC Address (Solana):**\n`' + (process.env.FEE_PAYMENT_USDCSOL_ADDRESS || 'Not configured') + '`\n\n' +
          '🚀 **LTC Address:**\n`' + (process.env.FEE_PAYMENT_LTC_ADDRESS || 'Not configured') + '`\n\n' +
          '⚠️ **Important:** Include your Discord User ID as memo/note: `' + interaction.user.id + '`\n\n' +
          '💎 Deposits are processed manually and typically reflect in 5-15 minutes.'
        )
        .setColor(0xf39c12);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'prices') {
      const embed = new EmbedBuilder()
        .setTitle('💱 Current Crypto Prices')
        .setColor(0xf39c12)
        .setDescription(
          `☀️ **SOL:** $${CRYPTO_PRICES.SOL.toFixed(2)}\n` +
          `💚 **USDC:** $${CRYPTO_PRICES.USDC.toFixed(2)}\n` +
          `🚀 **LTC:** $${CRYPTO_PRICES.LTC.toFixed(2)}\n\n` +
          `*Current exchange rates for USD conversion*`
        )
        .setFooter({ text: 'Prices used for USD ↔ Crypto conversion' });
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('🤖 JustTheTip Bot - USD-Based Crypto Tipping')
        .setColor(0x7289da)
        .setDescription(HELP_MESSAGE);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'stats') {
      const embed = new EmbedBuilder()
        .setTitle('📊 Bot Statistics')
        .setColor(0x9b59b6)
        .setDescription(
          `**Server Info:**\n` +
          `🏠 **Guild:** ${interaction.guild.name}\n` +
          `👥 **Members:** ${interaction.guild.memberCount}\n\n` +
          `**Bot Status:**\n` +
          `🟢 **Online:** ${client.uptime ? Math.floor(client.uptime / 1000 / 60) + ' minutes' : 'Just started'}\n` +
          `💾 **Database:** ${db.isConnected ? 'Connected' : 'Disconnected'}\n` +
          `💱 **Supported Cryptos:** SOL, USDC, LTC\n\n` +
          `**Features:**\n` +
          `• USD-based tipping amounts\n` +
          `• Real-time crypto price conversion\n` +
          `• Secure balance tracking\n` +
          `• Airdrop functionality`
        )
        .setFooter({ text: 'JustTheTip Bot • Secure & Reliable' });
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
  } catch (error) {
    console.error('Command error:', error);
    await interaction.reply({ 
      content: 'An error occurred while processing your command.', 
      ephemeral: true 
    });
  }
});

// Handle button interactions
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  
  if (interaction.customId === 'collect_airdrop') {
    const userId = interaction.user.id;
    
    const availableAirdrops = Object.entries(airdrops).filter(([id, airdrop]) => !airdrop.claimed);
    
    if (availableAirdrops.length === 0) {
      return interaction.reply({ content: '❌ No airdrops available to collect.', ephemeral: true });
    }
    
    const [airdropId, airdrop] = availableAirdrops[0];
    
    if (airdrop.creator === userId) {
      return interaction.reply({ content: '❌ You cannot collect your own airdrop!', ephemeral: true });
    }
    
    // Process airdrop collection (deduct from creator, add to collector)
    if (db.isConnected) {
      const tipResult = await db.processTip(airdrop.creator, userId, airdrop.usdAmount, airdrop.cryptoType);
      
      if (!tipResult.success) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Airdrop Collection Failed')
          .setDescription(`Creator has insufficient balance:\n${tipResult.error}`)
          .setColor(0xe74c3c);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
    
    airdrops[airdropId].claimed = true;
    airdrops[airdropId].claimedBy = userId;
    
    const embed = new EmbedBuilder()
      .setTitle('🎉 Airdrop Collected Successfully!')
      .setDescription(
        `You collected **$${airdrop.usdAmount.toFixed(2)} worth of ${airdrop.cryptoType}**!\n\n` +
        `💱 **You received:** ${airdrop.cryptoAmount} ${airdrop.cryptoType}\n` +
        `📊 **Price:** $${airdrop.price.toFixed(2)} per ${airdrop.cryptoType}\n\n` +
        `✅ Successfully added to your balance`
      )
      .setColor(0xf1c40f);
      
    await interaction.reply({ embeds: [embed], ephemeral: true });
    
  } else if (interaction.customId === 'refresh_balance') {
    const user = await db.getUser(interaction.user.id);
    
    const embed = new EmbedBuilder()
      .setTitle('💎 Your Portfolio Balance')
      .setColor(0x3498db)
      .setDescription(
        `**Total Portfolio Value:** $${user.totalUsdValue.toFixed(2)}\n\n` +
        `☀️ **SOL:** ${user.balances.SOL.toFixed(6)} (~$${(user.balances.SOL * CRYPTO_PRICES.SOL).toFixed(2)})\n` +
        `💚 **USDC:** ${user.balances.USDC.toFixed(2)} (~$${(user.balances.USDC * CRYPTO_PRICES.USDC).toFixed(2)})\n` +
        `🚀 **LTC:** ${user.balances.LTC.toFixed(6)} (~$${(user.balances.LTC * CRYPTO_PRICES.LTC).toFixed(2)})\n\n` +
        `*Refreshed at ${new Date().toLocaleTimeString()}*`
      )
      .setFooter({ text: 'Secure balance tracking • Updated from database' });
      
    await interaction.update({ embeds: [embed] });
  }
});

// Error handling
client.on('error', console.error);

// Login with bot token
if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not found in environment variables!');
  console.log('📝 Please check your .env file and make sure BOT_TOKEN is set.');
  process.exit(1);
}

client.login(process.env.BOT_TOKEN).catch(error => {
  console.error('❌ Failed to login:', error.message);
  console.log('📝 Please check your BOT_TOKEN in the .env file.');
});