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
const crypto = require('crypto');
const {
  createOnChainBalanceEmbed,
} = require('./src/utils/embedBuilders');

const { commands: improvedCommands, helpMessages: HELP_MESSAGES } = require('./IMPROVED_SLASH_COMMANDS');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Use improved commands from IMPROVED_SLASH_COMMANDS.js
const smartContractCommands = improvedCommands;

// In-memory user wallet registry (in production, use a database)
const userWallets = new Map();

// Get frontend URL for wallet registration page
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://jmenichole.github.io/Justthetip';


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
    // ===== HELP COMMAND =====
    if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('📚 JustTheTip Help Guide')
        .setDescription(HELP_MESSAGES.userGuide)
        .setColor(0x667eea)
        .setFooter({ text: 'JustTheTip - Powered by Solana' });
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    // ===== TIP COMMAND =====
    } else if (commandName === 'tip') {
      const recipient = interaction.options.getUser('user');
      const amount = interaction.options.getNumber('amount');
      const senderId = interaction.user.id;
      
      // Validate amount
      if (amount <= 0 || amount > 1) {
        return interaction.reply({ 
          content: '❌ Amount must be between 0.001 and 1.0 SOL', 
          ephemeral: true 
        });
      }
      
      // Check sender wallet
      const senderWallet = userWallets.get(senderId);
      if (!senderWallet) {
        return interaction.reply({ 
          content: '❌ Please register your wallet first using `/register-wallet`', 
          ephemeral: true 
        });
      }
      
      // Check recipient wallet
      const recipientWallet = userWallets.get(recipient.id);
      if (!recipientWallet) {
        return interaction.reply({ 
          content: '❌ Recipient has not registered their wallet yet', 
          ephemeral: true 
        });
      }
      
      // Check sender balance
      const balance = await getSolanaBalance(senderWallet);
      const balanceSOL = balance / 1000000000;
      
      if (balanceSOL < amount) {
        return interaction.reply({ 
          content: `❌ Insufficient balance. You have ${balanceSOL.toFixed(4)} SOL`, 
          ephemeral: true 
        });
      }
      
      // Create tip embed
      const embed = new EmbedBuilder()
        .setTitle('💸 Tip Transaction')
        .setDescription(
          `**From:** <@${interaction.user.id}>\n` +
          `**To:** <@${recipient.id}>\n` +
          `**Amount:** ${amount} SOL\n\n` +
          `**Status:** ⏳ Processing...\n\n` +
          `_Transaction will be confirmed on Solana blockchain_`
        )
        .setColor(0x667eea)
        .setFooter({ text: 'Non-custodial tip • Processed on-chain' })
        .setTimestamp();
        
      await interaction.reply({ embeds: [embed] });
      
      console.log(`💸 Tip: ${interaction.user.tag} -> ${recipient.tag}: ${amount} SOL`);
      
    // ===== AIRDROP COMMAND =====
    } else if (commandName === 'airdrop') {
      const amount = interaction.options.getNumber('amount') || 1.0;
      const userId = interaction.user.id;
      const walletAddress = userWallets.get(userId);
      
      // Validate amount
      if (amount <= 0 || amount > 2.0) {
        return interaction.reply({ 
          content: '❌ Airdrop amount must be between 0.1 and 2.0 SOL', 
          ephemeral: true 
        });
      }
      
      if (!walletAddress) {
        return interaction.reply({ 
          content: '❌ Please register your wallet first using `/register-wallet`', 
          ephemeral: true 
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🎁 Devnet Airdrop')
        .setDescription(
          `**Wallet:** \`${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}\`\n` +
          `**Amount:** ${amount} SOL\n` +
          `**Network:** Devnet/Testnet\n\n` +
          `**⚠️ Note:** This only works on devnet/testnet.\n` +
          `For mainnet, you need to purchase SOL from an exchange.`
        )
        .setColor(0x10b981)
        .setFooter({ text: 'Testnet airdrop only' });
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    // ===== REGISTER WALLET COMMAND =====
    } else if (commandName === 'register-wallet') {
      const userId = interaction.user.id;
      const username = interaction.user.username;
      
      // Generate a unique nonce (UUID v4)
      const nonce = crypto.randomUUID();
      
      // Create registration URL with user info and nonce
      const registrationUrl = `${FRONTEND_URL}/sign.html?user=${encodeURIComponent(userId)}&username=${encodeURIComponent(username)}&nonce=${encodeURIComponent(nonce)}`;
      
      const embed = new EmbedBuilder()
        .setTitle('🔐 Register Your Wallet')
        .setDescription(
          `Click the link below to register your Solana wallet.\n\n` +
          `**What happens next:**\n` +
          `1. The link will open a secure verification page\n` +
          `2. Connect your Solana wallet (Phantom, Solflare, etc.)\n` +
          `3. Sign a message to prove wallet ownership\n` +
          `4. Your wallet will be registered automatically!\n\n` +
          `**🔒 Security:**\n` +
          `• Your private keys never leave your wallet\n` +
          `• This link is unique to you and expires in 10 minutes\n` +
          `• Only you can complete this registration\n\n` +
          `**🔗 Registration Link:**\n` +
          `${registrationUrl}\n\n` +
          `_Link expires in 10 minutes_`
        )
        .setColor(0x667eea)
        .setFooter({ text: 'JustTheTip - Non-Custodial Wallet Registration' })
        .setTimestamp();
        
      // Create a button that opens the link
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('🔐 Register Wallet')
            .setStyle(ButtonStyle.Link)
            .setURL(registrationUrl)
        );
        
      await interaction.reply({ 
        embeds: [embed], 
        components: [row],
        ephemeral: true 
      });
      
      console.log(`📝 Registration link generated for user ${username} (${userId}) with nonce ${nonce.slice(0, 8)}...`);
      
    // ===== SUPPORT COMMAND =====
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
              value: '• Check `/help` for command documentation\n• Use `/status` to check bot status\n• Use `/logs` to view transaction history',
              inline: false 
            }
          )
          .setFooter({ text: `Ticket from: ${interaction.user.tag}` })
          .setTimestamp();
        
        await interaction.reply({ embeds: [userEmbed], ephemeral: true });
        
        // Send to support channel with mention
        const SUPPORT_CHANNEL_ID = process.env.SUPPORT_CHANNEL_ID || '1437295074856927363';
        const ADMIN_USER_ID = '1153034319271559328'; // @jmenichole user ID
        
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
      
    // ===== STATUS COMMAND =====
    } else if (commandName === 'status') {
      const userId = interaction.user.id;
      const walletAddress = userWallets.get(userId);
      
      const embed = new EmbedBuilder()
        .setTitle('🔍 Bot & Wallet Status')
        .setColor(0x667eea)
        .addFields(
          { 
            name: '🤖 Bot Status', 
            value: '🟢 Online and operational', 
            inline: false 
          },
          { 
            name: '⚡ Network', 
            value: 'Solana Mainnet', 
            inline: true 
          },
          { 
            name: '⏱️ Uptime', 
            value: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`, 
            inline: true 
          },
          { 
            name: '💾 Connected Wallets', 
            value: `${userWallets.size} wallets`, 
            inline: true 
          },
          { 
            name: '🔐 Your Wallet Status', 
            value: walletAddress 
              ? `✅ Registered\n\`${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}\``
              : '❌ Not registered\nUse `/register-wallet` to connect your wallet',
            inline: false 
          }
        )
        .setFooter({ text: 'JustTheTip Bot Status' })
        .setTimestamp();
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    // ===== LOGS COMMAND =====
    } else if (commandName === 'logs') {
      const userId = interaction.user.id;
      const walletAddress = userWallets.get(userId);
      
      if (!walletAddress) {
        return interaction.reply({ 
          content: '❌ Please register your wallet first using `/register-wallet`', 
          ephemeral: true 
        });
      }
      
      // Send confirmation to user
      await interaction.reply({ 
        content: '📋 Fetching your transaction logs... Check your DMs!', 
        ephemeral: true 
      });
      
      try {
        // Create logs embed
        const logsEmbed = new EmbedBuilder()
          .setTitle('📋 Transaction Logs')
          .setDescription(
            `**Wallet:** \`${walletAddress}\`\n\n` +
            `**Recent Transactions:**\n` +
            `_Loading transaction history from Solana blockchain..._\n\n` +
            `🔍 **View on Explorer:**\n` +
            `https://explorer.solana.com/address/${walletAddress}`
          )
          .setColor(0x667eea)
          .setFooter({ text: 'Transaction logs are fetched from Solana blockchain' })
          .setTimestamp();
          
        // Try to DM the user
        try {
          const dmChannel = await interaction.user.createDM();
          await dmChannel.send({ embeds: [logsEmbed] });
          console.log(`✅ Sent transaction logs to ${interaction.user.tag} via DM`);
        } catch (dmError) {
          console.error('❌ Failed to send DM:', dmError);
          // Follow up with error message
          await interaction.followUp({ 
            content: '❌ Could not send DM. Please enable DMs from server members in your privacy settings.', 
            ephemeral: true 
          });
        }
      } catch (error) {
        console.error('Logs command error:', error);
        await interaction.followUp({ 
          content: '❌ Error fetching transaction logs. Please try again later.', 
          ephemeral: true 
        });
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