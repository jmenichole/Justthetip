require('dotenv-safe').config({ allowEmptyValues: true });
const { REST, Routes } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('🗑️  Deleting all global application (/) commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    console.log('✅ Successfully deleted all global commands.');
    
    console.log('🗑️  Deleting all guild (/) commands...');
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: [] });
    console.log('✅ Successfully deleted all guild commands.');
    
    console.log('\n🔄 Restart your bot to re-register the correct commands.');
  } catch (error) {
    console.error(error);
  }
})();
