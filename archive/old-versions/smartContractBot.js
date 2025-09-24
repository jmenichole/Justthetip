const { Client, GatewayIntentBits } = require('discord.js');
const { Connection, PublicKey, Transaction, SystemProgram, Keypair } = require('@solana/web3.js');
const { 
  createAssociatedTokenAccountInstruction, 
  createTransferInstruction, 
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID
} = require('@solana/spl-token');
require('dotenv').config();
const db = require('../db/database');

// Smart Contract Discord Bot Implementation
class SmartContractBot {
  constructor() {
    this.connection = new Connection(process.env.SOL_RPC_URL || 'https://api.mainnet-beta.solana.com');
    this.client = new Client({ 
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
    });
    this.tipProgram = new PublicKey('11111111111111111111111111111112'); // System Program for now
  }

  async initialize() {
    await db.connectDB();
    console.log('🔗 Connected to database');
    
    this.client.once('ready', () => {
      console.log(`🤖 Smart Contract Bot logged in as ${this.client.user.tag}`);
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      
      try {
        await this.handleCommand(interaction);
      } catch (error) {
        console.error('Command error:', error);
        await interaction.reply({ 
          content: 'An error occurred while processing the command.', 
          ephemeral: true 
        });
      }
    });

    await this.registerCommands();
    await this.client.login(process.env.BOT_TOKEN);
  }

  async registerCommands() {
    const commands = [
      {
        name: 'register-wallet',
        description: 'Register your Solana wallet address for smart contract interactions',
        options: [{
          name: 'address',
          type: 3, // STRING
          description: 'Your Solana wallet public key',
          required: true
        }]
      },
      {
        name: 'tip-sol',
        description: 'Tip SOL using smart contract (non-custodial)',
        options: [
          {
            name: 'user',
            type: 6, // USER
            description: 'User to tip',
            required: true
          },
          {
            name: 'amount',
            type: 10, // NUMBER
            description: 'Amount of SOL to tip',
            required: true
          }
        ]
      },
      {
        name: 'balance',
        description: 'Check your registered wallet balance'
      }
    ];

    // Register slash commands (would need proper Discord application setup)
    console.log('📝 Commands defined for smart contract bot');
  }

  async handleCommand(interaction) {
    const { commandName } = interaction;
    const userId = interaction.user.id;

    switch (commandName) {
      case 'register-wallet':
        await this.handleRegisterWallet(interaction, userId);
        break;
      case 'tip-sol':
        await this.handleTipSol(interaction, userId);
        break;
      case 'balance':
        await this.handleBalance(interaction, userId);
        break;
      default:
        await interaction.reply({ content: 'Unknown command', ephemeral: true });
    }
  }

  async handleRegisterWallet(interaction, userId) {
    const address = interaction.options.getString('address');
    
    try {
      // Validate Solana address
      new PublicKey(address);
      
      // Store in database
      await db.registerWallet(userId, 'SOL', address);
      
      await interaction.reply({ 
        content: `✅ Wallet registered successfully!\nAddress: \`${address}\`\n\n*This address will be used for smart contract interactions.*`,
        ephemeral: true 
      });
    } catch (error) {
      await interaction.reply({ 
        content: '❌ Invalid Solana address format', 
        ephemeral: true 
      });
    }
  }

  async handleTipSol(interaction, userId) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getNumber('amount');

    if (amount <= 0) {
      return interaction.reply({ content: '❌ Amount must be positive', ephemeral: true });
    }

    try {
      // Get registered wallets
      const senderWallet = await db.getWallet(userId, 'SOL');
      const recipientWallet = await db.getWallet(targetUser.id, 'SOL');

      if (!senderWallet) {
        return interaction.reply({ 
          content: '❌ Please register your wallet first using `/register-wallet`', 
          ephemeral: true 
        });
      }

      if (!recipientWallet) {
        return interaction.reply({ 
          content: `❌ ${targetUser.username} hasn't registered their wallet yet`, 
          ephemeral: true 
        });
      }

      // Generate smart contract tip instruction (simplified)
      const tipInstruction = await this.createTipInstruction(
        new PublicKey(senderWallet),
        new PublicKey(recipientWallet),
        amount
      );

      await interaction.reply({
        content: `💡 **Smart Contract Tip Generated**\n\n` +
                `To complete this tip, you need to:\n` +
                `1. Connect your wallet (${senderWallet.substring(0, 6)}...)\n` +
                `2. Sign the smart contract transaction\n` +
                `3. Amount: **${amount} SOL** → ${targetUser.username}\n\n` +
                `*This is a non-custodial transaction - you maintain full control of your funds.*`,
        ephemeral: true
      });

      // In a real implementation, you would return the transaction for the user to sign
      // or integrate with a wallet adapter for automatic signing

    } catch (error) {
      console.error('Tip error:', error);
      await interaction.reply({ 
        content: '❌ Error creating tip transaction', 
        ephemeral: true 
      });
    }
  }

  async handleBalance(interaction, userId) {
    try {
      const walletAddress = await db.getWallet(userId, 'SOL');
      
      if (!walletAddress) {
        return interaction.reply({ 
          content: '❌ No wallet registered. Use `/register-wallet` first.', 
          ephemeral: true 
        });
      }

      // Get balance from Solana network
      const balance = await this.connection.getBalance(new PublicKey(walletAddress));
      const solBalance = balance / 1e9; // Convert lamports to SOL

      await interaction.reply({
        content: `💰 **Your Wallet Balance**\n\n` +
                `Address: \`${walletAddress.substring(0, 6)}...${walletAddress.substring(-4)}\`\n` +
                `Balance: **${solBalance.toFixed(4)} SOL**\n\n` +
                `*This is your actual on-chain balance, not a custodial balance.*`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Balance error:', error);
      await interaction.reply({ 
        content: '❌ Error fetching balance', 
        ephemeral: true 
      });
    }
  }

  async createTipInstruction(senderPubkey, recipientPubkey, amount) {
    // Create a simple SOL transfer instruction
    const lamports = Math.floor(amount * 1e9); // Convert SOL to lamports
    
    const instruction = SystemProgram.transfer({
      fromPubkey: senderPubkey,
      toPubkey: recipientPubkey,
      lamports: lamports
    });

    return instruction;
  }

  // Generate Program Derived Address for user
  async generateUserPDA(userId) {
    const [pda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('user'),
        Buffer.from(userId),
      ],
      this.tipProgram
    );
    return pda;
  }
}

module.exports = { SmartContractBot };

// CLI Usage
if (require.main === module) {
  const bot = new SmartContractBot();
  bot.initialize().catch(console.error);
}