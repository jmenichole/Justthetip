const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

async function clearSlashCommands() {
  try {
    console.log('🗑️  Clearing all existing slash commands...');
    
    // Clear all application commands
    await rest.put(Routes.applicationCommands(process.env.APPLICATION_ID || 'YOUR_BOT_ID'), { body: [] });
    
    console.log('✅ Successfully cleared all slash commands!');
    console.log('🔄 Restart your bot to register the clean command set.');
  } catch (error) {
    console.error('❌ Error clearing commands:', error);
  }
}

clearSlashCommands();