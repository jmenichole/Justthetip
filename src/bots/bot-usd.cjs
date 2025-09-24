const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, REST, Routes } = require('discord.js');
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

// Mock crypto prices (in production, fetch from API)
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

// Mock database for demo mode
const db = {
  connectDB: async () => {
    if (process.env.MONGODB_URI) {
      try {
        // In a real implementation, connect to MongoDB here
        console.log('✅ Database connection attempted');
      } catch (error) {
        console.log('📄 Running in demo mode without database');
      }
    } else {
      console.log('📄 No database configured - running in demo mode');
    }
  },
  getBalances: async (userId) => ({ SOL: 0, USDC: 0, LTC: 0 })
};

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
    name: 'prices',
    description: 'Show current crypto prices',
  },
  {
    name: 'deposit',
    description: 'Get instructions for adding funds',
  },
  {
    name: 'help',
    description: 'Complete command reference',
  }
];

// Store airdrops in memory (in production, use database)
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

const HELP_MESSAGE = `**JustTheTip Bot Commands (USD-Based):**

**💰 All amounts are in USD value!**
• \`/tip @user 10.00 SOL\` — Send $10.00 worth of SOL to user
• \`/airdrop 5.00 USDC\` — Create $5.00 worth of USDC airdrop
• \`/balance\` — Check your portfolio with USD values

**💱 How it works:**
• Enter USD amount (e.g., \`10.00\` = $10.00)
• Choose crypto type (SOL, USDC, LTC)
• Bot converts USD → Crypto automatically

**Other Commands:**
• \`/prices\` — Current crypto prices
• \`/deposit\` — Funding instructions
• \`/help\` — This help message

**Example:**
\`/tip @friend 25.00 SOL\` = Send $25.00 worth of SOL (~0.178 SOL at current price)

**Demo Mode:** Safe testing - no real transactions`;

// Bot ready event
client.once('ready', async () => {
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
      const embed = new EmbedBuilder()
        .setTitle('💎 Your Portfolio Balance')
        .setColor(0x3498db)
        .setDescription('**Total Portfolio Value:** $0.00 (Demo Mode)\n\n' +
          '☀️ **SOL:** 0.000000 (~$0.00)\n' +
          '💚 **USDC:** 0.000000 (~$0.00)\n' +
          '🚀 **LTC:** 0.000000 (~$0.00)\n\n' +
          '*Connect a database for real balance tracking*')
        .setFooter({ text: 'Click refresh to update • Demo Mode' });
        
      const refreshButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('refresh_balance')
            .setLabel('🔄 Refresh')
            .setStyle(ButtonStyle.Primary)
        );
        
      await interaction.reply({ embeds: [embed], components: [refreshButton], ephemeral: true });
      
    } else if (commandName === 'prices') {
      const embed = new EmbedBuilder()
        .setTitle('💱 Current Crypto Prices')
        .setColor(0xf39c12)
        .setDescription(
          `☀️ **SOL:** $${CRYPTO_PRICES.SOL.toFixed(2)}\n` +
          `💚 **USDC:** $${CRYPTO_PRICES.USDC.toFixed(2)}\n` +
          `🚀 **LTC:** $${CRYPTO_PRICES.LTC.toFixed(2)}\n\n` +
          '*Demo prices - In production, fetched from live APIs*'
        )
        .setFooter({ text: 'Prices update every minute in production' });
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('🤖 JustTheTip Helper Bot (USD-Based)')
        .setColor(0x7289da)
        .setDescription(HELP_MESSAGE);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'airdrop') {
      const usdAmount = interaction.options.getNumber('usd_amount');
      const cryptoType = interaction.options.getString('crypto_type');
      
      if (isRateLimited(interaction.user.id, commandName)) {
        return await interaction.reply({ 
          content: '⏳ Rate limit exceeded. Please wait before using this command again.', 
          ephemeral: true 
        });
      }
      
      const conversion = convertUsdToCrypto(usdAmount, cryptoType);
      if (!conversion) {
        return await interaction.reply({ 
          content: '❌ Invalid crypto type selected.', 
          ephemeral: true 
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🎁 USD-Based Airdrop Created!')
        .setDescription(
          `${interaction.user} is dropping **$${usdAmount.toFixed(2)} worth of ${cryptoType}**!\n\n` +
          `💱 **Conversion:** $${usdAmount.toFixed(2)} → **${conversion.cryptoAmount} ${cryptoType}**\n` +
          `📊 **Price:** $${conversion.price.toFixed(2)} per ${cryptoType}\n\n` +
          `Click to collect!\n*Demo mode: No real crypto transferred*`
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
      
    } else if (commandName === 'tip') {
      const user = interaction.options.getUser('user');
      const usdAmount = interaction.options.getNumber('usd_amount');
      const cryptoType = interaction.options.getString('crypto_type');
      
      const conversion = convertUsdToCrypto(usdAmount, cryptoType);
      if (!conversion) {
        return await interaction.reply({ 
          content: '❌ Invalid crypto type selected.', 
          ephemeral: true 
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('💸 USD-Based Tip Sent!')
        .setDescription(
          `**$${usdAmount.toFixed(2)} worth of ${cryptoType}** sent to ${user}!\n\n` +
          `💱 **Conversion:** $${usdAmount.toFixed(2)} → **${conversion.cryptoAmount} ${cryptoType}**\n` +
          `📊 **Price:** $${conversion.price.toFixed(2)} per ${cryptoType}\n\n` +
          `*Demo mode: No real crypto transferred*`
        )
        .setColor(0xe74c3c);
        
      await interaction.reply({ embeds: [embed] });
      
    } else if (commandName === 'deposit') {
      const embed = new EmbedBuilder()
        .setTitle('💰 How to Add Funds (USD-Based)')
        .setDescription(
          '**Demo Mode Instructions:**\n\n' +
          'This bot is currently in demo mode. To enable real USD→crypto deposits:\n\n' +
          '1. Set up a MongoDB database\n' +
          '2. Add `MONGODB_URI` to your `.env` file\n' +
          '3. Restart the bot\n\n' +
          '**How USD conversion works:**\n' +
          '• You specify amounts in USD (e.g., $10.00)\n' +
          '• Bot converts to crypto at current prices\n' +
          '• Example: $50.00 → ~0.356 SOL at $140.50/SOL\n\n' +
          'For testing, you can use all the demo commands to see how USD conversion works!'
        )
        .setColor(0xf39c12);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else {
      const embed = new EmbedBuilder()
        .setTitle('Command Received')
        .setDescription(`The \`/${commandName}\` command was executed. Full USD-based functionality available in production mode!`)
        .setColor(0x95a5a6);
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
    airdrops[airdropId].claimed = true;
    airdrops[airdropId].claimedBy = userId;
    
    const embed = new EmbedBuilder()
      .setTitle('🎉 USD-Based Airdrop Collected!')
      .setDescription(
        `You collected **$${airdrop.usdAmount.toFixed(2)} worth of ${airdrop.cryptoType}**!\n\n` +
        `💱 **You received:** ${airdrop.cryptoAmount} ${airdrop.cryptoType}\n` +
        `📊 **Price:** $${airdrop.price.toFixed(2)} per ${airdrop.cryptoType}\n\n` +
        `*Demo mode: Balance not actually updated*`
      )
      .setColor(0xf1c40f);
      
    await interaction.reply({ embeds: [embed], ephemeral: true });
    
  } else if (interaction.customId === 'refresh_balance') {
    const embed = new EmbedBuilder()
      .setTitle('💎 Your Portfolio Balance')
      .setColor(0x3498db)
      .setDescription('**Total Portfolio Value:** $0.00 (Demo Mode)\n\n' +
        '☀️ **SOL:** 0.000000 (~$0.00)\n' +
        '💚 **USDC:** 0.000000 (~$0.00)\n' +
        '🚀 **LTC:** 0.000000 (~$0.00)\n\n' +
        `*Balance refreshed at ${new Date().toLocaleTimeString()}*`)
      .setFooter({ text: 'Demo mode - Connect database for real balances' });
      
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