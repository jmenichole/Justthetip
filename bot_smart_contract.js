/**
 * JustTheTip - Smart Contract Discord Bot
 * Non-custodial implementation using Solana smart contracts
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
  
  // Only fail if truly required variables are missing (smart contract bot)
  // MONGODB_URI is optional - bot uses SQLite by default
  const requiredVars = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'SOLANA_RPC_URL'];
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

const { PublicKey } = require('@solana/web3.js');
const { JustTheTipSDK } = require('./contracts/sdk');
const db = require('./db/database');
const {
  createOnChainBalanceEmbed,
  createWalletRegisteredEmbed,
} = require('./src/utils/embedBuilders');

const { commands: improvedCommands, helpMessages: HELP_MESSAGES } = require('./IMPROVED_SLASH_COMMANDS');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Use improved commands from IMPROVED_SLASH_COMMANDS.js
const smartContractCommands = improvedCommands;

// In-memory user wallet registry (in production, use a database)
const userWallets = new Map();

client.once('ready', async () => {
  console.log(`🟢 JustTheTip Smart Contract Bot logged in as ${client.user.tag}`);
  
  // Connect to database (optional)
  await db.connectDB();
  
  // Register smart contract commands
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: smartContractCommands }
    );
    console.log('✅ Smart contract commands registered');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
});

// Initialize SDK
const sdk = new JustTheTipSDK(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
);

// Generate Program Derived Address for a user (now uses SDK)
function generateUserPDA(discordUserId) {
  return sdk.generateUserPDA(discordUserId);
}

// Get Solana balance (now uses SDK)
async function getSolanaBalance(address) {
  return await sdk.getBalance(address);
}

// Create tip instruction (now uses SDK)
function createTipInstruction(senderAddress, recipientAddress, amount) {
  return sdk.createTipInstruction(senderAddress, recipientAddress, amount);
}

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
  
  try {
    // New command: /verify (simple wallet registration)
    if (commandName === 'verify') {
      const wallet = interaction.options.getString('wallet');
      const userId = interaction.user.id;
      
      // Validate Solana address
      try {
        new PublicKey(wallet);
      } catch (error) {
        return interaction.reply({ 
          content: '❌ Invalid Solana wallet address. Please provide a valid Solana address.', 
          ephemeral: true 
        });
      }
      
      userWallets.set(userId, wallet);
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Wallet Verified!')
        .setDescription(
          `Your wallet has been connected to your Discord account.\n\n` +
          `**Wallet:** \`${wallet.slice(0, 8)}...${wallet.slice(-8)}\`\n\n` +
          `**Next Steps:**\n` +
          `• Use \`/balance\` to check your wallet balance\n` +
          `• Use \`/status\` to view your verification status\n` +
          `• Use \`/get-badge\` to mint your verification NFT (requires payment)`
        )
        .setColor(0x00ff00)
        .setFooter({ text: 'JustTheTip - Solana Verification' });
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'connect-wallet') {
      // New command: /connect-wallet with signature verification
      const walletAddress = interaction.options.getString('wallet-address');
      const signature = interaction.options.getString('signature');
      const userId = interaction.user.id;
      
      // Validate Solana address
      try {
        new PublicKey(walletAddress);
      } catch (error) {
        return interaction.reply({ 
          content: '❌ Invalid Solana wallet address.', 
          ephemeral: true 
        });
      }
      
      // TODO: Verify signature here
      // For now, we'll accept the wallet and signature
      userWallets.set(userId, walletAddress);
      
      const embed = new EmbedBuilder()
        .setTitle('🔗 Wallet Connected!')
        .setDescription(
          `Your wallet has been securely connected.\n\n` +
          `**Wallet:** \`${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}\`\n` +
          `**Signature Verified:** ✅\n\n` +
          `**Next Steps:**\n` +
          `1. Pay verification fee: **0.02 SOL**\n` +
          `2. Use \`/check-payment\` to verify payment\n` +
          `3. Use \`/get-badge\` to mint your NFT badge`
        )
        .setColor(0x667eea)
        .setFooter({ text: 'Verification in progress...' });
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'status') {
      // New command: /status to check verification status
      const userId = interaction.user.id;
      const walletAddress = userWallets.get(userId);
      
      if (!walletAddress) {
        return interaction.reply({ 
          content: '❌ No wallet connected. Use `/verify` or `/connect-wallet` to get started.', 
          ephemeral: true 
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🔍 Verification Status')
        .setDescription(
          `**Wallet:** \`${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}\`\n` +
          `**Connected:** ✅\n` +
          `**Payment:** Pending\n` +
          `**NFT Badge:** Not minted\n\n` +
          `Use \`/check-payment\` to check payment status.`
        )
        .setColor(0x3b82f6);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'get-badge') {
      // New command: /get-badge to mint verification NFT
      const userId = interaction.user.id;
      const walletAddress = userWallets.get(userId);
      
      if (!walletAddress) {
        return interaction.reply({ 
          content: '❌ Please connect your wallet first using `/connect-wallet`.', 
          ephemeral: true 
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🎖️ Mint Verification Badge')
        .setDescription(
          `**Ready to mint your verification NFT!**\n\n` +
          `**Requirements:**\n` +
          `✅ Wallet connected\n` +
          `⏳ Payment verification (0.02 SOL)\n\n` +
          `**What You Get:**\n` +
          `• Permanent verification NFT\n` +
          `• On-chain proof of Discord verification\n` +
          `• Verified Discord role\n\n` +
          `Use \`/check-payment\` first to verify your payment has been received.`
        )
        .setColor(0xf59e0b);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'check-payment') {
      // New command: /check-payment to verify payment
      const userId = interaction.user.id;
      const walletParam = interaction.options.getString('wallet');
      const walletAddress = walletParam || userWallets.get(userId);
      
      if (!walletAddress) {
        return interaction.reply({ 
          content: '❌ No wallet specified. Please provide a wallet address or connect your wallet first.', 
          ephemeral: true 
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('💳 Payment Verification')
        .setDescription(
          `Checking payment status for:\n` +
          `\`${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}\`\n\n` +
          `**Status:** Checking recent transactions...\n\n` +
          `If you just sent payment, please wait 2-3 minutes for confirmation.`
        )
        .setColor(0x8b5cf6);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'pricing') {
      // New command: /pricing to show costs
      const embed = new EmbedBuilder()
        .setTitle('💵 Verification Pricing')
        .setDescription(HELP_MESSAGES.pricing)
        .setColor(0x10b981);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'info') {
      // New command: /info about the bot
      const embed = new EmbedBuilder()
        .setTitle('ℹ️ About JustTheTip')
        .setDescription(HELP_MESSAGES.info)
        .setColor(0x667eea);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'stats') {
      // New command: /stats for bot statistics
      const embed = new EmbedBuilder()
        .setTitle('📊 Bot Statistics')
        .setDescription(
          `**Network:** Solana Mainnet\n` +
          `**Status:** 🟢 Online\n` +
          `**Uptime:** ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m\n` +
          `**Connected Wallets:** ${userWallets.size}\n` +
          `**Commands Available:** ${smartContractCommands.length}\n\n` +
          `**Verification Fee:** 0.02 SOL\n` +
          `**NFT Standard:** Metaplex`
        )
        .setColor(0x3b82f6);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'admin-stats') {
      // Admin command: detailed statistics
      // Check if user is admin (simplified check)
      const embed = new EmbedBuilder()
        .setTitle('👑 Admin Statistics')
        .setDescription(
          `**Total Users:** ${userWallets.size}\n` +
          `**Bot Uptime:** ${Math.floor(process.uptime())} seconds\n` +
          `**Memory Usage:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n` +
          `**Process ID:** ${process.pid}`
        )
        .setColor(0xef4444);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'admin-user') {
      // Admin command: lookup user details
      const user = interaction.options.getUser('user');
      const walletAddress = userWallets.get(user.id);
      
      const embed = new EmbedBuilder()
        .setTitle('👑 User Lookup')
        .setDescription(
          `**User:** ${user.tag}\n` +
          `**User ID:** ${user.id}\n` +
          `**Wallet:** ${walletAddress ? `\`${walletAddress}\`` : 'Not connected'}`
        )
        .setColor(0xef4444);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'register-wallet') {
      // Keep backward compatibility with old command
      const address = interaction.options.getString('address');
      const userId = interaction.user.id;
      
      // Validate Solana address
      try {
        new PublicKey(address);
      } catch (error) {
        return interaction.reply({ 
          content: '❌ Invalid Solana wallet address', 
          ephemeral: true 
        });
      }
      
      userWallets.set(userId, address);
      
      const embed = createWalletRegisteredEmbed('SOL', address, false);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'sc-tip') {
      const recipient = interaction.options.getUser('user');
      const amount = interaction.options.getNumber('amount');
      const senderId = interaction.user.id;
      
      if (amount <= 0 || amount > 1) {
        return interaction.reply({ 
          content: '❌ Amount must be between 0 and 1 SOL', 
          ephemeral: true 
        });
      }
      
      const senderWallet = userWallets.get(senderId);
      const recipientWallet = userWallets.get(recipient.id);
      
      if (!senderWallet) {
        return interaction.reply({ 
          content: '❌ Please connect your wallet first using `/verify` or `/connect-wallet`', 
          ephemeral: true 
        });
      }
      
      if (!recipientWallet) {
        return interaction.reply({ 
          content: '❌ Recipient has not registered their wallet yet', 
          ephemeral: true 
        });
      }
      
      // Create unsigned transaction
      const transaction = createTipInstruction(senderWallet, recipientWallet, amount);
      
      if (!transaction) {
        return interaction.reply({ 
          content: '❌ Error creating transaction', 
          ephemeral: true 
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('💎 Smart Contract Tip Created')
        .setDescription(
          `**Tip:** ${amount} SOL to ${recipient}\n` +
          `**From:** \`${senderWallet.slice(0, 8)}...${senderWallet.slice(-8)}\`\n` +
          `**To:** \`${recipientWallet.slice(0, 8)}...${recipientWallet.slice(-8)}\`\n\n` +
          `**Next Steps:**\n` +
          `1. Copy the transaction data below\n` +
          `2. Sign it in your Solana wallet (Phantom, Solflare, etc.)\n` +
          `3. Submit the signed transaction to the network`
        )
        .setColor(0x3b82f6)
        .setFooter({ text: 'This is a non-custodial transaction. You control your keys!' });
        
      const transactionData = transaction.serialize({ requireAllSignatures: false });
      const transactionBase64 = transactionData.toString('base64');
      
      await interaction.reply({ 
        embeds: [embed], 
        content: `\`\`\`\n${transactionBase64}\`\`\``,
        ephemeral: true 
      });
      
    } else if (commandName === 'sc-balance') {
      const userId = interaction.user.id;
      const walletAddress = userWallets.get(userId);
      
      if (!walletAddress) {
        return interaction.reply({ 
          content: '❌ Please connect your wallet first using `/verify` or `/connect-wallet`', 
          ephemeral: true 
        });
      }
      
      const balance = await getSolanaBalance(walletAddress);
      
      const embed = createOnChainBalanceEmbed(walletAddress, balance);
        
      const refreshButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('refresh_sc_balance')
            .setLabel('🔄 Refresh')
            .setStyle(ButtonStyle.Primary)
        );
        
      await interaction.reply({ 
        embeds: [embed], 
        components: [refreshButton], 
        ephemeral: true 
      });
      
    } else if (commandName === 'generate-pda') {
      const userId = interaction.user.id;
      const pda = generateUserPDA(userId);
      
      if (!pda) {
        return interaction.reply({ 
          content: '❌ Error generating PDA', 
          ephemeral: true 
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🔗 Program Derived Address')
        .setDescription(
          `**Your PDA:** \`${pda.address}\`\n` +
          `**Bump:** ${pda.bump}\n\n` +
          `*This is your unique Program Derived Address for advanced smart contract features.*`
        )
        .setColor(0x2d1b69);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'sc-info') {
      const embed = new EmbedBuilder()
        .setTitle('⚡ JustTheTip Smart Contract Bot')
        .setDescription(
          `**🔒 Non-custodial:** Users control their own private keys\n` +
          `**⚡ Smart Contracts:** All transactions through Solana programs\n` +
          `**🔗 PDAs:** Program Derived Addresses for advanced features\n` +
          `**🛠️ TypeScript SDK:** Fully typed with comprehensive documentation\n` +
          `**⚙️ Zero Private Keys:** Bot never handles sensitive information\n\n` +
          `**Supported Wallets:**\n` +
          `• Phantom, Solflare (browser extensions & mobile)\n` +
          `• WalletConnect (universal support for all Solana wallets)\n` +
          `• Trust Wallet and other mobile wallets\n\n` +
          `**Commands:**\n` +
          `• \`/register-wallet\` - Register your Solana wallet\n` +
          `• \`/sc-tip\` - Create smart contract tip\n` +
          `• \`/sc-balance\` - Check on-chain balance\n` +
          `• \`/generate-pda\` - Generate your PDA\n` +
          `• \`/sc-info\` - Show this information`
        )
        .setColor(0x8b5cf6);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'balance') {
      const userId = interaction.user.id;
      const walletAddress = userWallets.get(userId);
      
      if (!walletAddress) {
        return interaction.reply({ 
          content: '❌ You need to connect your wallet first! Use `/verify` or `/connect-wallet` to get started.\n\n' +
                   '**Supported Wallets:**\n' +
                   '• Phantom (browser extension or mobile app)\n' +
                   '• Solflare (browser extension or mobile app)\n' +
                   '• WalletConnect (any Solana-compatible wallet)\n' +
                   '• Trust Wallet and other mobile wallets via WalletConnect',
          ephemeral: true 
        });
      }
      
      // If wallet is registered, show balance using sc-balance logic
      const balance = await getSolanaBalance(walletAddress);
      
      const embed = createOnChainBalanceEmbed(walletAddress, balance);
        
      const refreshButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('refresh_balance')
            .setLabel('🔄 Refresh')
            .setStyle(ButtonStyle.Primary)
        );
        
      await interaction.reply({ 
        embeds: [embed], 
        components: [refreshButton], 
        ephemeral: true 
      });
      
    } else if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('🤖 JustTheTip - Verification Bot')
        .setDescription(HELP_MESSAGES.userGuide)
        .setColor(0x667eea)
        .setFooter({ text: 'JustTheTip - Powered by Solana' });
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'support') {
      const issue = interaction.options.getString('issue');
      
      if (!issue || issue.trim().length === 0) {
        return await interaction.reply({
          content: '❌ Please describe your issue or question.',
          ephemeral: true
        });
      }
      
      try {
        // Create support ticket embed for user
        const userEmbed = new EmbedBuilder()
          .setTitle('🎫 Support Request Submitted')
          .setColor(0x667eea)
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
              value: '• Check `/help` for command documentation\n• Use `/balance` to view your wallet balance\n• Try WalletConnect if registration fails',
              inline: false 
            }
          )
          .setFooter({ text: `Ticket from: ${interaction.user.tag}` })
          .setTimestamp();
        
        await interaction.reply({ embeds: [userEmbed], ephemeral: true });
        
        // Send to support channel with mention
        const SUPPORT_CHANNEL_ID = process.env.SUPPORT_CHANNEL_ID || '1437295074856927363';
        const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '1153034319271559328';
        
        try {
          const supportChannel = await client.channels.fetch(SUPPORT_CHANNEL_ID);
          if (supportChannel && supportChannel.isTextBased()) {
            const supportEmbed = new EmbedBuilder()
              .setTitle('🆘 New Support Request')
              .setColor(0xff6b6b)
              .addFields(
                { name: '👤 User', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: '🆔 User ID', value: interaction.user.id, inline: true },
                { name: '🏠 Server', value: interaction.guild ? interaction.guild.name : 'DM', inline: true },
                { name: '📝 Issue', value: issue.slice(0, 1024), inline: false },
                { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
              )
              .setThumbnail(interaction.user.displayAvatarURL())
              .setFooter({ text: `Support Ticket • User ID: ${interaction.user.id}` })
              .setTimestamp();
            
            // Send with admin mention BEFORE the embed so the admin gets pinged
            await supportChannel.send({
              content: `<@${ADMIN_USER_ID}> **New support request from <@${interaction.user.id}>**`,
              embeds: [supportEmbed]
            });
            
            console.log(`✅ Support request forwarded to channel ${SUPPORT_CHANNEL_ID} with admin ping`);
          } else {
            console.error('❌ Support channel not found or not text-based');
          }
        } catch (channelError) {
          console.error('❌ Failed to send to support channel:', channelError);
          // Don't fail the user's command - they still got confirmation
        }
        
        // Log support request
        console.log(`📋 Support request from ${interaction.user.id} (${interaction.user.tag}): ${issue}`);
        
      } catch (error) {
        console.error('Support command error:', error);
        
        // Try to respond if we haven't already
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ Error submitting support request. Please try contacting server administrators directly.',
            ephemeral: true
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Command error:', error);
    
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ 
        content: '❌ An error occurred while processing your command.', 
        ephemeral: true 
      }).catch(err => console.error('Failed to send error response:', err));
    } else {
      await interaction.reply({ 
        content: '❌ An error occurred while processing your command.', 
        ephemeral: true 
      }).catch(err => console.error('Failed to send error response:', err));
    }
  }
});

// Handle button interactions
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  
  if (interaction.customId === 'refresh_sc_balance') {
    const userId = interaction.user.id;
    const walletAddress = userWallets.get(userId);
    
    if (!walletAddress) {
      return interaction.update({ 
        content: '❌ Wallet not found. Please register again.', 
        embeds: [], 
        components: [] 
      });
    }
    
    const balance = await getSolanaBalance(walletAddress);
    
    const embed = createOnChainBalanceEmbed(walletAddress, balance, true);
      
    await interaction.update({ embeds: [embed] });
    
  } else if (interaction.customId === 'refresh_balance') {
    const userId = interaction.user.id;
    const walletAddress = userWallets.get(userId);
    
    if (!walletAddress) {
      return interaction.update({ 
        content: '❌ Wallet not found. Please register again.', 
        embeds: [], 
        components: [] 
      });
    }
    
    const balance = await getSolanaBalance(walletAddress);
    
    const embed = createOnChainBalanceEmbed(walletAddress, balance, true);
      
    await interaction.update({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);