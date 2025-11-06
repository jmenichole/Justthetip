const { SlashCommandBuilder } = require('discord.js');
const { SWAP_TOKEN_CHOICES } = require('../utils/jupiterSwap');

const { SUPPORTED_TOKENS } = require('../utils/jupiterSwap');

const swapTokenChoices = SUPPORTED_TOKENS.map(token => ({ name: token, value: token }));

const slashCommands = [
  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Show your portfolio with crypto amounts and USD values 💎'),

  new SlashCommandBuilder()
    .setName('tip')
    .setDescription('Send crypto to another user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to tip')
        .setRequired(true))
    .addNumberOption(option =>
      option
        .setName('amount')
        .setDescription('Amount to tip (SOL only)')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('airdrop')
    .setDescription('Create airdrop with USD amounts (e.g. $5.00 worth of SOL)')
    .addNumberOption(option =>
      option
        .setName('amount')
        .setDescription('Amount to airdrop')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('currency')
        .setDescription('Currency (SOL, USDC)')
        .setRequired(true)
        .addChoices(
          { name: 'SOL', value: 'SOL' },
          { name: 'USDC', value: 'USDC' }
        )),

  new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Send crypto to external wallet')
    .addStringOption(option =>
      option
        .setName('address')
        .setDescription('External wallet address')
        .setRequired(true))
    .addNumberOption(option =>
      option
        .setName('amount')
        .setDescription('Amount to withdraw')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('currency')
        .setDescription('Currency (SOL, USDC)')
        .setRequired(true)
        .addChoices(
          { name: 'SOL', value: 'SOL' },
          { name: 'USDC', value: 'USDC' }
        )),

  new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Get instructions for adding funds'),

  new SlashCommandBuilder()
    .setName('registerwallet')
    .setDescription('Link your Solana wallet with one-click signature verification'),

  new SlashCommandBuilder()
    .setName('burn')
    .setDescription('Donate to support bot development')
    .addNumberOption(option =>
      option
        .setName('amount')
        .setDescription('Amount to burn')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('currency')
        .setDescription('Currency (SOL, USDC)')
        .setRequired(true)
        .addChoices(
          { name: 'SOL', value: 'SOL' },
          { name: 'USDC', value: 'USDC' }
        )),

  new SlashCommandBuilder()
    .setName('swap')
    .setDescription('Get a Jupiter swap quote between supported Solana tokens')
    .addStringOption(option =>
      option
        .setName('from')
        .setDescription('Token to swap from')
        .setRequired(true)
        .addChoices(...SWAP_TOKEN_CHOICES))

        .addChoices(...swapTokenChoices))
    .addStringOption(option =>
      option
        .setName('to')
        .setDescription('Token to receive')
        .setRequired(true)
        .addChoices(...SWAP_TOKEN_CHOICES))

        .addChoices(...swapTokenChoices))
    .addNumberOption(option =>
      option
        .setName('amount')
        .setDescription('Amount to swap (whole units)')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show bot commands and usage guide')
    .addStringOption(option =>
      option
        .setName('section')
        .setDescription('Help section to display (leave empty for basic commands)')
        .setRequired(false)
        .addChoices(
          { name: 'advanced', value: 'advanced' },
          { name: 'register', value: 'register' }
        )),
];

module.exports = { slashCommands };
