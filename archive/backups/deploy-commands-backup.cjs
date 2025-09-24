const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),
    
  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your cryptocurrency balances'),
    
  new SlashCommandBuilder()
    .setName('registerwallet')
    .setDescription('Register your external wallet address for withdrawals')
    .addStringOption(option =>
      option.setName('coin')
        .setDescription('The cryptocurrency (SOL, USDC, LTC, BTC, BCH)')
        .setRequired(true)
        .addChoices(
          { name: 'Solana (SOL)', value: 'SOL' },
          { name: 'USD Coin (USDC)', value: 'USDC' },
          { name: 'Litecoin (LTC)', value: 'LTC' },
          { name: 'Bitcoin (BTC)', value: 'BTC' },
          { name: 'Bitcoin Cash (BCH)', value: 'BCH' }
        ))
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Your wallet address')
        .setRequired(true)),
        
  new SlashCommandBuilder()
    .setName('health')
    .setDescription('Check bot and system health status'),
    
  new SlashCommandBuilder()
    .setName('tip')
    .setDescription('Send cryptocurrency to another user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to tip')
        .setRequired(true))
    .addNumberOption(option =>
      option.setName('amount')
        .setDescription('The amount to tip')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('coin')
        .setDescription('The cryptocurrency to tip')
        .setRequired(true)
        .addChoices(
          { name: 'Solana (SOL)', value: 'SOL' },
          { name: 'USD Coin (USDC)', value: 'USDC' },
          { name: 'Litecoin (LTC)', value: 'LTC' },
          { name: 'Bitcoin (BTC)', value: 'BTC' },
          { name: 'Bitcoin Cash (BCH)', value: 'BCH' }
        )),
        
  new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Withdraw cryptocurrency to your registered wallet')
    .addStringOption(option =>
      option.setName('coin')
        .setDescription('The cryptocurrency to withdraw')
        .setRequired(true)
        .addChoices(
          { name: 'Solana (SOL)', value: 'SOL' },
          { name: 'USD Coin (USDC)', value: 'USDC' },
          { name: 'Litecoin (LTC)', value: 'LTC' },
          { name: 'Bitcoin (BTC)', value: 'BTC' },
          { name: 'Bitcoin Cash (BCH)', value: 'BCH' }
        ))
    .addNumberOption(option =>
      option.setName('amount')
        .setDescription('The amount to withdraw')
        .setRequired(true))
];

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

    // For global commands (takes up to 1 hour to update)
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
    console.log('Commands registered:');
    data.forEach(cmd => console.log(`  • /${cmd.name}`));
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
