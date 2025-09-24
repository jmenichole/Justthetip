// JustTheTip Smart Contract Discord Bot
// Non-custodial implementation using Solana smart contracts

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, REST, Routes } = require('discord.js');
require('dotenv-safe').config();
const { Connection, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');

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
  }
];

// In-memory user wallet registry (no database needed)
const userWallets = new Map();

client.once('ready', async () => {
  console.log(`🟢 JustTheTip Smart Contract Bot logged in as ${client.user.tag}`);
  
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

// Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

console.log('🚀 Starting JustTheTip Smart Contract Bot...');
console.log('📝 Features: Non-custodial, Solana-native, Zero database dependency');

client.login(process.env.BOT_TOKEN);
