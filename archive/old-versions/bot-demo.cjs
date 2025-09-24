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
    description: 'Send crypto to another user',
    options: [
      { name: 'user', type: 6, description: 'User to tip', required: true },
      { name: 'amount', type: 10, description: 'Amount to tip', required: true },
      { name: 'currency', type: 3, description: 'Currency (SOL, USDC, LTC)', required: true, choices: [
          { name: 'SOL', value: 'SOL' },
          { name: 'USDC', value: 'USDC' },
          { name: 'LTC', value: 'LTC' }
        ]
      }
    ]
  },
  {
    name: 'airdrop',
    description: 'Create airdrop with USD amounts (e.g. $5.00 worth of SOL)',
    options: [
      { name: 'amount', type: 10, description: 'Amount to airdrop', required: true },
      { name: 'currency', type: 3, description: 'Currency (SOL, USDC, LTC)', required: true, choices: [
          { name: 'SOL', value: 'SOL' },
          { name: 'USDC', value: 'USDC' },
          { name: 'LTC', value: 'LTC' }
        ]
      }
    ]
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

const HELP_MESSAGE = `**JustTheTip Bot Commands:**

**Essential Commands:**
• \`/tip @user amount currency\` — Send crypto to another user
• \`/balance\` — Check your portfolio with crypto amounts AND USD values 💎
• \`/deposit\` — Get instructions for adding funds

**Enhanced Features:**
• \`/airdrop amount currency\` — Create airdrop (e.g. 5.00 SOL)
• 🎁 **Collect Button** — Click buttons to collect from airdrops!
• 🔄 **Balance Refresh** — Update your portfolio view with one click
• \`/help\` — Show this help message

**Supported Cryptocurrencies:**
☀️ **SOL** (Solana) - Active
💚 **USDC** (USD Coin on Solana) - Active  
🚀 **LTC** (Litecoin) - Active

**Demo Mode:** This bot is running in demo mode for testing. Real transactions require database setup.`;

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
        .setFooter({ text: 'Click refresh to update' });
        
      const refreshButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('refresh_balance')
            .setLabel('🔄 Refresh')
            .setStyle(ButtonStyle.Primary)
        );
        
      await interaction.reply({ embeds: [embed], components: [refreshButton], ephemeral: true });
      
    } else if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('🤖 JustTheTip Helper Bot')
        .setColor(0x7289da)
        .setDescription(HELP_MESSAGE);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'airdrop') {
      const amount = interaction.options.getNumber('amount');
      const currency = interaction.options.getString('currency');
      
      if (isRateLimited(interaction.user.id, commandName)) {
        return await interaction.reply({ 
          content: '⏳ Rate limit exceeded. Please wait before using this command again.', 
          ephemeral: true 
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🎁 Airdrop Created!')
        .setDescription(`${interaction.user} is dropping **${amount} ${currency}**! Click to collect!\n\n*Demo mode: No real crypto transferred*`)
        .setColor(0x00ff99);
        
      const collectButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('collect_airdrop')
            .setLabel('🎁 Collect')
            .setStyle(ButtonStyle.Success)
        );
        
      const airdropId = `${Date.now()}_${interaction.user.id}`;
      airdrops[airdropId] = { 
        creator: interaction.user.id, 
        amount, 
        currency, 
        claimed: false 
      };
      
      await interaction.reply({ embeds: [embed], components: [collectButton] });
      
    } else if (commandName === 'tip') {
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getNumber('amount');
      const currency = interaction.options.getString('currency');
      
      const embed = new EmbedBuilder()
        .setTitle('💸 Tip Sent!')
        .setDescription(`**${amount} ${currency}** sent to ${user}!\n\n*Demo mode: No real crypto transferred*`)
        .setColor(0xe74c3c);
        
      await interaction.reply({ embeds: [embed] });
      
    } else if (commandName === 'deposit') {
      const embed = new EmbedBuilder()
        .setTitle('💰 How to Add Funds')
        .setDescription('**Demo Mode Instructions:**\n\nThis bot is currently in demo mode. To enable real cryptocurrency deposits:\n\n1. Set up a MongoDB database\n2. Add `MONGODB_URI` to your `.env` file\n3. Restart the bot\n\nFor testing, you can use the demo commands to see how the bot works!')
        .setColor(0xf39c12);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else {
      const embed = new EmbedBuilder()
        .setTitle('Command Received')
        .setDescription(`The \`/${commandName}\` command was executed. Full functionality available in production mode!`)
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
      .setTitle('🎉 Airdrop Collected!')
      .setDescription(`You collected **${airdrop.amount} ${airdrop.currency}**!\n\n*Demo mode: Balance not actually updated*`)
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
        '*Balance refreshed at ' + new Date().toLocaleTimeString() + '*')
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