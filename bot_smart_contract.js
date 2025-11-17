/**
 * JustTheTip - Smart Contract Discord Bot
 * Non-custodial implementation using Solana smart contracts
 * 
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 * 
 * This file is part of JustTheTip.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * See LICENSE file in the project root for full license information.
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
} = require('./src/utils/embedBuilders');
const priceService = require('./src/utils/priceService');

const { commands: improvedCommands } = require('./IMPROVED_SLASH_COMMANDS');

// Import command handlers
const { handleHelpCommand } = require('./src/commands/handlers/helpHandler');
const { handleTipCommand } = require('./src/commands/handlers/tipHandler');
const { handleDisconnectWalletCommand } = require('./src/commands/handlers/walletHandler');
const { handleSupportCommand } = require('./src/commands/handlers/supportHandler');
const { handleRegisterMagicCommand } = require('./src/commands/handlers/magicHandler');
const { handleStatusCommand, handleLogsCommand } = require('./src/commands/handlers/statusHandler');
const { handleAirdropCommand } = require('./src/commands/handlers/airdropHandler');
const { handleFAQCommand } = require('./src/commands/handlers/faqHandler');
const { handleReportCommand } = require('./src/commands/handlers/reportHandler');
const { handleNaturalLanguageMessage } = require('./src/commands/handlers/naturalLanguageHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});// Use improved commands from IMPROVED_SLASH_COMMANDS.js
const smartContractCommands = improvedCommands;

// In-memory user wallet registry (in production, use a database)
// Note: This is being phased out in favor of database-only storage

// Get API URL for wallet registration page (sign.html is served by API server)
// Vercel deployment is the recommended API server for all endpoints including crypto onramp
const API_URL = process.env.API_BASE_URL || 'https://justthetip.vercel.app';

// Validate API URL and warn about deprecated deployments
if (API_URL.includes('mischief-manager')) {
  console.warn('⚠️  WARNING: You are using a deprecated API URL (mischief-manager.com)');
  console.warn('⚠️  This deployment is no longer maintained and may not have proper configuration.');
  console.warn('⚠️  Please update API_BASE_URL to: https://justthetip.vercel.app');
  console.warn('⚠️  Magic wallet registration and other features may not work correctly.');
}


client.once('ready', async () => {
  console.log(`🟢 JustTheTip Smart Contract Bot logged in as ${client.user.tag}`);
  console.log(`📡 Using API URL: ${API_URL}`);
  
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
  
  // Create context object for handlers
  const context = {
    sdk,
    database: db,
    priceService,
    client
  };
  
  try {
    // Route commands to handlers
    switch (commandName) {
      case 'help':
        await handleHelpCommand(interaction, context);
        break;
        
      case 'tip':
        await handleTipCommand(interaction, context);
        break;

      case 'register-magic':
        await handleRegisterMagicCommand(interaction, context);
        break;
        
      case 'disconnect-wallet':
        await handleDisconnectWalletCommand(interaction, context);
        break;
        
      case 'support':
        await handleSupportCommand(interaction, context);
        break;
        
      case 'status':
        await handleStatusCommand(interaction, context);
        break;
        
      case 'logs':
        await handleLogsCommand(interaction, context);
        break;
        
      case 'airdrop':
        await handleAirdropCommand(interaction, context);
        break;
        
      case 'faq':
        await handleFAQCommand(interaction, context);
        break;
        
      case 'report':
        await handleReportCommand(interaction, context);
        break;
        
      default:
        await interaction.reply({
          content: 'unknown command - try /help',
          ephemeral: true
        });
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
    const walletAddress = await db.getUserWallet(userId);
    
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
    const walletAddress = await db.getUserWallet(userId);
    
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
});// Handle reaction-based airdrop claims
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  // Ignore bot reactions
  if (user.bot) return;
  
  // Only handle 🎁 reactions
  if (reaction.emoji.name !== '🎁') return;
  
  // Fetch partial reactions
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }
  
  try {
    // Find airdrop by message ID
    const airdrop = await db.getAirdropByMessageId(reaction.message.id);
    
    if (!airdrop) return; // Not an airdrop message
    
    // Check if airdrop is still active
    if (!airdrop.active) {
      try {
        await user.send('❌ This airdrop has ended.');
      } catch (error) {
        // User has DMs disabled
      }
      return;
    }
    
    // Check if expired
    if (airdrop.expires_at && Date.now() > airdrop.expires_at) {
      await db.updateAirdrop(airdrop.airdrop_id, { active: 0 });
      try {
        await user.send('❌ This airdrop has expired.');
      } catch (error) {
        // User has DMs disabled
      }
      return;
    }
    
    // Check if user already claimed
    const claimedUsers = JSON.parse(airdrop.claimed_users || '[]');
    if (claimedUsers.includes(user.id)) {
      try {
        await user.send('❌ You have already claimed this airdrop.');
      } catch (error) {
        // User has DMs disabled
      }
      return;
    }
    
    // Check if max claims reached
    if (airdrop.max_recipients && airdrop.claimed_count >= airdrop.max_recipients) {
      await db.updateAirdrop(airdrop.airdrop_id, { active: 0 });
      try {
        await user.send('❌ This airdrop has reached its claim limit.');
      } catch (error) {
        // User has DMs disabled
      }
      return;
    }
    
    // Check if server-locked
    if (airdrop.guild_id) {
      const member = await reaction.message.guild?.members.fetch(user.id).catch(() => null);
      if (!member) {
        try {
          await user.send('❌ This airdrop is only available to server members.');
        } catch (error) {
          // User has DMs disabled
        }
        return;
      }
    }
    
    // Check if user has registered wallet
    const userWallet = await db.getUserWallet(user.id);
    if (!userWallet) {
      try {
        await user.send('❌ Please register your wallet first using `/register-magic` to claim airdrops.');
      } catch (error) {
        // User has DMs disabled
      }
      return;
    }
    
    // TODO: Execute actual SOL transfer from creator to claimer
    // For now, just mark as claimed
    
    // Update claimed users
    claimedUsers.push(user.id);
    await db.updateAirdrop(airdrop.airdrop_id, {
      claimed_users: JSON.stringify(claimedUsers),
      claimed_count: airdrop.claimed_count + 1
    });
    
    // Check if this was the last claim
    if (airdrop.max_recipients && (airdrop.claimed_count + 1) >= airdrop.max_recipients) {
      await db.updateAirdrop(airdrop.airdrop_id, { active: 0 });
    }
    
    // Send success message
    try {
      await user.send(`✅ Claimed! You'll receive $${airdrop.amount_per_user.toFixed(2)} USD in SOL once transactions are processed.`);
    } catch (error) {
      // User has DMs disabled
      console.log(`Could not DM claim confirmation to ${user.tag}`);
    }
    
    console.log(`🎁 Airdrop claimed: ${user.tag} claimed from ${airdrop.airdrop_id}`);
    
  } catch (error) {
    console.error('Error handling airdrop claim:', error);
  }
});

// Handle natural language messages (DMs and mentions)
client.on(Events.MessageCreate, async (message) => {
  // Create context for natural language handler
  const context = {
    sdk,
    database: db,
    priceService,
    client
  };
  
  await handleNaturalLanguageMessage(message, context);
});

client.login(process.env.DISCORD_BOT_TOKEN);

// Export client for use in other modules (e.g., pending tip notifications)
module.exports = { client };
