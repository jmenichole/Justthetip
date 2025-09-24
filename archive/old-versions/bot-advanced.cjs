const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, REST, Routes, InteractionType } = require('discord.js');
require('dotenv-safe').config();
const db = require('./db/database.cjs');
const { createSolanaPayUrl } = require('./chains/solanaHelper.cjs');
const logger = require('./src/utils/logger.cjs');
const inputValidation = require('./src/validators/inputValidation.cjs');
const fs = require('fs');
const SolanaService = require('./chains/solanaService.cjs');

// Define the mint address for USDC on Solana mainnet-beta
const USDC_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
// Load fee wallet addresses
const feeWallets = require('./security/feeWallet.json');
// Fee rate (0.5%)
const FEE_RATE = 0.005;
function calculateFee(amount) {
  return Math.max(Math.floor(amount * FEE_RATE * 1e8) / 1e8, 0); // 8 decimals
}
function getFeeWallet(coin) {
  return feeWallets[coin.toUpperCase()] || null;
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });


client.once('clientReady', async () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);
  await db.connectDB();
  console.log('Database connected.');

  // Register slash commands only after client is ready
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Slash commands registered.');
  } catch (error) {
    console.error(error);
  }
});

// Register slash commands
const commands = [
  {
    name: 'balance',
    description: 'Show your off-chain balances',
  },
  {
    name: 'tip',
    description: 'Tip a user (off-chain)',
    options: [
      { name: 'user', type: 6, description: 'User to tip', required: true },
      { name: 'amount', type: 10, description: 'Amount to tip', required: true },
      { name: 'coin', type: 3, description: 'Coin to tip', required: true }
    ]
  },
  {
    name: 'airdrop',
    description: 'Create an airdrop for others to collect',
    options: [
      { name: 'amount', type: 10, description: 'Amount to airdrop', required: true },
      { name: 'coin', type: 3, description: 'Coin to airdrop', required: true },
      { name: 'users', type: 4, description: 'Number of users who can collect (optional)', required: false },
      { name: 'time', type: 3, description: 'Time window to collect (e.g. 10s, 30s, 1m)', required: false }
    ]
  },
  {
    name: 'withdraw',
    description: 'Request a balance deduction (manual withdrawal)',
    options: [
      { name: 'amount', type: 10, description: 'Amount to withdraw', required: true },
      { name: 'coin', type: 3, description: 'Coin to withdraw', required: true }
    ]
  },
  {
    name: 'deposit',
    description: 'Request a balance increase (manual deposit)',
    options: [
      { name: 'amount', type: 10, description: 'Amount to deposit', required: true },
      { name: 'coin', type: 3, description: 'Coin to deposit', required: true }
    ]
  },
  {
    name: 'burn',
    description: 'Donate your balance to support the community',
    options: [
      { name: 'coin', type: 3, description: 'Coin to burn', required: true }
    ]
  },
  {
    name: 'registerwallet',
    description: 'Register your wallet address (for reference only)',
    options: [
      { name: 'coin', type: 3, description: 'Coin', required: true },
      { name: 'address', type: 3, description: 'Your wallet address', required: true }
    ]
  },
  {
    name: 'help',
    description: 'Show help message',
  },
  {
    name: 'faq',
    description: 'Frequently Asked Questions about JustTheTip Bot',
  }
];



function isAdmin(member) {
  return member.roles.cache.some(role => role.name.toLowerCase() === 'admin');
}



const rateLimits = {};
function isRateLimited(userId, command, max = 5, windowMs = 60000) {
  const now = Date.now();
  if (!rateLimits[userId]) rateLimits[userId] = {};
  if (!rateLimits[userId][command] || now - rateLimits[userId][command].timestamp > windowMs) {
    rateLimits[userId][command] = { count: 1, timestamp: now };
    return false;
  }
  if (rateLimits[userId][command].count >= max) return true;
  rateLimits[userId][command].count++;
  return false;
}

// Add coin autocomplete for slash commands
const SUPPORTED_COINS = ['SOL'];

commands.forEach(cmd => {
  if (cmd.options) {
    cmd.options.forEach(opt => {
      if (opt.name === 'coin') {
        opt.autocomplete = true;
      }
    });
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isAutocomplete()) {
    const focused = interaction.options.getFocused();
    const filtered = SUPPORTED_COINS.filter(c => c.toLowerCase().startsWith(focused.toLowerCase()));
    await interaction.respond(filtered.map(c => ({ name: c, value: c })));
    return;
  }
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
  try {
    if (commandName === 'balance') {
      await interaction.deferReply({ ephemeral: true });
      const userId = interaction.user.id;
      const balances = await db.getBalances(userId);
      const embed = new EmbedBuilder()
        .setTitle('💜 Your Balances')
        .setColor(0x8e44ad)
        .setDescription(Object.entries(balances).map(([coin, amt]) => `> **${coin}:** \t${amt}`).join('\n'))
        .setFooter({ text: 'JustTheTip Bot', iconURL: client.user.displayAvatarURL() });
      // Always DM the user
      try {
        const dm = await interaction.user.createDM();
        await dm.send({ embeds: [embed] });
      } catch (e) {
        // ignore DM errors
      }
      if (interaction.channel && interaction.channel.type !== 1) {
        // Not a DM, reply in channel with notice
        await interaction.editReply({ content: 'Check your DMs for your balance!' });
      } else {
        await interaction.editReply({ content: 'Balance sent to your DM.' });
      }
    } else if (commandName === 'tip') {
      await interaction.deferReply({ ephemeral: true });
      const userId = interaction.user.id;
      const recipient = interaction.options.getUser('user');
      const amount = interaction.options.getNumber('amount');
      const coin = interaction.options.getString('coin');
      if (!inputValidation.isValidAmount(amount) || coin.toUpperCase() !== 'SOL') {
        return await interaction.editReply({ content: 'Invalid amount or unsupported coin' });
      }
      if (isRateLimited(interaction.user.id, commandName)) {
        return await interaction.editReply({ content: '⏳ Rate limit exceeded. Please wait before using this command again.' });
      }
      const fee = calculateFee(amount);
      const netAmount = amount - fee;
      const feeWallet = getFeeWallet(coin);
      await db.processTip(userId, recipient.id, netAmount, coin.toUpperCase());
      if (fee > 0 && feeWallet) {
        await db.creditBalance(feeWallet, fee, coin.toUpperCase());
      }
      const embed = new EmbedBuilder()
        .setTitle('💸 Tip Sent!')
        .setColor(0x6c63ff)
        .setDescription(`You tipped ${recipient} **${netAmount} ${coin.toUpperCase()}**!\nFee: **${fee} ${coin.toUpperCase()}** sent to the admin wallet.`)
        .setFooter({ text: 'JustTheTip Bot', iconURL: client.user.displayAvatarURL() });
      await interaction.editReply({ embeds: [embed] });
      // DM the recipient if possible
      try {
        const dm = await recipient.createDM();
        await dm.send(`You received a tip of **${netAmount} ${coin.toUpperCase()}** from <@${userId}>!`);
      } catch (e) {
        // ignore DM errors
      }
      // Log tip to log channel
      try {
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send({
            content: `Tip: <@${userId}> tipped <@${recipient.id}> **${netAmount} ${coin.toUpperCase()}** (Fee: ${fee})`
          });
        }
      } catch (e) {}
    } else if (commandName === 'airdrop') {
      await interaction.deferReply({ ephemeral: true });
      const userId = interaction.user.id;
      const amount = interaction.options.getNumber('amount');
      const coin = interaction.options.getString('coin');
      const maxUsers = interaction.options.getInteger('users') || 1;
      const timeStr = interaction.options.getString('time');
      let timeMs = 0;
      if (timeStr) {
        const match = timeStr.match(/(\d+)([sm]?)/i);
        if (match) {
          const val = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          if (unit === 'm') timeMs = val * 60000;
          else if (unit === 's' || unit === '') timeMs = val * 1000;
        }
      }
      if (!inputValidation.isValidAmount(amount) || coin.toUpperCase() !== 'SOL') {
        return await interaction.editReply({ content: 'Invalid amount or unsupported coin' });
      }
      if (isRateLimited(interaction.user.id, commandName)) {
        return await interaction.editReply({ content: '⏳ Rate limit exceeded. Please wait before using this command again.' });
      }
      const fee = calculateFee(amount);
      const netAmount = amount - fee;
      const feeWallet = getFeeWallet(coin);
      const embed = new EmbedBuilder()
        .setTitle('🎁 Airdrop!')
        .setDescription(`${interaction.user} is dropping **${netAmount} ${coin.toUpperCase()}**!\nClick Collect below!\nFee: **${fee} ${coin.toUpperCase()}** sent to the admin wallet.`)
        .setColor(0xe056fd)
        .setFooter({ text: 'JustTheTip Bot', iconURL: client.user.displayAvatarURL() });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('collect_airdrop')
          .setLabel('Collect')
          .setStyle(ButtonStyle.Success)
      );
      const airdropId = await db.createAirdrop({
        creator: userId,
        amount: netAmount,
        coin: coin.toUpperCase(),
        maxUsers,
        timeMs,
        created: Date.now(),
        guildId: interaction.guildId
      });
      if (fee > 0 && feeWallet) {
        await db.creditBalance(feeWallet, fee, coin.toUpperCase());
      }
      await interaction.editReply({ embeds: [embed], components: [row] });
      if (timeMs > 0) {
        setTimeout(async () => {
          await db.endAirdrop(airdropId);
          try {
            const airdrop = await db.getAirdrop(airdropId);
            const creatorUser = await client.users.fetch(airdrop.creator);
            if (creatorUser) {
              await creatorUser.send(`Your airdrop of **${airdrop.amount} ${airdrop.coin}** has ended. ${airdrop.claimedBy?.length || 0} user(s) claimed.`);
            }
          } catch (e) { logger.error('Failed to notify airdrop creator on end:', e); }
        }, timeMs);
      }
    } else if (commandName === 'withdraw') {
      await interaction.deferReply({ ephemeral: true });
      const userId = interaction.user.id;
      const amount = interaction.options.getNumber('amount');
      const coin = interaction.options.getString('coin');
      if (!inputValidation.isValidAmount(amount) || coin.toUpperCase() !== 'SOL') {
        return await interaction.editReply({ content: 'Invalid amount or unsupported coin.' });
      }
      const balances = await db.getBalances(userId);
      const bal = balances[coin.toUpperCase()] || 0;
      if (bal < amount) {
        return await interaction.editReply({ content: `Insufficient balance. You have ${bal} ${coin.toUpperCase()}.` });
      }
      const wallet = await db.getWallet(userId, coin);
      if (!wallet) {
        return await interaction.editReply({ content: `No registered ${coin.toUpperCase()} wallet found. Please use /registerwallet first.` });
      }
      await db.creditBalance(userId, -amount, coin.toUpperCase());
      // Automated on-chain transfer
      let txSig = null;
      let errorMsg = null;
      try {
        const from = (require('@solana/web3.js').Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.SOL_PRIVATE_KEY)))).publicKey.toBase58();
        txSig = await SolanaService.transferSOL(from, wallet, amount);
      } catch (err) {
        errorMsg = err.message || 'Unknown error during on-chain transfer.';
      }
      if (txSig) {
        const embed = new EmbedBuilder()
          .setTitle('🚀 Withdrawal Complete')
          .setColor(0x6c63ff)
          .setDescription(`Your withdrawal of **${amount} ${coin.toUpperCase()}** has been sent on-chain.\n\n**Destination:** \
${wallet}\n\n[View on Solana Explorer](https://explorer.solana.com/tx/${txSig})`)
          .setFooter({ text: 'JustTheTip Bot', iconURL: client.user.displayAvatarURL() });
        // Always DM the user
        try {
          const dm = await interaction.user.createDM();
          await dm.send({ embeds: [embed] });
        } catch (e) {}
        if (interaction.channel && interaction.channel.type !== 1) {
          await interaction.editReply({ content: 'Withdrawal complete! Check your DMs for details.' });
        } else {
          await interaction.editReply({ content: 'Withdrawal sent to your DM.' });
        }
        // Log withdrawal to log channel
        try {
          const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
          if (logChannel && logChannel.isTextBased()) {
            await logChannel.send({
              content: `Withdraw: <@${userId}> withdrew **${amount} ${coin.toUpperCase()}** to \
${wallet}\nTx: https://explorer.solana.com/tx/${txSig}`
            });
          }
        } catch (e) {}
      } else {
        await interaction.editReply({ content: `Your balance was debited, but the on-chain transfer failed: ${errorMsg}` });
        // Log failed withdrawal to log channel
        try {
          const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
          if (logChannel && logChannel.isTextBased()) {
            await logChannel.send({
              content: `FAILED Withdraw: <@${userId}> tried to withdraw **${amount} ${coin.toUpperCase()}** to \
${wallet}\nError: ${errorMsg}`
            });
          }
        } catch (e) {}
      }
    } else if (commandName === 'deposit') {
      await interaction.deferReply({ ephemeral: true });
      const userId = interaction.user.id;
      const amount = interaction.options.getNumber('amount');
      const coin = interaction.options.getString('coin');
      if (!inputValidation.isValidAmount(amount) || coin.toUpperCase() !== 'SOL') {
        return await interaction.editReply({ content: 'Invalid amount or unsupported coin.' });
      }
      await db.creditBalance(userId, amount, coin.toUpperCase());
      const embed = new EmbedBuilder()
        .setTitle('💰 Deposit Successful')
        .setColor(0x5f27cd)
        .setDescription(`Deposited **${amount} ${coin.toUpperCase()}** to your balance.`)
        .setFooter({ text: 'JustTheTip Bot', iconURL: client.user.displayAvatarURL() });
      // Always DM the user
      try {
        const dm = await interaction.user.createDM();
        await dm.send({ embeds: [embed] });
      } catch (e) {}
      if (interaction.channel && interaction.channel.type !== 1) {
        await interaction.editReply({ content: 'Deposit complete! Check your DMs for details.' });
      } else {
        await interaction.editReply({ content: 'Deposit sent to your DM.' });
      }
    } else if (commandName === 'burn') {
      await interaction.deferReply({ ephemeral: true });
      await interaction.editReply({ content: 'Burn/donate is not yet implemented. Please contact an admin.' });
    } else if (commandName === 'registerwallet') {
      await interaction.deferReply({ ephemeral: true });
      const userId = interaction.user.id;
      const coin = interaction.options.getString('coin');
      const address = interaction.options.getString('address');
      if (!coin || !address) {
        return await interaction.editReply({ content: 'You must provide both a coin and an address.' });
      }
      await db.registerWallet(userId, coin, address);
      await interaction.editReply({ content: `Your ${coin.toUpperCase()} address has been saved for reference.` });
    } else if (commandName === 'help') {
      await interaction.deferReply({ ephemeral: true });
      const helpMsg = [
        '**JustTheTip Bot Help**',
        '',
        'This bot lets you tip, airdrop, and manage crypto balances off-chain on Discord. All balances are stored securely and can be withdrawn to your own wallet at any time.',
        '',
        '**How It Works:**',
        '- Use `/deposit amount:<amt> coin:<coin>` to add to your off-chain balance (for demo/testing).',
        '- Use `/balance` to check your balances.',
        '- Use `/tip user:<@user> amount:<amt> coin:<coin>` to send a tip to another user.',
        '- Use `/airdrop amount:<amt> coin:<coin> users:<n> time:<window>` to create a claimable airdrop.',
        '- Click the "Collect" button on an airdrop to claim your share.',
        '- Use `/registerwallet coin:<coin> address:<address>` to save your own wallet address for reference.',
        '- Use `/withdraw amount:<amt> coin:<coin>` to request a withdrawal to your registered wallet (manual processing).',
        '',
        '**Supported Coins:**',
        '- SOL (Solana)',
        '',
        '**Commands:**',
        '- `/balance` — Show your balances',
        '- `/tip` — Tip a user',
        '- `/airdrop` — Create a claimable airdrop',
        '- `/deposit` — Add to your balance (demo)',
        '- `/registerwallet` — Save your wallet address for reference',
        '- `/withdraw` — Request a withdrawal',
        '- `/burn` — Donate your balance (not implemented)',
        '- `/help` — Show this help message',
        '',
        'For more info or support, contact an admin or visit the support server.'
      ].join('\n');
      await interaction.editReply({ content: helpMsg });
    } else if (commandName === 'faq') {
      await interaction.deferReply({ ephemeral: true });
      const embed = new EmbedBuilder()
        .setTitle('❓ FAQ & About JustTheTip Bot')
        .setColor(0x6c63ff)
        .setDescription([
          '**What is JustTheTip Bot?**',
          'A Discord bot for tipping, airdrops, and managing crypto balances off-chain, with on-chain withdrawals.',
          '',
          '**How do I keep my funds safe?**',
          '- Never share your private key with anyone.\n- Always withdraw to your own wallet for long-term storage.',
          '',
          '**Supported Coins:**',
          '- SOL (Solana)',
          '',
          '**Need help?**',
          'Contact an admin or visit the support server.'
        ].join('\n'))
        .setFooter({ text: 'JustTheTip Bot', iconURL: client.user.displayAvatarURL() });
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    logger.error('Interaction error:', error);
    try {
      if (interaction && interaction.deferred && !interaction.replied) {
        await interaction.editReply({ content: 'An error occurred while processing your command.' });
      } else if (interaction && interaction.replied) {
        await interaction.followUp({ content: 'An error occurred while processing your command.', ephemeral: true });
      } else if (interaction && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
      }
    } catch (err) {
      logger.error('Failed to send error reply to interaction:', err);
    }
  }
});

// Handle button interactions for airdrop collection (MongoDB, atomic, robust)
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'collect_airdrop') return;
  await interaction.deferReply({ ephemeral: true });
  // Get latest active airdrop from DB
  const airdrop = await db.getLatestActiveAirdrop();
  if (!airdrop) {
    return await interaction.editReply({ content: 'No active airdrop to collect.' });
  }
  const share = Math.floor((airdrop.amount / airdrop.maxUsers) * 1e8) / 1e8;
  // Atomically claim
  const claimResult = await db.claimAirdrop(airdrop._id.toString(), interaction.user.id, share);
  if (claimResult === 'already_claimed') {
    return await interaction.editReply({ content: 'You have already collected from this airdrop.' });
  }
  if (claimResult === 'ended') {
    return await interaction.editReply({ content: 'Airdrop is over or fully claimed.' });
  }
  if (claimResult !== 'claimed') {
    return await interaction.editReply({ content: 'Failed to claim airdrop. Please try again.' });
  }
  // Credit share to user, robust error handling
  let credited = false;
  try {
    await db.creditBalance(interaction.user.id, share, airdrop.coin);
    credited = true;
  } catch (e) {
    logger.error('Failed to credit airdrop share:', e);
    await interaction.editReply({ content: 'Airdrop claim failed due to a balance error. Please contact support.' });
    return;
  }
  await interaction.editReply({ content: `You collected **${share} ${airdrop.coin}** from the airdrop!` });

  // Logging channel and support server logging
  const LOG_CHANNEL_ID = '1414091527969439824';
  const SUPPORT_SERVER_ID = '1413961128522023024';
  try {
    // Log airdrop claim to log channel
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({
        content: `User <@${interaction.user.id}> collected **${share} ${airdrop.coin}** from an airdrop in server <#${interaction.guildId}>.`
      });
    }
    // Also log to support server if not already there
    if (interaction.guildId !== SUPPORT_SERVER_ID) {
      const supportServer = client.guilds.cache.get(SUPPORT_SERVER_ID);
      if (supportServer) {
        const supportLogChannel = await supportServer.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
        if (supportLogChannel && supportLogChannel.isTextBased()) {
          await supportLogChannel.send({
            content: `User <@${interaction.user.id}> collected **${share} ${airdrop.coin}** from an airdrop in server <#${interaction.guildId}>.`
          });
        }
      }
    }
  } catch (err) {
    logger.error('Failed to log airdrop claim to log/support channel:', err);
  }

  // Send DM with sensitive info and instructions
  try {
    const user = await interaction.user.createDM();
    let msg = `🎉 You collected **${share} ${airdrop.coin}** from an airdrop!\n`;
    msg += `\n**How to withdraw:** Use the /withdraw command in the server to move your balance to your own wallet.`;
    msg += `\n**How to register your wallet:** Use the /registerwallet command with your SOL address to link it for future tips/withdrawals.`;
    msg += `\n\n*Keep your wallet info secure. Never share your private key with anyone.*`;
    await user.send(msg);
  } catch (e) {
    logger.error('Failed to send DM to user after airdrop collect:', e);
    // Notify user in channel if DM fails
    await interaction.followUp({ content: '⚠️ Could not send you a DM. Please check your privacy settings.', ephemeral: true });
  }
});
// (Removed obsolete /collect command logic; now handled by button interaction and MongoDB)

// Register slash commands with Discord API (if needed)
// (This is a placeholder, actual registration logic may be needed)

client.login(process.env.BOT_TOKEN);
