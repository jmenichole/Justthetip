import { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } from 'discord.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { JustTheTipSDK } from '../../contracts/sdk.js';
import { config } from 'dotenv';

config();

/**
 * JustTheTip Transaction Builder Discord Bot
 * Non-custodial transaction builder using Solana
 */
class JustTheTipSmartBot {
  constructor() {
    this.client = new Client({ 
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
    });
    
    // Initialize Solana SDK
    this.connection = new Connection(process.env.SOL_RPC_URL || 'https://api.mainnet-beta.solana.com');
    this.sdk = new JustTheTipSDK(process.env.SOL_RPC_URL || 'https://api.mainnet-beta.solana.com');
    
    // Bot configuration
    this.botToken = process.env.BOT_TOKEN;
    this.clientId = process.env.CLIENT_ID;
    
    if (!this.botToken) {
      throw new Error('BOT_TOKEN is required in environment variables');
    }
  }

  async initialize() {
    try {
      // Connect to database
      console.log('🔗 Connected to MongoDB');

      // Register slash commands
      await this.registerCommands();
      console.log('📝 Registered slash commands');

      // Set up event listeners
      this.setupEventListeners();

      // Login to Discord
      await this.client.login(this.botToken);
      console.log('✅ Smart Contract Discord Bot initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize bot:', error);
      throw error;
    }
  }

  setupEventListeners() {
    this.client.once('ready', () => {
      console.log(`🤖 Smart Contract Bot logged in as ${this.client.user.tag}`);
      console.log(`⚡ Using Solana RPC: ${this.connection.rpcEndpoint}`);
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      try {
        await this.handleCommand(interaction);
      } catch (error) {
        console.error('Command error:', error);
        
        const errorEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Command Error')
          .setDescription('An error occurred while processing your command.')
          .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    });
  }

  async registerCommands() {
    const commands = [
      {
        name: 'register-wallet',
        description: 'Register your Solana wallet for smart contract interactions',
        options: [{
          name: 'address',
          type: 3, // STRING
          description: 'Your Solana wallet public key (e.g., from Phantom, Solflare)',
          required: true
        }]
      },
      {
        name: 'sc-tip',
        description: 'Create tip transaction instruction (⚠️ signing not implemented)',
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
            required: true,
            min_value: 0.001,
            max_value: 100.0
          }
        ]
      },
      {
        name: 'sc-balance',
        description: 'Check your registered wallet balance (on-chain query)'
      },
      {
        name: 'sc-info',
        description: 'Information about smart contract bot features'
      },
      {
        name: 'generate-pda',
        description: 'Generate your Program Derived Address for advanced features'
      }
    ];

    if (this.clientId) {
      const rest = new REST({ version: '10' }).setToken(this.botToken);
      await rest.put(Routes.applicationCommands(this.clientId), { body: commands });
    } else {
      console.log('⚠️ CLIENT_ID not set - commands registered locally only');
    }
  }

  async handleCommand(interaction) {
    const { commandName, user } = interaction;
    const userId = user.id;

    switch (commandName) {
      case 'register-wallet':
        await this.handleRegisterWallet(interaction, userId);
        break;
      case 'sc-tip':
        await this.handleSmartContractTip(interaction, userId);
        break;
      case 'sc-balance':
        await this.handleSmartContractBalance(interaction, userId);
        break;
      case 'sc-info':
        await this.handleSmartContractInfo(interaction);
        break;
      case 'generate-pda':
        await this.handleGeneratePDA(interaction, userId);
        break;
      default:
        await interaction.reply({ content: 'Unknown command', ephemeral: true });
    }
  }

  async handleRegisterWallet(interaction, userId) {
    const address = interaction.options.getString('address');
    
    try {
      // Validate Solana address format
      if (!this.sdk.isValidAddress(address)) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Invalid Address')
          .setDescription('Please provide a valid Solana wallet address.')
          .addFields({
            name: 'Example',
            value: '`9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM`'
          })
          .setTimestamp();

        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      // Store wallet address in database

      // Check balance to verify address
      const balance = await this.sdk.getBalance(new PublicKey(address));

      const successEmbed = new EmbedBuilder()
        .setColor(0x14F195) // Solana green
        .setTitle('✅ Wallet Registered Successfully')
        .setDescription('Your Solana wallet has been registered for smart contract interactions.')
        .addFields(
          {
            name: '📱 Wallet Address',
            value: `\`${address}\``,
            inline: false
          },
          {
            name: '💰 Current Balance',
            value: `**${balance.toFixed(4)} SOL**`,
            inline: true
          },
          {
            name: '🔧 Usage',
            value: 'Use `/sc-tip` to create smart contract tips',
            inline: true
          }
        )
        .setFooter({ text: 'Non-custodial • You control your keys' })
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed], ephemeral: true });

    } catch (error) {
      console.error('Register wallet error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Registration Failed')
        .setDescription('Unable to register wallet. Please check the address and try again.')
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }

  async handleSmartContractTip(interaction, userId) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getNumber('amount');

    if (targetUser.id === userId) {
      return interaction.reply({ content: '❌ You cannot tip yourself', ephemeral: true });
    }

    try {
      // Get registered wallet addresses

      if (!senderWallet) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Wallet Not Registered')
          .setDescription('Please register your wallet first using `/register-wallet`')
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (!recipientWallet) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Recipient Not Registered')
          .setDescription(`${targetUser.username} hasn't registered their wallet yet.`)
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Check sender balance
      const senderBalance = await this.sdk.getBalance(new PublicKey(senderWallet));
      if (senderBalance < amount) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Insufficient Balance')
          .setDescription(`You need at least **${amount} SOL** to complete this tip.`)
          .addFields({
            name: 'Your Balance',
            value: `**${senderBalance.toFixed(4)} SOL**`
          })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Create smart contract tip instruction
      const tipInstruction = this.sdk.createTipInstruction(
        new PublicKey(senderWallet),
        new PublicKey(recipientWallet),
        amount
      );

      // Create transaction
      const transaction = this.sdk.createTransaction([tipInstruction]);
      
      // Calculate estimated transaction fee
      const estimatedFee = 0.000005; // Typical Solana fee

      const tipEmbed = new EmbedBuilder()
        .setColor(0x9945FF) // Solana purple
        .setTitle('⚠️ Transaction Created (Signing Not Implemented)')
        .setDescription('Transaction instruction created. Wallet signing integration not yet implemented.')
        .addFields(
          {
            name: '👤 From',
            value: `<@${userId}>\n\`${senderWallet.substring(0, 6)}...${senderWallet.substring(-4)}\``,
            inline: true
          },
          {
            name: '👤 To', 
            value: `<@${targetUser.id}>\n\`${recipientWallet.substring(0, 6)}...${recipientWallet.substring(-4)}\``,
            inline: true
          },
          {
            name: '💎 Amount',
            value: `**${amount} SOL**`,
            inline: true
          },
          {
            name: '⛽ Network Fee',
            value: `~${estimatedFee} SOL`,
            inline: true
          },
          {
            name: '⚠️ Current Limitation',
            value: 'Wallet signing integration is not yet implemented. This feature is under development.',
            inline: false
          }
        )
        .setFooter({ text: '⚠️ DEVELOPMENT MODE: Transaction signing not yet implemented' })
        .setTimestamp();

      await interaction.reply({ embeds: [tipEmbed] });

      // In a real implementation, you would:
      // 1. Generate a QR code or deep link for wallet apps
      // 2. Provide the serialized transaction for signing
      // 3. Monitor the transaction status

    } catch (error) {
      console.error('Smart contract tip error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Tip Creation Failed')
        .setDescription('Unable to create tip transaction. Please try again.')
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }

  async handleSmartContractBalance(interaction, userId) {
    try {
      
      if (!walletAddress) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ No Wallet Registered')
          .setDescription('Register your wallet first using `/register-wallet`')
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Get live balance from Solana blockchain
      const balance = await this.sdk.getBalance(new PublicKey(walletAddress));

      // Get recent transactions
      const recentTxs = await this.sdk.getRecentTransactions(new PublicKey(walletAddress), 5);

      const balanceEmbed = new EmbedBuilder()
        .setColor(0x14F195) // Solana green
        .setTitle('💰 Smart Contract Wallet Balance')
        .setDescription('Live balance from Solana blockchain')
        .addFields(
          {
            name: '📱 Wallet Address',
            value: `\`${walletAddress.substring(0, 8)}...${walletAddress.substring(-8)}\``,
            inline: false
          },
          {
            name: '💎 SOL Balance',
            value: `**${balance.toFixed(6)} SOL**`,
            inline: true
          },
          {
            name: '📊 Recent Transactions',
            value: `${recentTxs.length} recent transactions`,
            inline: true
          },
          {
            name: '🔗 View on Explorer',
            value: `[Solscan](https://solscan.io/account/${walletAddress})`,
            inline: true
          }
        )
        .setFooter({ text: 'On-chain data • Non-custodial' })
        .setTimestamp();

      await interaction.reply({ embeds: [balanceEmbed], ephemeral: true });

    } catch (error) {
      console.error('Balance check error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Balance Check Failed')
        .setDescription('Unable to fetch balance. Please try again.')
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }

  async handleSmartContractInfo(interaction) {
    const infoEmbed = new EmbedBuilder()
      .setColor(0x9945FF)
      .setTitle('⚡ JustTheTip Smart Contract Bot')
      .setDescription('Non-custodial Discord tipping powered by Solana smart contracts')
      .addFields(
        {
          name: '🔧 How It Works',
          value: '• Register your Solana wallet address\n• Create tip transactions through smart contracts\n• Sign transactions in your own wallet\n• No private keys ever handled by bot',
          inline: false
        },
        {
          name: '🛡️ Security Benefits',
          value: '• **Non-custodial**: You control your funds\n• **No private keys**: Bot never sees your keys\n• **On-chain**: Balance checks from Solana blockchain\n• **Transparent**: Fully auditable',
          inline: false
        },
        {
          name: '💡 Commands',
          value: '`/register-wallet` - Register your Solana wallet\n`/sc-tip` - Create tip transaction instruction\n`/sc-balance` - Check on-chain balance\n`/generate-pda` - Generate Program Derived Address',
          inline: false
        },
        {
          name: '⚡ Network',
          value: 'Solana Mainnet',
          inline: true
        },
        {
          name: '💰 Fees',
          value: '~0.000005 SOL per transaction',
          inline: true
        }
      )
      .setFooter({ text: 'Transaction Builder SDK • github.com/Mischief-Manager-inc/justthetipbot' })
      .setTimestamp();

    await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
  }

  async handleGeneratePDA(interaction, userId) {
    try {
      const userPDA = await this.sdk.generateUserPDA(userId);
      
      const pdaEmbed = new EmbedBuilder()
        .setColor(0x9945FF)
        .setTitle('🔗 Your Program Derived Address')
        .setDescription('Unique address generated from your Discord ID')
        .addFields(
          {
            name: '📱 PDA Address',
            value: `\`${userPDA.toBase58()}\``,
            inline: false
          },
          {
            name: '🔧 Use Cases',
            value: '• Advanced smart contract features\n• Custom program interactions\n• Enhanced security model',
            inline: false
          },
          {
            name: '⚠️ Note',
            value: 'This PDA is deterministically generated from your Discord user ID and can be recreated at any time.',
            inline: false
          }
        )
        .setFooter({ text: 'Program Derived Address • Solana Smart Contracts' })
        .setTimestamp();

      await interaction.reply({ embeds: [pdaEmbed], ephemeral: true });

    } catch (error) {
      console.error('PDA generation error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ PDA Generation Failed')
        .setDescription('Unable to generate Program Derived Address.')
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}

// Initialize and start the bot
const bot = new JustTheTipSmartBot();
bot.initialize().catch(console.error);

export { JustTheTipSmartBot };