const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands and features'),
    
  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your cryptocurrency balances'),
    
  new SlashCommandBuilder()
    .setName('registerwallet')
    .setDescription('Register your external wallet address')
    .addStringOption(option =>
      option.setName('coin')
        .setDescription('The cryptocurrency (SOL, USDC, LTC, BTC, BCH)')
        .setRequired(true)
        .addChoices(
          { name: 'Solana (SOL)', value: 'SOL' },
          { name: 'USD Coin (USDC)', value: 'USDC' }
        ))
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Your wallet address')
        .setRequired(true)),
        
  new SlashCommandBuilder()
    .setName('airdrop')
    .setDescription('Create an airdrop for other users to collect')
    .addNumberOption(option =>
      option.setName('amount')
        .setDescription('Amount to airdrop')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('coin')
        .setDescription('Cryptocurrency to airdrop')
        .setRequired(true)
        .addChoices(
          { name: 'Solana (SOL)', value: 'SOL' },
          { name: 'USD Coin (USDC)', value: 'USDC' }
        )),
];

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

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
