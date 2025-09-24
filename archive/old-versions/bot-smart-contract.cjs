const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, REST, Routes } = require('discord.js');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const JustTheTipSmartContract = require('./smart-contract.cjs');

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

// Mock crypto prices (in production, fetch from API like CoinGecko)
const CRYPTO_PRICES = {
  'SOL': 140.50,    // $140.50 per SOL
  'USDC': 1.00,     // $1.00 per USDC
  'LTC': 65.25      // $65.25 per LTC
};

// Convert USD amount to crypto amount
function convertUsdToCrypto(usdAmount, cryptoType) {
  const price = CRYPTO_PRICES[cryptoType.toUpperCase()];
  if (!price) return null;
  
  const cryptoAmount = usdAmount / price;
  return {
    usdAmount: usdAmount,
    cryptoAmount: parseFloat(cryptoAmount.toFixed(6)),
    cryptoType: cryptoType.toUpperCase(),
    price: price
  };
}

// Database connection and operations
class Database {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connectDB() {
    try {
      if (!process.env.MONGODB_URI) {
        console.log('⚠️ MongoDB not configured - balance tracking disabled');
        return;
      }
      
      // Parse MongoDB URI and handle X509 authentication
      let mongoUri = process.env.MONGODB_URI;
      const certPath = process.env.MONGO_CERT_PATH;
      
      if (certPath && fs.existsSync(certPath)) {
        this.client = new MongoClient(mongoUri, {
          tls: true,
          tlsCertificateKeyFile: certPath
        });
      } else {
        // Fallback to regular connection string
        this.client = new MongoClient(mongoUri);
      }
      
      await this.client.connect();
      this.db = this.client.db('justthetip');
      this.isConnected = true;
      console.log('✅ Connected to MongoDB - Production Mode Active');
      
      // Create indexes for performance
      await this.createIndexes();
      
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('⚠️ Operating without persistent balance tracking');
      this.isConnected = false;
    }
  }

  async createIndexes() {
    try {
      await this.db.collection('users').createIndex({ userId: 1 });
      await this.db.collection('transactions').createIndex({ userId: 1, timestamp: -1 });
      await this.db.collection('wallets').createIndex({ userId: 1 });
      await this.db.collection('smart_contracts').createIndex({ userId: 1, timestamp: -1 });
      console.log('✅ Database indexes created');
    } catch (error) {
      console.error('⚠️ Could not create indexes:', error.message);
    }
  }

  // Smart contract wallet registration
  async registerWallet(userId, walletAddress, walletType = 'solana') {
    if (!this.isConnected) {
      console.log(`Local: Registered wallet ${walletAddress} for user ${userId}`);
      return { success: true };
    }
    
    try {
      await this.db.collection('wallets').updateOne(
        { userId, walletType },
        { 
          $set: { 
            walletAddress,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
      
      console.log(`✅ Registered ${walletType} wallet for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error registering wallet:', error);
      return { success: false, error: 'Database error' };
    }
  }

  // Get user's registered wallet
  async getUserWallet(userId, walletType = 'solana') {
    if (!this.isConnected) {
      return null;
    }
    
    try {
      const wallet = await this.db.collection('wallets').findOne({ userId, walletType });
      return wallet ? wallet.walletAddress : null;
    } catch (error) {
      console.error('Error getting wallet:', error);
      return null;
    }
  }

  // Store smart contract transaction
  async storeSmartContractTx(userId, txData) {
    if (!this.isConnected) {
      console.log(`Local: Smart contract tx stored for user ${userId}`);
      return { success: true };
    }
    
    try {
      await this.db.collection('smart_contracts').insertOne({
        userId,
        ...txData,
        timestamp: new Date()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error storing smart contract tx:', error);
      return { success: false, error: 'Database error' };
    }
  }

  async getUser(userId) {
    if (!this.isConnected) {
      return {
        userId,
        balances: { SOL: 0, USDC: 0, LTC: 0 },
        totalUsdValue: 0
      };
    }
    
    try {
      let user = await this.db.collection('users').findOne({ userId });
      if (!user) {
        // Create new user with zero balances
        user = {
          userId,
          balances: { SOL: 0, USDC: 0, LTC: 0 },
          createdAt: new Date(),
          lastActive: new Date()
        };
        await this.db.collection('users').insertOne(user);
      }
      
      // Calculate total USD value
      user.totalUsdValue = this.calculateTotalUsdValue(user.balances);
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return { userId, balances: { SOL: 0, USDC: 0, LTC: 0 }, totalUsdValue: 0 };
    }
  }

  calculateTotalUsdValue(balances) {
    let total = 0;
    for (const [crypto, amount] of Object.entries(balances)) {
      const price = CRYPTO_PRICES[crypto] || 0;
      total += amount * price;
    }
    return parseFloat(total.toFixed(2));
  }
}

const db = new Database();
const smartContract = new JustTheTipSmartContract();

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
    description: 'Send USD value worth of crypto to another user (e.g., $10.00 worth of SOL)',
    options: [
      { name: 'user', type: 6, description: 'User to tip', required: true },
      { name: 'usd_amount', type: 10, description: 'USD amount (e.g., 10.00 for $10)', required: true },
      { name: 'crypto_type', type: 3, description: 'Crypto to send', required: true, choices: [
          { name: 'SOL (Solana)', value: 'SOL' },
          { name: 'USDC (USD Coin)', value: 'USDC' },
          { name: 'LTC (Litecoin)', value: 'LTC' }
        ]
      }
    ]
  },
  // Smart Contract Commands
  {
    name: 'register-wallet',
    description: '🔗 Register your Solana wallet for smart contract features',
    options: [
      { name: 'address', type: 3, description: 'Your Solana wallet address (public key)', required: true }
    ]
  },
  {
    name: 'sc-tip',
    description: '💎 Create non-custodial smart contract tip transaction',
    options: [
      { name: 'user', type: 6, description: 'User to tip', required: true },
      { name: 'amount', type: 10, description: 'Amount in SOL', required: true }
    ]
  },
  {
    name: 'sc-balance',
    description: '📊 Check your on-chain Solana wallet balance',
  },
  {
    name: 'generate-pda',
    description: '🔑 Generate your Program Derived Address (PDA)',
  },
  {
    name: 'airdrop',
    description: 'Create airdrop with USD amount (e.g., $5.00 worth of SOL)',
    options: [
      { name: 'usd_amount', type: 10, description: 'USD amount (e.g., 5.00 for $5)', required: true },
      { name: 'crypto_type', type: 3, description: 'Crypto to airdrop', required: true, choices: [
          { name: 'SOL (Solana)', value: 'SOL' },
          { name: 'USDC (USD Coin)', value: 'USDC' },
          { name: 'LTC (Litecoin)', value: 'LTC' }
        ]
      }
    ]
  },
  {
    name: 'deposit',
    description: 'Get your deposit addresses for adding crypto',
  },
  {
    name: 'prices',
    description: 'Show current crypto prices',
  },
  {
    name: 'help',
    description: 'Complete command reference',
  },
  {
    name: 'stats',
    description: 'Show bot statistics and server info',
  }
];

// Store airdrops and pending transactions
let airdrops = {};
let rateLimits = {};
let pendingTransactions = {};

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

const HELP_MESSAGE = `**JustTheTip Bot - Smart Contract Enhanced:**

**💰 Traditional Commands:**
• \`/balance\` — Check your portfolio with USD values
• \`/tip @user 10.00 SOL\` — Send $10.00 worth of SOL 
• \`/airdrop 5.00 USDC\` — Create $5.00 worth of USDC airdrop 
• \`/deposit\` — Get deposit addresses

**🔗 Smart Contract Features:**
• \`/register-wallet [address]\` — Register your Solana wallet
• \`/sc-tip @user 0.5\` — Create non-custodial SOL tip transaction
• \`/sc-balance\` — Check your on-chain wallet balance
• \`/generate-pda\` — Get your Program Derived Address

**💱 Features:**
• USD-based amounts with automatic conversion
• Non-custodial smart contract transactions
• Secure wallet integration
• Real-time on-chain balance checking

**Example:**
\`/sc-tip @friend 0.1\` = Create 0.1 SOL tip transaction to sign in your wallet

**Secure & Non-Custodial - You Control Your Keys!**`;

// Bot ready event
client.once('clientReady', async () => {
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
    if (commandName === 'register-wallet') {
      const address = interaction.options.getString('address');
      
      if (!smartContract.isValidSolanaAddress(address)) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Invalid Solana Address')
          .setDescription('Please provide a valid Solana wallet address.')
          .setColor(0xe74c3c);
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }
      
      const result = await db.registerWallet(interaction.user.id, address, 'solana');
      
      if (result.success) {
        const embed = new EmbedBuilder()
          .setTitle('✅ Wallet Registered Successfully!')
          .setDescription(
            `Your Solana wallet has been registered:\n\n` +
            `**Address:** \`${address.slice(0, 8)}...${address.slice(-8)}\`\n\n` +
            `You can now use smart contract features like:\n` +
            `• \`/sc-tip\` - Create non-custodial tip transactions\n` +
            `• \`/sc-balance\` - Check your on-chain balance\n` +
            `• \`/generate-pda\` - Get your Program Derived Address`
          )
          .setColor(0x00ff99)
          .setFooter({ text: 'Non-custodial • You control your keys' });
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❌ Registration Failed')
          .setDescription('Failed to register wallet. Please try again.')
          .setColor(0xe74c3c);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
      
    } else if (commandName === 'sc-tip') {
      const recipient = interaction.options.getUser('user');
      const amount = interaction.options.getNumber('amount');
      
      if (recipient.id === interaction.user.id) {
        return await interaction.reply({ 
          content: '❌ You cannot tip yourself!', 
          ephemeral: true 
        });
      }
      
      if (amount <= 0 || amount > 10) {
        return await interaction.reply({ 
          content: '❌ Amount must be between 0 and 10 SOL for smart contract tips', 
          ephemeral: true 
        });
      }
      
      const senderWallet = await db.getUserWallet(interaction.user.id);
      const recipientWallet = await db.getUserWallet(recipient.id);
      
      if (!senderWallet) {
        return await interaction.reply({ 
          content: '❌ Please register your wallet first with `/register-wallet [your-address]`', 
          ephemeral: true 
        });
      }
      
      if (!recipientWallet) {
        return await interaction.reply({ 
          content: '❌ Recipient has not registered their wallet yet', 
          ephemeral: true 
        });
      }
      
      try {
        const transaction = await smartContract.createTipTransaction(
          senderWallet, 
          recipientWallet, 
          amount,
          'SOL'
        );
        
        const fee = await smartContract.estimateTransactionFee(transaction);
        const { serializedTransaction } = smartContract.createSignatureUrl(transaction);
        
        // Store transaction for tracking
        const txId = `tx_${Date.now()}_${interaction.user.id}`;
        pendingTransactions[txId] = {
          sender: interaction.user.id,
          recipient: recipient.id,
          amount,
          serialized: serializedTransaction,
          created: new Date()
        };
        
        await db.storeSmartContractTx(interaction.user.id, {
          type: 'tip',
          recipient: recipient.id,
          amount,
          serializedTransaction,
          status: 'pending'
        });
        
        const embed = new EmbedBuilder()
          .setTitle('💎 Smart Contract Tip Created')
          .setDescription(
            `**Non-Custodial SOL Tip Transaction:**\n\n` +
            `**Amount:** ${amount} SOL (~$${(amount * CRYPTO_PRICES.SOL).toFixed(2)})\n` +
            `**To:** ${recipient.displayName}\n` +
            `**From:** \`${senderWallet.slice(0, 8)}...${senderWallet.slice(-8)}\`\n` +
            `**To:** \`${recipientWallet.slice(0, 8)}...${recipientWallet.slice(-8)}\`\n` +
            `**Estimated Fee:** ${fee.toFixed(6)} SOL\n\n` +
            `**🔐 Next Steps:**\n` +
            `1. Copy the transaction data below\n` +
            `2. Open your Solana wallet (Phantom, Solflare, etc.)\n` +
            `3. Import/paste the transaction\n` +
            `4. Review and sign the transaction\n` +
            `5. Submit to complete the tip!`
          )
          .setColor(0x9b59b6)
          .setFooter({ text: 'Non-custodial • You control your private keys!' });
          
        const transactionButton = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`copy_tx_${txId}`)
              .setLabel('📋 Copy Transaction Data')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(`wallet_help`)
              .setLabel('❓ Wallet Help')
              .setStyle(ButtonStyle.Secondary)
          );
        
        await interaction.reply({ embeds: [embed], components: [transactionButton], ephemeral: true });
        
      } catch (error) {
        console.error('Smart contract tip error:', error);
        const embed = new EmbedBuilder()
          .setTitle('❌ Transaction Creation Failed')
          .setDescription('Failed to create smart contract transaction. Please try again.')
          .setColor(0xe74c3c);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
      
    } else if (commandName === 'sc-balance') {
      const userWallet = await db.getUserWallet(interaction.user.id);
      
      if (!userWallet) {
        return await interaction.reply({ 
          content: '❌ Please register your wallet first with `/register-wallet [your-address]`', 
          ephemeral: true 
        });
      }
      
      try {
        const solBalance = await smartContract.getSolBalance(userWallet);
        const usdcBalance = await smartContract.getTokenBalance(userWallet, smartContract.tokens.USDC);
        
        const embed = new EmbedBuilder()
          .setTitle('📊 On-Chain Wallet Balance')
          .setDescription(
            `**Wallet:** \`${userWallet.slice(0, 8)}...${userWallet.slice(-8)}\`\n\n` +
            `**Balances:**\n` +
            `☀️ **SOL:** ${solBalance.toFixed(6)} (~$${(solBalance * CRYPTO_PRICES.SOL).toFixed(2)})\n` +
            `💚 **USDC:** ${usdcBalance.toFixed(2)} (~$${usdcBalance.toFixed(2)})\n\n` +
            `**Total:** ~$${(solBalance * CRYPTO_PRICES.SOL + usdcBalance).toFixed(2)}\n\n` +
            `*Live data from Solana blockchain*`
          )
          .setColor(0x3498db)
          .setFooter({ text: 'Real-time on-chain balance' });
          
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
      } catch (error) {
        console.error('Balance check error:', error);
        const embed = new EmbedBuilder()
          .setTitle('❌ Balance Check Failed')
          .setDescription('Unable to fetch on-chain balance. Please try again.')
          .setColor(0xe74c3c);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
      
    } else if (commandName === 'generate-pda') {
      try {
        const pda = await smartContract.generateUserPDA(interaction.user.id);
        
        const embed = new EmbedBuilder()
          .setTitle('🔑 Your Program Derived Address')
          .setDescription(
            `**PDA Generated for Discord User:** ${interaction.user.displayName}\n\n` +
            `**Address:** \`${pda.address}\`\n` +
            `**Bump:** ${pda.bump}\n\n` +
            `**What is a PDA?**\n` +
            `A Program Derived Address is a special address generated deterministically ` +
            `from your Discord ID. It can be used for advanced smart contract features ` +
            `like escrow, automated payments, and more.\n\n` +
            `*This address is unique to you and this bot*`
          )
          .setColor(0xf39c12)
          .setFooter({ text: 'Advanced Smart Contract Feature' });
          
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
      } catch (error) {
        console.error('PDA generation error:', error);
        const embed = new EmbedBuilder()
          .setTitle('❌ PDA Generation Failed')
          .setDescription('Unable to generate Program Derived Address.')
          .setColor(0xe74c3c);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
      
    } else if (commandName === 'balance') {
      const user = await db.getUser(interaction.user.id);
      
      const embed = new EmbedBuilder()
        .setTitle('💎 Your Portfolio Balance')
        .setColor(0x3498db)
        .setDescription(
          `**Total Portfolio Value:** $${user.totalUsdValue.toFixed(2)}\n\n` +
          `☀️ **SOL:** ${user.balances.SOL.toFixed(6)} (~$${(user.balances.SOL * CRYPTO_PRICES.SOL).toFixed(2)})\n` +
          `💚 **USDC:** ${user.balances.USDC.toFixed(2)} (~$${(user.balances.USDC * CRYPTO_PRICES.USDC).toFixed(2)})\n` +
          `🚀 **LTC:** ${user.balances.LTC.toFixed(6)} (~$${(user.balances.LTC * CRYPTO_PRICES.LTC).toFixed(2)})\n\n` +
          `*Updated: ${new Date().toLocaleTimeString()}*`
        )
        .setFooter({ text: 'Secure balance tracking • Click refresh to update' });
        
      const refreshButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('refresh_balance')
            .setLabel('🔄 Refresh Balance')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('check_onchain')
            .setLabel('🔗 Check On-Chain')
            .setStyle(ButtonStyle.Secondary)
        );
        
      await interaction.reply({ embeds: [embed], components: [refreshButton], ephemeral: true });
      
    } else if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('🤖 JustTheTip Bot - Smart Contract Enhanced')
        .setColor(0x7289da)
        .setDescription(HELP_MESSAGE);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      
    } else if (commandName === 'stats') {
      const embed = new EmbedBuilder()
        .setTitle('📊 Bot Statistics')
        .setColor(0x9b59b6)
        .setDescription(
          `**Server Info:**\n` +
          `🏠 **Guild:** ${interaction.guild.name}\n` +
          `👥 **Members:** ${interaction.guild.memberCount}\n\n` +
          `**Bot Status:**\n` +
          `🟢 **Online:** ${client.uptime ? Math.floor(client.uptime / 1000 / 60) + ' minutes' : 'Just started'}\n` +
          `💾 **Database:** ${db.isConnected ? 'Connected' : 'Disconnected'}\n` +
          `🔗 **Smart Contracts:** Enabled\n` +
          `💱 **Supported Cryptos:** SOL, USDC, LTC\n\n` +
          `**Features:**\n` +
          `• USD-based tipping amounts\n` +
          `• Non-custodial smart contract tips\n` +
          `• Real-time on-chain balance checking\n` +
          `• Secure wallet integration\n` +
          `• Program Derived Addresses (PDA)`
        )
        .setFooter({ text: 'JustTheTip Bot • Secure & Non-Custodial' });
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    // ... (rest of existing commands like tip, airdrop, deposit, prices)
    
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
  
  if (interaction.customId.startsWith('copy_tx_')) {
    const txId = interaction.customId.replace('copy_tx_', '');
    const tx = pendingTransactions[txId];
    
    if (!tx) {
      return interaction.reply({ content: '❌ Transaction not found or expired.', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📋 Transaction Data')
      .setDescription(
        `**Copy this transaction data and paste it into your Solana wallet:**\n\n` +
        `\`\`\`\n${tx.serialized}\`\`\`\n\n` +
        `**Wallet Instructions:**\n` +
        `• **Phantom:** Settings > Developer Settings > Import Transaction\n` +
        `• **Solflare:** Tools > Import Transaction\n` +
        `• **Other wallets:** Look for "Import" or "Paste Transaction" options`
      )
      .setColor(0x9b59b6)
      .setFooter({ text: 'Transaction expires in 10 minutes' });
      
    await interaction.reply({ embeds: [embed], ephemeral: true });
    
  } else if (interaction.customId === 'wallet_help') {
    const embed = new EmbedBuilder()
      .setTitle('❓ Wallet Help - How to Sign Transactions')
      .setDescription(
        `**Step-by-step guide for popular wallets:**\n\n` +
        `**📱 Phantom Wallet:**\n` +
        `1. Open Phantom wallet\n` +
        `2. Go to Settings ⚙️\n` +
        `3. Select "Developer Settings"\n` +
        `4. Choose "Import Transaction"\n` +
        `5. Paste the transaction data\n` +
        `6. Review and approve\n\n` +
        `**🔥 Solflare Wallet:**\n` +
        `1. Open Solflare\n` +
        `2. Go to Tools menu\n` +
        `3. Select "Import Transaction"\n` +
        `4. Paste the transaction data\n` +
        `5. Review and sign\n\n` +
        `**⚠️ Important:**\n` +
        `• Always review transaction details before signing\n` +
        `• Make sure recipient address is correct\n` +
        `• Check the SOL amount matches what you intended\n` +
        `• Transaction expires in 10 minutes`
      )
      .setColor(0x3498db)
      .setFooter({ text: 'Stay safe! Never sign suspicious transactions' });
      
    await interaction.reply({ embeds: [embed], ephemeral: true });
    
  } else if (interaction.customId === 'check_onchain') {
    const userWallet = await db.getUserWallet(interaction.user.id);
    
    if (!userWallet) {
      return interaction.reply({ 
        content: '❌ Please register your wallet first with `/register-wallet`', 
        ephemeral: true 
      });
    }
    
    try {
      const solBalance = await smartContract.getSolBalance(userWallet);
      
      const embed = new EmbedBuilder()
        .setTitle('🔗 On-Chain Balance Check')
        .setDescription(
          `**Wallet:** \`${userWallet.slice(0, 8)}...${userWallet.slice(-8)}\`\n\n` +
          `☀️ **SOL:** ${solBalance.toFixed(6)} (~$${(solBalance * CRYPTO_PRICES.SOL).toFixed(2)})\n\n` +
          `*Live from Solana blockchain*`
        )
        .setColor(0x00ff99);
        
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      await interaction.reply({ 
        content: '❌ Failed to check on-chain balance. Please try again.', 
        ephemeral: true 
      });
    }
  }
});

// Error handling
client.on('error', console.error);

// Clean up expired transactions every 10 minutes
setInterval(() => {
  const now = Date.now();
  const expiredTime = 10 * 60 * 1000; // 10 minutes
  
  for (const [txId, tx] of Object.entries(pendingTransactions)) {
    if (now - tx.created.getTime() > expiredTime) {
      delete pendingTransactions[txId];
    }
  }
}, 10 * 60 * 1000);

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