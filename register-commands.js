/**
 * Clear Old Slash Commands and Register New User-Friendly Commands
 * Run this script to update your Discord bot's slash commands
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
 * 
 * Usage: node register-commands.js
 */

const { REST, Routes } = require('discord.js');
require('dotenv').config();

// Define commands inline
const commands = [
  {
    name: 'register-wallet',
    description: 'Register your Solana wallet (supports Phantom, Solflare, WalletConnect & more)',
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
    name: 'sc-info',
    description: 'View smart contract bot information and program details'
  },
  {
    name: 'balance',
    description: 'Check your wallet balance'
  },
  {
    name: 'help',
    description: 'Show bot commands and wallet connection options'
  },
  {
    name: 'support',
    description: 'Get help or report an issue',
    options: [
      { name: 'issue', type: 3, description: 'Describe your problem or question', required: true }
    ]
  }
];

// Try different variable names
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APP_ID || '1419742988128616479';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID || '1413961128522023024'; // Optional: for faster testing

if (!DISCORD_BOT_TOKEN) {
  console.error('❌ Missing DISCORD_BOT_TOKEN in .env file');
  console.error('Current env keys:', Object.keys(process.env).filter(k => k.includes('DISCORD') || k.includes('BOT')));
  process.exit(1);
}

console.log(`✓ Using Client ID: ${CLIENT_ID}`);
console.log(`✓ Using Guild ID: ${GUILD_ID}`);

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

async function main() {
  try {
    console.log('🔄 Starting slash command registration...\n');

    // Step 1: Delete all existing commands
    console.log('🗑️  Deleting old commands...');
    
    if (GUILD_ID) {
      // Delete guild commands (faster for testing)
      const guildCommands = await rest.get(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
      );
      
      console.log(`   Found ${guildCommands.length} guild commands to delete`);
      
      for (const command of guildCommands) {
        await rest.delete(
          Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, command.id)
        );
        console.log(`   ✓ Deleted: ${command.name}`);
      }
    }
    
    // Delete global commands
    const globalCommands = await rest.get(
      Routes.applicationCommands(CLIENT_ID)
    );
    
    console.log(`   Found ${globalCommands.length} global commands to delete`);
    
    for (const command of globalCommands) {
      await rest.delete(
        Routes.applicationCommand(CLIENT_ID, command.id)
      );
      console.log(`   ✓ Deleted: ${command.name}`);
    }

    console.log('\n✅ All old commands deleted!\n');

    // Step 2: Register new commands
    console.log('📝 Registering new user-friendly commands...\n');

    let data;
    if (GUILD_ID) {
      // Register to specific guild (instant, for testing)
      data = await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands },
      );
      console.log(`✅ Successfully registered ${data.length} commands to guild ${GUILD_ID}`);
    } else {
      // Register globally (takes up to 1 hour to propagate)
      data = await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands },
      );
      console.log(`✅ Successfully registered ${data.length} global commands`);
      console.log('⏰ Note: Global commands may take up to 1 hour to update everywhere');
    }

    console.log('\n📋 Registered Commands:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    data.forEach((cmd, index) => {
      const emoji = index === 0 ? '✅' : index === data.length - 1 ? '🎉' : '•';
      console.log(`${emoji}  /${cmd.name} - ${cmd.description}`);
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 3: Show next steps
    console.log('🎯 Next Steps:');
    console.log('   1. Restart your Discord bot');
    console.log('   2. Type / in Discord to see new commands');
    console.log('   3. Test each command to ensure they work\n');
    
    console.log('💡 Command Highlights:');
    console.log('   • /register-wallet - Register your Solana wallet');
    console.log('   • /sc-tip - Create smart contract tips');
    console.log('   • /balance - Check your wallet balance');
    console.log('   • /help - User guide');
    console.log('   • /support - Get help\n');

    console.log('🎉 Command registration complete!\n');

  } catch (error) {
    console.error('\n❌ Error during command registration:');
    console.error(error);
    
    if (error.code === 50001) {
      console.error('\n💡 Missing Access: Bot lacks permissions');
      console.error('   Solution: Reinvite bot with applications.commands scope');
    } else if (error.code === 'ERR_INVALID_ARG_TYPE') {
      console.error('\n💡 Invalid Token: Check your DISCORD_BOT_TOKEN in .env');
    }
    
    process.exit(1);
  }
}

// Run the script
main();
