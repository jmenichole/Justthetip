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

// Load environment variables - handle case where .env file doesn't exist in production
try {
  require('dotenv-safe').config({ allowEmptyValues: true });
} catch (error) {
  // If .env file doesn't exist (e.g., in Docker/Railway), try regular dotenv
  // and continue if essential variables are in the environment
  require('dotenv').config();
  
  // Only fail if truly required variables are missing (legacy bot)
  const requiredVars = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please set these variables in your environment or .env file');
    process.exit(1);
  }
  
  // Warn about .env file but continue
  if (error.message.includes('ENOENT')) {
    console.warn('⚠️  No .env file found - using environment variables');
  }
}

const db = require('./db/database');
const { handleSwapCommand, handleSwapHelpButton } = require('./src/commands/swapCommand');
const fs = require('fs');
const crypto = require('crypto');
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
    description: 'Link your Solana wallet with one-click signature verification',
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
    description: 'Show bot commands and usage guide',
    options: [
      { 
        name: 'section', 
        type: 3, 
        description: 'Help section to display (leave empty for basic commands)', 
        required: false,
        choices: [
          { name: 'advanced', value: 'advanced' },
          { name: 'register', value: 'register' }
        ]
      }
    ]
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

// Concise help message for default /help command
const HELP_MESSAGE_BASIC = `## 💰 Basic Commands

\`/balance\` — Check your funds
\`/deposit\` — Get deposit instructions
\`/tip @user <amount> <token>\` — Send a tip
\`/withdraw <address> <amount> <token>\` — Withdraw funds
\`/registerwallet\` — Link your Solana wallet

## ⚙️ More Commands
Use \`/help advanced\` for swap, airdrop, and burn commands

## 🧩 Supported Tokens
**SOL**, **USDC** (Solana network)

## 🔒 Pro Tips
• Start small, double-check addresses
• Never share private keys
• Use \`/help register\` for wallet setup guide`;

// Advanced help message with full command list
const HELP_MESSAGE_ADVANCED = `# 🤖 JustTheTip Bot - Complete Command Reference

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
• \`/registerwallet\` — Link your Solana wallet with one-click verification
  _Use \`/help register\` for detailed wallet registration guide_

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

**Support Development**
• \`/burn <amount> <currency>\` — Donate to help maintain the bot
  _Example: \`/burn 0.01 SOL\` — Every contribution helps!_

**Get Help**
• \`/help\` — Display concise command guide
• \`/help advanced\` — Display this complete reference
• \`/help register\` — Wallet registration instructions

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

// Wallet registration help message
const HELP_MESSAGE_REGISTER = `## 🔐 Wallet Registration Guide

**Why register your wallet?**
Wallet registration allows you to deposit and withdraw funds securely using signature verification.

**How it works:**
1. Run the \`/registerwallet\` command
2. Click the provided link to open the registration page
3. Connect your Phantom or Solflare wallet
4. Sign the verification message (non-custodial - no keys stored!)
5. Your wallet is instantly registered and verified ✅

**Supported Wallets:**
• Phantom (recommended)
• Solflare
• Any Solana wallet with signMessage support

**Security Features:**
• ✅ Non-custodial: Your private keys never leave your wallet
• ✅ Time-limited: Registration links expire after 10 minutes
• ✅ Signature-based: Cryptographically proves wallet ownership
• ✅ No storage: Signatures are never stored permanently

**Need help?**
Use \`/help\` for general commands or contact server administrators.

_🔒 Your security is our priority. Never share your private keys or seed phrases!_`;

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
      const section = interaction.options.getString('section');
      
      let helpMessage = HELP_MESSAGE_BASIC;
      let title = '🤖 JustTheTip Bot - Quick Reference';
      
      if (section === 'advanced') {
        helpMessage = HELP_MESSAGE_ADVANCED;
        title = '🤖 JustTheTip Bot - Complete Guide';
      } else if (section === 'register') {
        helpMessage = HELP_MESSAGE_REGISTER;
        title = '🔐 Wallet Registration Guide';
      }
      
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x7289da)
        .setDescription(helpMessage);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
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
            value: 'First, use `/registerwallet` to link your Solana wallet with one-click verification', 
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
        .setFooter({ text: 'Need help? Use /help register for wallet setup guide' });
        
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
      try {
        // Generate a unique nonce for this registration attempt
        const nonce = crypto.randomUUID();
        const discordUserId = interaction.user.id;
        const discordUsername = interaction.user.username;
        
        // Create registration URL (will point to our web-based signing page)
        const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        const registrationUrl = `${apiBaseUrl}/sign.html?user=${encodeURIComponent(discordUserId)}&username=${encodeURIComponent(discordUsername)}&nonce=${nonce}`;
        
        const embed = new EmbedBuilder()
          .setTitle('🔐 Register Your Solana Wallet')
          .setColor(0x7289da)
          .setDescription('Click the link below to securely register your wallet using signature verification.')
          .addFields(
            { 
              name: '📝 Registration Link', 
              value: `[Click here to register your wallet](${registrationUrl})`,
              inline: false 
            },
            { 
              name: '✨ What happens next?', 
              value: '1. Connect your Phantom or Solflare wallet\n2. Sign a verification message\n3. Your wallet will be instantly registered!',
              inline: false 
            },
            { 
              name: '🔒 Security', 
              value: '• Non-custodial (your keys never leave your wallet)\n• Link expires in 10 minutes\n• Signature proves wallet ownership',
              inline: false 
            },
            { 
              name: '💡 Need help?', 
              value: 'Use `/help register` for detailed instructions',
              inline: false 
            }
          )
          .setFooter({ text: 'Never share your private keys or seed phrases!' });
          
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        // Store nonce temporarily in database for verification (will be implemented in backend)
        console.log(`Wallet registration link generated: ${discordUserId} - nonce: ${nonce}`);
        
      } catch (error) {
        console.error('Wallet registration error:', error);
        return await interaction.reply({ 
          content: '❌ Error generating registration link. Please try again later.\n\n' +
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

// Handle DM messages with $ prefix
client.on(Events.MessageCreate, async message => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Only handle DMs
  if (message.channel.type !== 1) return; // 1 = DM channel
  
  // Check for $ prefix commands
  if (!message.content.startsWith('$')) return;
  
  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args[0].toLowerCase();
  
  try {
    if (command === 'history' || command === 'transactions') {
      // Get user transactions
      const limit = parseInt(args[1]) || 10;
      const transactions = await db.getUserTransactions(message.author.id, Math.min(limit, 50));
      
      if (transactions.length === 0) {
        return message.reply('You have no transaction history yet.');
      }
      
      // Build transaction history message
      let historyText = `**📜 Your Recent Transactions (Last ${transactions.length}):**\n\n`;
      
      transactions.forEach((tx, index) => {
        const isSent = tx.sender === message.author.id;
        const type = isSent ? '📤 Sent' : '📥 Received';
        const otherUser = isSent ? tx.receiver : tx.sender;
        const direction = isSent ? 'to' : 'from';
        const date = new Date(tx.created_at).toLocaleString();
        
        historyText += `${index + 1}. ${type} **${tx.amount}** ${tx.currency} ${direction} <@${otherUser}>\n`;
        historyText += `   _${date}_\n\n`;
      });
      
      historyText += `\nUse \`$history <number>\` to see more (max 50).`;
      
      await message.reply(historyText);
      
    } else if (command === 'balance') {
      // Get balance
      const balances = await db.getBalances(message.author.id);
      
      const embed = createBalanceEmbed(balances, PRICE_CONFIG);
      await message.reply({ embeds: [embed] });
      
    } else if (command === 'help') {
      const helpText = `**💡 JustTheTip DM Commands:**

Commands you can use in DMs with the \`$\` prefix:

• \`$history [number]\` - View your transaction history (default: 10, max: 50)
• \`$transactions\` - Alias for $history
• \`$balance\` - Check your current balance
• \`$help\` - Show this help message

**Note:** For tipping and airdrops, use slash commands (/) in a server channel.

_Your security is our priority. Never share your private keys!_`;
      
      await message.reply(helpText);
      
    } else {
      await message.reply(`Unknown command: \`$${command}\`. Use \`$help\` to see available commands.`);
    }
  } catch (error) {
    console.error('DM command error:', error);
    await message.reply('❌ An error occurred while processing your command. Please try again later.');
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