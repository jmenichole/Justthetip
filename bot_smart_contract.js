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
  const requiredVars = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'MONGODB_URI', 'SOLANA_RPC_URL'];
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
const { handleSwapCommand, handleSwapHelpButton } = require('./src/commands/swapCommand');
const db = require('./db/database');
const {
  createOnChainBalanceEmbed,
  createWalletRegisteredEmbed,
} = require('./src/utils/embedBuilders');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Smart Contract Commands
const smartContractCommands = [
  {
    name: 'register-wallet',
    description: 'Register your Solana wallet (supports Phantom, Solflare, WalletConnect & more)',
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
    description: 'View smart contract bot information and program details'
  },
  {
    name: 'balance',
    description: 'Check your wallet balance'
  },
  {
    name: 'help',
    description: 'Show bot commands and wallet connection options'
  }
];

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
          `**⚙️ Zero Private Keys:** Bot never handles sensitive information\n` +
          `**🔄 Jupiter Swaps:** Cross-token tipping via Jupiter Aggregator\n\n` +
          `**Supported Wallets:**\n` +
          `• Phantom, Solflare (browser extensions & mobile)\n` +
          `• WalletConnect (universal support for all Solana wallets)\n` +
          `• Trust Wallet and other mobile wallets\n\n` +
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
      
    } else if (commandName === 'balance') {
      const userId = interaction.user.id;
      const walletAddress = userWallets.get(userId);
      
      if (!walletAddress) {
        return interaction.reply({ 
          content: '❌ You need to register your wallet first! Use `/register-wallet` to get started.\n\n' +
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
        .setTitle('🤖 JustTheTip - Solana Trustless Agent')
        .setDescription(
          `Welcome to JustTheTip! A non-custodial Discord tipping bot powered by Solana.\n\n` +
          `**Getting Started:**\n` +
          `1. Use \`/register-wallet\` to connect your wallet\n` +
          `2. Sign the verification message in your wallet\n` +
          `3. Start tipping with SOL, USDC, BONK, and more!\n\n` +
          `**Supported Wallets:**\n` +
          `• 🟣 **Phantom** - Browser extension & mobile app\n` +
          `• 🟠 **Solflare** - Browser extension & mobile app\n` +
          `• 🔗 **WalletConnect** - Universal protocol for any Solana wallet\n` +
          `• 📱 **Trust Wallet** - Via WalletConnect\n` +
          `• 📱 **Other Wallets** - Any Solana-compatible wallet via WalletConnect\n\n` +
          `**Available Commands:**\n` +
          `• \`/register-wallet <address>\` - Register your Solana wallet\n` +
          `• \`/balance\` - Check your wallet balance (requires registration)\n` +
          `• \`/sc-balance\` - Check on-chain balance\n` +
          `• \`/sc-tip <user> <amount>\` - Create smart contract tip\n` +
          `• \`/generate-pda\` - Generate your Program Derived Address\n` +
          `• \`/swap\` - Convert tokens via Jupiter\n` +
          `• \`/sc-info\` - View smart contract details\n` +
          `• \`/help\` - Show this help message\n\n` +
          `**🔒 Security:**\n` +
          `• 100% Non-custodial - Your keys never leave your wallet\n` +
          `• Sign once, tip forever - Trustless agent technology\n` +
          `• All transactions are verifiable on-chain\n\n` +
          `**Need Help?**\n` +
          `If you have issues registering your wallet, try using WalletConnect which supports all Solana wallets!`
        )
        .setColor(0x667eea)
        .setFooter({ text: 'JustTheTip - Powered by Solana' });
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
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
    
  } else if (interaction.customId === 'swap_help') {
    await handleSwapHelpButton(interaction);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);