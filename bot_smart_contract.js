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
require('dotenv-safe').config();
const { Connection, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');
const { JustTheTipSDK } = require('./contracts/sdk');
const { handleSwapCommand, handleSwapHelpButton } = require('./src/commands/swapCommand');
const db = require('./db/database');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Smart Contract Commands
const smartContractCommands = [
  {
    name: 'register-wallet',
    description: 'Register your Solana wallet for smart contracts',
    options: [
      { name: 'address', type: 3, description: 'Your Solana wallet address', required: true }
    ]
  },
  {
    name: 'sc-tip',
    description: 'Create smart contract tip transaction',
    options: [
      { name: 'user', type: 6, description: 'User to tip', required: true },
      { name: 'amount', type: 10, description: 'Amount in SOL', required: true }
    ]
  },
  {
    name: 'sc-balance',
    description: 'Check on-chain wallet balance'
  },
  {
    name: 'generate-pda',
    description: 'Generate your Program Derived Address'
  },
  {
    name: 'sc-info',
    description: 'View smart contract bot information'
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

// In-memory user wallet registry (in production, use a database)
const userWallets = new Map();

client.once('ready', async () => {
  console.log(`🟢 JustTheTip Smart Contract Bot logged in as ${client.user.tag}`);
  
  // Connect to database (optional)
  await db.connectDB();
  
  // Register smart contract commands
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
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

// Legacy Solana connection for backward compatibility
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
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
    if (commandName === 'register-wallet') {
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
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Wallet Registered')
        .setDescription(`Your Solana wallet has been registered for smart contract operations.\n\n**Address:** \`${address}\``)
        .setColor(0x8b5cf6);
        
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
          content: '❌ Please register your wallet first with `/register-wallet`', 
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
          content: '❌ Please register your wallet first with `/register-wallet`', 
          ephemeral: true 
        });
      }
      
      const balance = await getSolanaBalance(walletAddress);
      
      const embed = new EmbedBuilder()
        .setTitle('💰 On-Chain Balance')
        .setDescription(
          `**Wallet:** \`${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}\`\n` +
          `**Balance:** ${balance.toFixed(6)} SOL\n\n` +
          `*This is your actual on-chain balance, queried directly from the Solana blockchain.*`
        )
        .setColor(0x1e3a8a);
        
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
          `**⚙️ Zero Private Keys:** Bot never handles sensitive information\n` +
          `**🔄 Jupiter Swaps:** Cross-token tipping via Jupiter Aggregator\n\n` +
          `**Commands:**\n` +
          `• \`/register-wallet\` - Register your Solana wallet\n` +
          `• \`/sc-tip\` - Create smart contract tip\n` +
          `• \`/sc-balance\` - Check on-chain balance\n` +
          `• \`/generate-pda\` - Generate your PDA\n` +
          `• \`/swap\` - Convert tokens via Jupiter\n` +
          `• \`/sc-info\` - Show this information`
        )
        .setColor(0x8b5cf6);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'swap') {
      await handleSwapCommand(interaction, userWallets);
    }
    
  } catch (error) {
    console.error('Command error:', error);
    
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ 
        content: '❌ An error occurred while processing your command.', 
        ephemeral: true 
      }).catch(() => {});
    } else {
      await interaction.reply({ 
        content: '❌ An error occurred while processing your command.', 
        ephemeral: true 
      }).catch(() => {});
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
    
    const embed = new EmbedBuilder()
      .setTitle('💰 On-Chain Balance')
      .setDescription(
        `**Wallet:** \`${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}\`\n` +
        `**Balance:** ${balance.toFixed(6)} SOL\n\n` +
        `*Balance updated from Solana blockchain*`
      )
      .setColor(0x1e3a8a)
      .setFooter({ text: 'Last updated: ' + new Date().toLocaleString() });
      
    await interaction.update({ embeds: [embed] });
    
  } else if (interaction.customId === 'swap_help') {
    await handleSwapHelpButton(interaction);
  }
});

client.login(process.env.BOT_TOKEN);