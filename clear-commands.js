/**
 * JustTheTip - Clear Discord Slash Commands
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * 
 * This file is part of JustTheTip.
 * 
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * See LICENSE file in the project root for full license information.
 * 
 * SPDX-License-Identifier: MIT
 * 
 * This software may not be sold commercially without permission.
 */

require('dotenv-safe').config({ allowEmptyValues: true });
const { REST, Routes } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('🗑️  Deleting all global application (/) commands...');
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: [] });
    console.log('✅ Successfully deleted all global commands.');
    
    console.log('🗑️  Deleting all guild (/) commands...');
    await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.GUILD_ID), { body: [] });
    console.log('✅ Successfully deleted all guild commands.');
    
    console.log('\n🔄 Restart your bot to re-register the correct commands.');
  } catch (error) {
    console.error(error);
  }
})();
