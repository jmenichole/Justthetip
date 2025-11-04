/**
 * JustTheTip - Discord Bot for Cryptocurrency Tipping
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * 
 * This file is part of JustTheTip.
 * 
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * See LICENSE file in the project root for full license information.
 * 
 * SPDX-License-Identifier: MIT
 * 
 * This software may not be sold commercially without permission.
 */

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, REST, Routes } = require('discord.js');
require('dotenv-safe').config({ allowEmptyValues: true });
const db = require('./db/database');
const { handleLeaderboardCommand } = require('./src/commands/leaderboardCommand');
const { handleSwapCommand, handleSwapHelpButton } = require('./src/commands/swapCommand');
const fs = require('fs');

// Load fee wallet addresses (reserved for future use)
const feeWallets = require('./security/feeWallet.json');
// Fee rate (0.5%)
const FEE_RATE = 0.005;

// Reserved for future fee calculation feature
function calculateFee(amount) {
  return Math.max(Math.floor(amount * FEE_RATE * 1e8) / 1e8, 0); // 8 decimals
}

// Reserved for future fee wallet feature
function getFeeWallet(coin) {
  return feeWallets[coin.toUpperCase()] || null;
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', async () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);
  await db.connectDB();
  console.log('Database connected.');
});

// Register slash commands
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
      { name: 'currency', type: 3, description: 'Currency (SOL, USDC)', required: true, choices: [
          { name: 'SOL', value: 'SOL' },
          { name: 'USDC', value: 'USDC' }
        ]
      }
    ]
  },
  {
    name: 'airdrop',
    description: 'Create airdrop with USD amounts (e.g. $5.00 worth of SOL)',
    options: [
      { name: 'amount', type: 10, description: 'Amount to airdrop', required: true },
      { name: 'currency', type: 3, description: 'Currency (SOL, USDC)', required: true, choices: [
          { name: 'SOL', value: 'SOL' },
          { name: 'USDC', value: 'USDC' }
        ]
      }
    ]
  },
  {
    name: 'withdraw',
    description: 'Send crypto to external wallet',
    options: [
      { name: 'address', type: 3, description: 'External wallet address', required: true },
      { name: 'amount', type: 10, description: 'Amount to withdraw', required: true },
      { name: 'currency', type: 3, description: 'Currency (SOL, USDC)', required: true, choices: [
          { name: 'SOL', value: 'SOL' },
          { name: 'USDC', value: 'USDC' }
        ]
      }
    ]
  },
  {
    name: 'deposit',
    description: 'Get instructions for adding funds',
  },
  {
    name: 'registerwallet',
    description: 'Register your wallet addresses',
    options: [
      { name: 'currency', type: 3, description: 'Currency (SOL, USDC)', required: true, choices: [
        { name: 'SOL', value: 'SOL' },
        { name: 'USDC', value: 'USDC' }
      ]
      },
      { name: 'address', type: 3, description: 'Your wallet address', required: true }
    ]
  },
  {
    name: 'burn',
    description: 'Donate to support bot development',
    options: [
      { name: 'amount', type: 10, description: 'Amount to burn', required: true },
      { name: 'currency', type: 3, description: 'Currency (SOL, USDC)', required: true, choices: [
          { name: 'SOL', value: 'SOL' },
          { name: 'USDC', value: 'USDC' }
        ]
      }
    ]
  },
  {
    name: 'help',
    description: 'Complete command reference',
  },
  {
    name: 'leaderboard',
    description: 'View top tippers and recipients',
  },
  {
    name: 'swap',
    description: 'Swap tokens using Jupiter aggregator',
    options: [
      { name: 'from', type: 3, description: 'Token to swap from', required: true, choices: [
        { name: 'SOL', value: 'SOL' },
        { name: 'USDC', value: 'USDC' }
      ]},
      { name: 'to', type: 3, description: 'Token to swap to', required: true, choices: [
        { name: 'SOL', value: 'SOL' },
        { name: 'USDC', value: 'USDC' }
      ]},
      { name: 'amount', type: 10, description: 'Amount to swap', required: true }
    ]
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

// Reserved for future admin role checking feature
function isAdmin(member) {
  return member.roles.cache.some(role => role.name.toLowerCase() === 'admin');
}

const AIRDROP_FILE = './data/airdrops.json';
function saveAirdrops(airdrops) {
  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true });
  }
  fs.writeFileSync(AIRDROP_FILE, JSON.stringify(airdrops, null, 2));
}

function loadAirdrops() {
  try {
    return JSON.parse(fs.readFileSync(AIRDROP_FILE, 'utf8'));
  } catch {
    return {};
  }
}

const airdrops = loadAirdrops();

const rateLimits = {};
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
• \`/withdraw address amount currency\` — Send crypto to external wallet
• \`/registerwallet currency address\` — Register your wallet addresses
• \`/deposit\` — Get instructions for adding funds

**Enhanced Features:**
• \`/airdrop amount currency\` — Create airdrop with USD amounts (e.g. $5.00 worth of SOL)
• \`/leaderboard\` — View top tippers and recipients 🏆
• \`/swap from to amount\` — Convert tips between tokens via Jupiter 🔄
• 🎁 **Collect Button** — Click buttons to collect from airdrops!
• 🔄 **Balance Refresh** — Update your portfolio view with one click
• \`/burn amount currency\` — Donate to support bot development
• \`/help\` — Show this help message

**Supported Cryptocurrencies:**
☀️ **SOL** (Solana) - Active
💚 **USDC** (USD Coin on Solana) - Active

**Remember:** This bot handles real cryptocurrency. Always test with small amounts first!`;

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
  
  try {
    if (commandName === 'balance') {
      // Mock data - replace with actual db call using interaction.user.id
      
      const embed = new EmbedBuilder()
        .setTitle('💎 Your Portfolio Balance')
        .setColor(0x3498db)
        .setDescription('**Total Portfolio Value:** $0.00\n\n' +
          '☀️ **SOL:** 0.000000 (~$0.00)\n' +
          '💚 **USDC:** 0.000000 (~$0.00)')
        .setFooter({ text: 'Click refresh to update with current prices' });
        
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
      
    } else if (commandName === 'leaderboard') {
      await handleLeaderboardCommand(interaction, db);
      
    } else if (commandName === 'swap') {
      // Note: userWallets map would need to be implemented for full functionality
      // For now, use a Map as a placeholder
      const userWallets = new Map();
      await handleSwapCommand(interaction, userWallets);
      
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
        .setDescription(`${interaction.user} is dropping **${amount} ${currency}**! Click to collect!`)
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
      saveAirdrops(airdrops);
      
      await interaction.reply({ embeds: [embed], components: [collectButton] });
      
    } else {
      // Handle other commands with basic responses
      const embed = new EmbedBuilder()
        .setTitle('Command Received')
        .setDescription(`The \`/${commandName}\` command was executed. Full functionality coming soon!`)
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
    
    // Find unclaimed airdrop for collection
    const availableAirdrops = Object.entries(airdrops).filter(([_id, airdrop]) => !airdrop.claimed);
    
    if (availableAirdrops.length === 0) {
      return interaction.reply({ content: 'No airdrops available to collect.', ephemeral: true });
    }
    
    const [airdropId, airdrop] = availableAirdrops[0];
    airdrops[airdropId].claimed = true;
    airdrops[airdropId].claimedBy = userId;
    saveAirdrops(airdrops);
    
    const embed = new EmbedBuilder()
      .setTitle('🎉 Airdrop Collected!')
      .setDescription(`You collected **${airdrop.amount} ${airdrop.currency}**!`)
      .setColor(0xf1c40f);
      
    await interaction.reply({ embeds: [embed], ephemeral: true });
    
  } else if (interaction.customId === 'refresh_balance') {
    // Refresh balance display
    const embed = new EmbedBuilder()
      .setTitle('💎 Your Portfolio Balance')
      .setColor(0x3498db)
      .setDescription('**Total Portfolio Value:** $0.00\n\n' +
        '☀️ **SOL:** 0.000000 (~$0.00)\n' +
        '💚 **USDC:** 0.000000 (~$0.00)')
      .setFooter({ text: 'Balance updated with current prices' });
      
    await interaction.update({ embeds: [embed] });
    
  } else if (interaction.customId === 'swap_help') {
    await handleSwapHelpButton(interaction);
  }
});

// Register commands when ready
client.once('ready', async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);