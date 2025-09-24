const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('🔄 Testing application info...');
    
    const appInfo = await rest.get(Routes.oauth2CurrentApplication());
    console.log('✅ Application found:', appInfo.name, 'ID:', appInfo.id);
    
    if (appInfo.id !== process.env.CLIENT_ID) {
      console.log('⚠️ CLIENT_ID mismatch!');
      console.log('Expected:', process.env.CLIENT_ID);
      console.log('Actual:', appInfo.id);
    } else {
      console.log('✅ CLIENT_ID matches!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
