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

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, REST, Routes, ChannelType } = require('discord.js');

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
const { handleTipCommand } = require('./src/commands/tipCommand');
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
    name: 'register-wallet',
    description: 'Register your wallet with signature verification (trustless)',
  },
  {
    name: 'balance',
    description: 'Show your portfolio with crypto amounts and USD values 💎',
  },
  {
    name: 'tip',
    description: 'Send SOL to another user',
    options: [
      { name: 'user', type: 6, description: 'User to tip', required: true },
      { name: 'amount', type: 10, description: 'Amount in SOL to tip', required: true }
    ]
  },
  {
    name: 'help',
    description: 'Show bot commands and usage guide',
  },
  {
    name: 'support',
    description: 'Get help or report an issue',
    options: [
      { name: 'issue', type: 3, description: 'Describe your problem or question', required: true }
    ]
  },
  {
    name: 'verify',
    description: 'Complete verification and get your verification badge',
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

**🚀 Getting Started:**
1️⃣ \`/register-wallet\` — Register your wallet with signature verification (trustless & secure)

2️⃣ \`/verify\` — Check your wallet registration and verification status

**💸 Using the Bot:**
\`/balance\` — Check your funds
\`/tip @user <amount>\` — Send SOL to a user
\`/support <issue>\` — Get help or report an issue

## 🔒 Pro Tips
• Use \`/register-wallet\` for cryptographic proof of ownership (trustless)
• Use \`/verify\` anytime to check your status
• Start small, double-check addresses
• Never share private keys`;

// Advanced help message with full command list - kept for backwards compatibility
const HELP_MESSAGE_ADVANCED = `# 🤖 JustTheTip Bot - Complete Command Reference

⚠️ **IMPORTANT:** This bot handles real cryptocurrency. Always start with small test amounts!

## 🚀 Quick Start Guide

**New to JustTheTip?** Here's how to get started:

**Step 1 - Register Your Wallet:**
• Use \`/register-wallet\` for trustless verification with cryptographic signature proof
• Your keys never leave your wallet - fully non-custodial

**Step 2 - Verify Your Setup:**
• Use \`/verify\` to check your wallet registration status and verification level

**Step 3 - Start Using the Bot:**
• Use \`/balance\` to see your current portfolio
• Try \`/tip @friend 0.01\` to send a small tip in SOL!

---

## 💰 Available Commands

**Wallet Management**
• \`/register-wallet\` — Trustless registration with cryptographic signature (secure & recommended)
• \`/verify\` — Check wallet registration status and verification level

**View Your Portfolio**
• \`/balance\` — See your crypto balances with USD values 💎
  _Example: Shows "0.5 SOL (~$75.00)" and total portfolio value_

**Send Tips**
• \`/tip <@user> <amount>\` — Send SOL to another Discord user
  _Example: \`/tip @Alice 0.05\` sends 0.05 SOL_

**Get Help**
• \`/help\` — Display concise command guide
• \`/support <issue>\` — Get help or report an issue

---

## 💱 Supported Cryptocurrency

☀️ **SOL** (Solana) — Fast, low-fee native token

_All transactions run on the Solana blockchain for instant processing_

---

## 💡 Pro Tips

✅ **Start small** — Test with tiny amounts (0.01 SOL) before larger transactions
✅ **Double-check addresses** — Always verify wallet addresses carefully
✅ **Use the refresh button** — Click 🔄 on your balance to update prices
✅ **Stay secure** — Never share your wallet's private keys or seed phrases
✅ **Trustless** — This bot never has access to your private keys

---

**Need more help?** Use \`/support\` or contact server administrators.

_Powered by Solana blockchain • Non-custodial • Trustless • Secure_`;

// Wallet registration help message
const HELP_MESSAGE_REGISTER = `## 🔐 Wallet Registration Guide

**Why register your wallet?**
Wallet registration allows you to securely link your Solana wallet to your Discord account.

**How it works:**
1. Run the \`/register-wallet\` command for web-based verification
2. Click the provided link to open the registration page
3. Connect your Phantom or Solflare wallet
4. Sign the verification message (non-custodial - no keys stored!)
5. Your wallet is instantly registered and verified ✅

**Alternative: Smart Contract Registration**
Use \`/connect-wallet <address>\` to register your wallet address directly for on-chain operations.

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
Use \`/support <issue>\` to get assistance or contact server administrators.

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
      if (rateLimiter.isRateLimited(interaction.user.id, commandName)) {
        return await interaction.reply({
          content: '⏳ Rate limit exceeded. Please wait before using this command again.',
          ephemeral: true
        });
      }

      if (interaction.options.getUser('user').bot) {
        return await interaction.reply({
          content: '🤖 Tips are for humans only. Bots work for free!',
          ephemeral: true
        });
      }

      await handleTipCommand(interaction);
      
    } else if (commandName === 'register-wallet') {
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
      
    } else if (commandName === 'verify') {
      try {
        // Check if user has a wallet registered
        const sqlite = require('./db/db.js');
        const dbUser = sqlite.getUser(interaction.user.id);
        
        const hasWallet = dbUser && dbUser.wallet;
        const trustBadge = await db.getTrustBadge(interaction.user.id);
        
        if (!hasWallet && !trustBadge) {
          const embed = new EmbedBuilder()
            .setTitle('❌ No Wallet Registered')
            .setColor(0xff0000)
            .setDescription('You need to register your wallet for trustless verification.')
            .addFields(
              { 
                name: '🚀 Getting Started', 
                value: '**Step 1:** Use `/register-wallet` to register with signature verification\n\n**Step 2:** Use `/verify` to check your verification status',
                inline: false 
              },
              { 
                name: '🔐 Why Signature Verification?', 
                value: '• **Trustless** - Cryptographic proof of wallet ownership\n• **Secure** - Your keys never leave your wallet\n• **Non-custodial** - You maintain full control',
                inline: false 
              }
            )
            .setFooter({ text: 'JustTheTip: A trustless Solana agent for Discord' });
          
          return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        // User has a wallet, show verification status
        const isVerified = trustBadge !== null;
        const reputationScore = trustBadge ? trustBadge.reputation_score : (dbUser.reputation_score || 0);
        
        const embed = new EmbedBuilder()
          .setTitle(isVerified ? '✅ Verification Status: Verified' : '⚠️ Verification Status: Connected')
          .setColor(isVerified ? 0x00ff00 : 0xffa500)
          .setDescription(
            isVerified 
              ? 'Your wallet is fully verified with cryptographic proof!' 
              : 'Your wallet is connected but not fully verified.'
          )
          .addFields(
            { 
              name: '📍 Wallet Address', 
              value: trustBadge ? `\`${trustBadge.wallet_address}\`` : `\`${dbUser.wallet}\``,
              inline: false 
            },
            { 
              name: '⭐ Reputation Score', 
              value: `${reputationScore} points`,
              inline: true 
            },
            { 
              name: '🎖️ Verification Badge', 
              value: isVerified ? '✅ Verified' : '❌ Not Verified',
              inline: true 
            }
          );
        
        if (!isVerified) {
          embed.addFields({
            name: '🔐 Get Fully Verified',
            value: 'Use `/register-wallet` to complete verification with signature proof. This provides additional security and trust benefits.',
            inline: false
          });
        }
        
        embed.setFooter({ text: isVerified ? 'Keep up the good work!' : 'Full verification recommended for enhanced trust' });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
      } catch (error) {
        console.error('Verify command error:', error);
        await interaction.reply({
          content: '❌ Error checking verification status. Please try again later.',
          ephemeral: true
        });
      }
      
    } else if (commandName === 'support') {
      const issue = interaction.options.getString('issue');
      
      if (!issue || issue.trim().length === 0) {
        return await interaction.reply({
          content: '❌ Please describe your issue or question.',
          ephemeral: true
        });
      }
      
      try {
        // Create support ticket embed
        const embed = new EmbedBuilder()
          .setTitle('🎫 Support Request Submitted')
          .setColor(0x7289da)
          .setDescription('Your support request has been received. Our team will review it shortly.')
          .addFields(
            { 
              name: '📝 Your Issue', 
              value: issue.slice(0, 1000), // Limit to 1000 chars
              inline: false 
            },
            { 
              name: '⏱️ Expected Response Time', 
              value: 'We typically respond within 24-48 hours.',
              inline: false 
            },
            { 
              name: '💡 Quick Help', 
              value: '• Check `/help` for command documentation\n• Use `/balance` to view your portfolio\n• Use `/verify` to check wallet status',
              inline: false 
            }
          )
          .setFooter({ text: `Ticket from: ${interaction.user.tag}` })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        // Log support request for admin review
        console.log(`Support request from ${interaction.user.id} (${interaction.user.tag}): ${issue}`);
        
        // TODO: In production, send this to a support channel or ticket system
        
      } catch (error) {
        console.error('Support command error:', error);
        await interaction.reply({
          content: '❌ Error submitting support request. Please try contacting server administrators directly.',
          ephemeral: true
        });
      }
      
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
    
  }
});

// Handle DM messages with $ prefix
client.on(Events.MessageCreate, async message => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Only handle DMs
  if (message.channel.type !== ChannelType.DM) return;
  
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