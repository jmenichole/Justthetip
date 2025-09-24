// JustTheTip Smart Contract Discord Bot
// Non-custodial implementation using Solana smart contracts
// NO DATABASE REQUIRED - Completely non-custodial

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, REST, Routes } = require('discord.js');
const { Connection, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');

// Load environment variables manually to avoid dotenv issues
const BOT_TOKEN = process.env.BOT_TOKEN || 'MTM3Mzc4NDcyMjcxODcyMDA5MA.GgFRsJ.FdumonxIey8p7HNG7_QkddHQrUpN-z45gqRfqE';
const CLIENT_ID = process.env.CLIENT_ID || '1373784722718720090';
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Smart Contract Commands
const smartContractCommands = [
  {
    name: 'register-wallet',
    description: '🔗 Register your Solana wallet for smart contracts',
    options: [
      { name: 'address', type: 3, description: 'Your Solana wallet address', required: true }
    ]
  },
  {
    name: 'sc-tip',
    description: '💎 Create smart contract tip transaction',
    options: [
      { name: 'user', type: 6, description: 'User to tip', required: true },
      { name: 'amount', type: 10, description: 'Amount in SOL', required: true }
    ]
  },
  {
    name: 'sc-balance',
    description: '💰 Check on-chain wallet balance'
  },
  {
    name: 'generate-pda',
    description: '🔗 Generate your Program Derived Address'
  },
  {
    name: 'sc-info',
    description: '⚡ View smart contract bot information'
  }
];

// In-memory user wallet registry (completely non-custodial)
const userWallets = new Map();

client.once('ready', async () => {
  console.log('🟢 JustTheTip Smart Contract Bot logged in as ' + client.user.tag);
  console.log('🔒 Non-custodial mode: Users control their own keys');
  
  // Register smart contract commands
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
  
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: smartContractCommands }
    );
    console.log('✅ Smart contract commands registered');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
});

// Solana connection
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

client.login(BOT_TOKEN);
