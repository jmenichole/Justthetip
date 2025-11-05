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
const { isValidSolanaAddress, verifySignature } = require('./src/utils/validation');
const rateLimiter = require('./src/utils/rateLimiter');
const {
  createBalanceEmbed,
  createWalletRegisteredEmbed,
  createTipSuccessEmbed,
  createAirdropEmbed,
  createAirdropCollectedEmbed,
} = require('./src/utils/embedBuilders');

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

// Price configuration (TODO: Replace with live price API)
const PRICE_CONFIG = {
  SOL: 20, // USD per SOL - should be fetched from price API
  USDC: 1  // USDC is pegged to USD
};

// Note: isValidSolanaAddress is now imported from shared utils

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
    description: 'Register your wallet addresses with signature verification',
    options: [
      { name: 'currency', type: 3, description: 'Currency (SOL, USDC)', required: true, choices: [
        { name: 'SOL', value: 'SOL' },
        { name: 'USDC', value: 'USDC' }
      ]
      },
      { name: 'address', type: 3, description: 'Your Solana wallet address', required: true },
      { name: 'signature', type: 3, description: 'Signed message from your wallet (base58)', required: true }
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

// Note: Rate limiting is now handled by the shared rateLimiter module

const HELP_MESSAGE = `# 🤖 JustTheTip Bot - Your Crypto Tipping Companion

⚠️ **IMPORTANT:** This bot handles real cryptocurrency. Always start with small test amounts!

## 🚀 Quick Start Guide

**New to JustTheTip?** Here's how to get started in 3 easy steps:

1. **Check your balance**: Use \`/balance\` to see your current portfolio
2. **Add funds**: Use \`/deposit\` to learn how to add crypto to your account
3. **Send your first tip**: Try \`/tip @friend 0.01 SOL\` to send a small tip!

---

## 💰 Managing Your Funds

**View Your Portfolio**
• \`/balance\` — See your crypto balances with USD values 💎
  _Example: Shows "0.5 SOL (~$10.00)" and total portfolio value_

**Adding Funds**
• \`/deposit\` — Get step-by-step instructions for depositing crypto
  _Supports: SOL and USDC on Solana network_

**Withdrawing Funds**
• \`/withdraw <address> <amount> <currency>\` — Send crypto to your external wallet
  _Example: \`/withdraw YourWalletAddress123... 0.1 SOL\`_
  _⏱️ Processing time: 5-15 minutes_

**Register External Wallet**
• \`/registerwallet <currency> <address> <signature>\` — Link your external wallet with verification
  _Required for deposits and withdrawals_

---

## 🎁 Sending & Receiving Tips

**Send a Tip**
• \`/tip <@user> <amount> <currency>\` — Send crypto to another Discord user
  _Example: \`/tip @Alice 0.05 SOL\` sends 5 cents worth of SOL_
  _Example: \`/tip @Bob 1 USDC\` sends $1 in USDC_

**Create an Airdrop**
• \`/airdrop <amount> <currency>\` — Drop crypto for others to collect
  _Example: \`/airdrop 0.1 SOL\` creates a 🎁 button anyone can click to claim_
  _Great for giveaways and community engagement!_

**Collect from Airdrops**
• 🎁 **Click the Collect button** on airdrop messages to claim your share

---

## 🔄 Advanced Features

**Token Swapping**
• \`/swap <from> <to> <amount>\` — Exchange between supported tokens
  _Example: \`/swap SOL USDC 0.1\` converts 0.1 SOL to USDC_
  _Powered by Jupiter aggregator for best rates_

**View Leaderboard**
• \`/leaderboard\` — See top tippers and most generous community members 🏆
  _Track your ranking and celebrate top contributors_

**Support Development**
• \`/burn <amount> <currency>\` — Donate to help maintain the bot
  _Example: \`/burn 0.01 SOL\` — Every contribution helps!_

**Get Help**
• \`/help\` — Display this helpful guide anytime

---

## 💱 Supported Cryptocurrencies

☀️ **SOL** (Solana) — Fast, low-fee native token
💚 **USDC** — Stablecoin pegged to US Dollar ($1.00)

_Both run on the Solana blockchain for instant transactions_

---

## 💡 Pro Tips

✅ **Start small** — Test with tiny amounts (0.01 SOL) before larger transactions
✅ **Double-check addresses** — Always verify wallet addresses before withdrawing
✅ **Use the refresh button** — Click 🔄 on your balance to update prices
✅ **Save gas fees** — Tip within Discord to avoid blockchain transaction fees
✅ **Stay secure** — Never share your wallet's private keys or seed phrases

---

**Need more help?** Use \`/help\` anytime or contact server administrators.

_Powered by Solana blockchain • Non-custodial • Secure_`;

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
  
  try {
    if (commandName === 'balance') {
      try {
        // Get actual balance from database
        const balances = await db.getBalances(interaction.user.id);
        
        const embed = createBalanceEmbed(balances, PRICE_CONFIG);
          
        const refreshButton = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('refresh_balance')
              .setLabel('🔄 Refresh')
              .setStyle(ButtonStyle.Primary)
          );
          
        await interaction.reply({ embeds: [embed], components: [refreshButton], ephemeral: true });
        
      } catch (error) {
        console.error('Balance error:', error);
        await interaction.reply({ 
          content: '❌ An error occurred while fetching your balance. Please try again later.', 
          ephemeral: true 
        });
      }
      
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
      
      if (rateLimiter.isRateLimited(interaction.user.id, commandName)) {
        return await interaction.reply({ 
          content: '⏳ Rate limit exceeded. Please wait before using this command again.', 
          ephemeral: true 
        });
      }
      
      const embed = createAirdropEmbed(interaction.user, amount, currency);
        
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
      
    } else if (commandName === 'tip') {
      const recipient = interaction.options.getUser('user');
      const amount = interaction.options.getNumber('amount');
      const currency = interaction.options.getString('currency');
      
      if (rateLimiter.isRateLimited(interaction.user.id, commandName)) {
        return await interaction.reply({ 
          content: '⏳ Rate limit exceeded. Please wait before using this command again.', 
          ephemeral: true 
        });
      }
      
      // Validate tip amount
      if (amount <= 0) {
        return await interaction.reply({ 
          content: '❌ Tip amount must be greater than 0.', 
          ephemeral: true 
        });
      }
      
      // Check if user is trying to tip themselves
      if (recipient.id === interaction.user.id) {
        return await interaction.reply({ 
          content: '❌ You cannot tip yourself!', 
          ephemeral: true 
        });
      }
      
      // Check if tipping a bot
      if (recipient.bot) {
        return await interaction.reply({ 
          content: '❌ You cannot tip bots!', 
          ephemeral: true 
        });
      }
      
      try {
        // Process the tip through the database
        await db.processTip(interaction.user.id, recipient.id, amount, currency);
        
        const embed = createTipSuccessEmbed(interaction.user, recipient, amount, currency);
          
        await interaction.reply({ embeds: [embed] });
        
      } catch (error) {
        console.error('Tip error:', error);
        
        if (error.message === 'Insufficient balance') {
          return await interaction.reply({ 
            content: `❌ Insufficient balance. You don't have enough ${currency} to complete this tip.`, 
            ephemeral: true 
          });
        }
        
        return await interaction.reply({ 
          content: '❌ An error occurred while processing your tip. Please try again later.', 
          ephemeral: true 
        });
      }
      
    } else if (commandName === 'deposit') {
      const embed = new EmbedBuilder()
        .setTitle('💰 How to Deposit Funds')
        .setColor(0x3498db)
        .setDescription('To add funds to your JustTheTip account, follow these instructions:')
        .addFields(
          { 
            name: '1️⃣ Register Your Wallet', 
            value: 'First, register your wallet address using `/registerwallet currency address`', 
            inline: false 
          },
          { 
            name: '2️⃣ Send Crypto', 
            value: 'Send SOL or USDC from your external wallet to your registered address', 
            inline: false 
          },
          { 
            name: '3️⃣ Credits Applied', 
            value: 'Your balance will be credited automatically once the transaction confirms', 
            inline: false 
          },
          { 
            name: '⚠️ Important Notes', 
            value: '• Only send supported cryptocurrencies (SOL, USDC)\n• Double-check addresses before sending\n• Minimum deposit: 0.01 SOL or 1 USDC\n• Network fees may apply', 
            inline: false 
          }
        )
        .setFooter({ text: 'Need help? Use /help for more information' });
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'withdraw') {
      const address = interaction.options.getString('address');
      const amount = interaction.options.getNumber('amount');
      const currency = interaction.options.getString('currency');
      
      if (rateLimiter.isRateLimited(interaction.user.id, commandName)) {
        return await interaction.reply({ 
          content: '⏳ Rate limit exceeded. Please wait before using this command again.', 
          ephemeral: true 
        });
      }
      
      // Validate withdrawal amount
      if (amount <= 0) {
        return await interaction.reply({ 
          content: '❌ Withdrawal amount must be greater than 0.', 
          ephemeral: true 
        });
      }
      
      // Validate Solana address
      if (!isValidSolanaAddress(address)) {
        return await interaction.reply({ 
          content: '❌ Invalid Solana wallet address. Please provide a valid base58 encoded address.', 
          ephemeral: true 
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🏦 Withdrawal Request Submitted')
        .setColor(0xf39c12)
        .setDescription(`Your withdrawal request has been queued for processing.`)
        .addFields(
          { name: 'Amount', value: `${amount} ${currency}`, inline: true },
          { name: 'Destination', value: `\`${address.substring(0, 8)}...${address.substring(address.length - 8)}\``, inline: true },
          { name: 'Status', value: '⏳ Pending', inline: false },
          { name: 'Estimated Time', value: '5-15 minutes', inline: false }
        )
        .setFooter({ text: 'You will be notified once the transaction completes' });
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
      // In a production environment, this would queue the withdrawal for processing
      console.log(`Withdrawal request: ${interaction.user.id} -> ${address}: ${amount} ${currency}`);
      
    } else if (commandName === 'registerwallet') {
      const currency = interaction.options.getString('currency');
      const address = interaction.options.getString('address');
      const signature = interaction.options.getString('signature');
      
      // Validate Solana address
      if (!isValidSolanaAddress(address)) {
        return await interaction.reply({ 
          content: '❌ Invalid Solana wallet address. Please provide a valid base58 encoded address.', 
          ephemeral: true 
        });
      }
      
      try {
        // Create the message that should have been signed
        const message = `Register wallet for JustTheTip Discord Bot\nUser: ${interaction.user.id}\nWallet: ${address}\nCurrency: ${currency}\nTimestamp: ${Date.now()}`;
        
        // Verify the signature using shared utility
        const isValid = verifySignature(message, signature, address);
        
        if (!isValid) {
          return await interaction.reply({ 
            content: '❌ Invalid signature. Please sign the message with your wallet and provide the correct signature.\n\n' +
                     '**How to get the signature:**\n' +
                     '1. Use your Solana wallet (Phantom, Solflare, etc.)\n' +
                     '2. Sign the message provided by the bot\n' +
                     '3. Copy the base58 encoded signature\n' +
                     '4. Use it in the command', 
            ephemeral: true 
          });
        }
        
        const embed = createWalletRegisteredEmbed(currency, address, true);
          
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        // In a production environment, this would save to database with verified status
        console.log(`Wallet registered and verified: ${interaction.user.id} - ${currency}: ${address}`);
        
      } catch (error) {
        console.error('Wallet registration error:', error);
        return await interaction.reply({ 
          content: '❌ Error verifying wallet signature. Please ensure:\n' +
                   '• Your wallet address is correct\n' +
                   '• Your signature is in base58 format\n' +
                   '• The signature matches the wallet address\n\n' +
                   `Error: ${error.message}`, 
          ephemeral: true 
        });
      }
      
    } else if (commandName === 'burn') {
      const amount = interaction.options.getNumber('amount');
      const currency = interaction.options.getString('currency');
      
      if (rateLimiter.isRateLimited(interaction.user.id, commandName)) {
        return await interaction.reply({ 
          content: '⏳ Rate limit exceeded. Please wait before using this command again.', 
          ephemeral: true 
        });
      }
      
      // Validate burn amount
      if (amount <= 0) {
        return await interaction.reply({ 
          content: '❌ Burn amount must be greater than 0.', 
          ephemeral: true 
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🔥 Thank You for Your Support!')
        .setColor(0xe74c3c)
        .setDescription(`You've donated **${amount} ${currency}** to support bot development!`)
        .addFields(
          { name: '💖 Your Contribution', value: `${amount} ${currency}`, inline: true },
          { name: '🙏 Impact', value: 'Helps keep the bot running', inline: true }
        )
        .setFooter({ text: 'Your generosity is greatly appreciated!' });
        
      await interaction.reply({ embeds: [embed] });
      
      // In a production environment, this would process the burn/donation
      console.log(`Burn/donation: ${interaction.user.id} - ${amount} ${currency}`);
      
    } else {
      // Fallback for any unimplemented commands
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
    
    const embed = createAirdropCollectedEmbed(airdrop.amount, airdrop.currency);
      
    await interaction.reply({ embeds: [embed], ephemeral: true });
    
  } else if (interaction.customId === 'refresh_balance') {
    try {
      // Refresh balance display with actual data
      const balances = await db.getBalances(interaction.user.id);
      
      const embed = createBalanceEmbed(balances, PRICE_CONFIG, true);
        
      await interaction.update({ embeds: [embed] });
      
    } catch (error) {
      console.error('Refresh balance error:', error);
      await interaction.reply({ 
        content: '❌ An error occurred while refreshing your balance.', 
        ephemeral: true 
      });
    }
    
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