const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, REST, Routes, InteractionType } = require('discord.js');
require('dotenv-safe').config();
const db = require('./db/database');
const { createSolanaPayUrl } = require('./chains/solanaHelper');
const logger = require('./src/utils/logger');
const inputValidation = require('./src/validators/inputValidation');
const fs = require('fs');

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

client.once('ready', async () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);
  await db.connectDB();
  console.log('Database connected.');
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
      { name: 'coin', type: 3, description: 'Coin to airdrop', required: true }
    ]
  },
  {
    name: 'collect',
    description: 'Collect from the latest airdrop',
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
  }
];

commands.push(
  {
    name: 'setbalance',
    description: 'Admin: Set a user balance',
    options: [
      { name: 'user', type: 6, description: 'User', required: true },
      { name: 'coin', type: 3, description: 'Coin', required: true },
      { name: 'amount', type: 10, description: 'Amount', required: true }
    ]
  },
  {
    name: 'backup',
    description: 'Admin: Backup user/balance data',
  },
  {
    name: 'viewlogs',
    description: 'Admin: View recent logs',
  }
);

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Slash commands registered.');
  } catch (error) {
    console.error(error);
  }
})();

function isAdmin(member) {
  return member.roles.cache.some(role => role.name.toLowerCase() === 'admin');
}

const AIRDROP_FILE = './data/airdrops.json';
function saveAirdrops(airdrops) {
  fs.writeFileSync(AIRDROP_FILE, JSON.stringify(airdrops, null, 2));
}
function loadAirdrops() {
  try {
    return JSON.parse(fs.readFileSync(AIRDROP_FILE, 'utf8'));
  } catch {
    return {};
  }
}
let airdrops = loadAirdrops();

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
      const userId = interaction.user.id;
      const balances = await db.getBalances(userId);
      const embed = new EmbedBuilder()
        .setTitle('Your Balances')
        .setColor(0x3498db)
        .setDescription(Object.entries(balances).map(([coin, amt]) => `**${coin}:** ${amt}`).join('\n'));
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (commandName === 'tip') {
      const userId = interaction.user.id;
      const recipient = interaction.options.getUser('user');
      const amount = interaction.options.getNumber('amount');
  const coin = interaction.options.getString('coin');
  if (!inputValidation.isValidAmount(amount) || coin.toUpperCase() !== 'SOL') {
        return interaction.reply({ content: 'Invalid amount or unsupported coin', ephemeral: true });
      }
      if (isRateLimited(interaction.user.id, commandName)) {
        return await interaction.reply({ content: '⏳ Rate limit exceeded. Please wait before using this command again.', ephemeral: true });
      }
      const fee = calculateFee(amount);
      const netAmount = amount - fee;
      const feeWallet = getFeeWallet(coin);
      await db.processTip(userId, recipient.id, netAmount, coin.toUpperCase());
      if (fee > 0 && feeWallet) {
        await db.creditBalance(feeWallet, fee, coin.toUpperCase());
      }
      const embed = new EmbedBuilder()
        .setTitle('Tip Sent!')
        .setColor(0x2ecc71)
        .setDescription(`You tipped ${recipient} **${netAmount} ${coin.toUpperCase()}**!\nFee: **${fee} ${coin.toUpperCase()}** sent to the admin wallet.`);
      await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'airdrop') {
      const userId = interaction.user.id;
      const amount = interaction.options.getNumber('amount');
  const coin = interaction.options.getString('coin');
  if (!inputValidation.isValidAmount(amount) || coin.toUpperCase() !== 'SOL') {
        return interaction.reply({ content: 'Invalid amount or unsupported coin', ephemeral: true });
      }
      if (isRateLimited(interaction.user.id, commandName)) {
        return await interaction.reply({ content: '⏳ Rate limit exceeded. Please wait before using this command again.', ephemeral: true });
      }
      const fee = calculateFee(amount);
      const netAmount = amount - fee;
      const feeWallet = getFeeWallet(coin);
      const embed = new EmbedBuilder()
        .setTitle('Airdrop!')
        .setDescription(`${interaction.user} is dropping **${netAmount} ${coin.toUpperCase()}**! First to collect gets it!\nFee: **${fee} ${coin.toUpperCase()}** sent to the admin wallet.`)
        .setColor(0x00ff99);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('collect_airdrop')
          .setLabel('Collect')
          .setStyle(ButtonStyle.Success)
      );
      // Store airdrop state with unique ID
      const airdropId = `${Date.now()}_${interaction.user.id}`;
      airdrops[airdropId] = { creator: interaction.user.id, amount: netAmount, coin: coin.toUpperCase(), claimed: false };
      saveAirdrops(airdrops);
      if (fee > 0 && feeWallet) {
        await db.creditBalance(feeWallet, fee, coin.toUpperCase());
      }
      await interaction.reply({ embeds: [embed], components: [row] });
    } else if (commandName === 'collect') {
      const userId = interaction.user.id;
      // Find the latest airdrop for this user
      const userAirdrops = Object.entries(airdrops).filter(([id, airdrop]) => airdrop.creator === userId && !airdrop.claimed);
      if (userAirdrops.length === 0) {
        return interaction.reply({ content: 'No airdrops available to collect.', ephemeral: true });
      }
      const [airdropId, airdrop] = userAirdrops[0];
      // Update the airdrop as claimed
      airdrops[airdropId].claimed = true;
      saveAirdrops(airdrops);
      // Credit the amount to the user balance
      await db.creditBalance(userId, airdrop.amount, airdrop.coin);
      const embed = new EmbedBuilder()
        .setTitle('Airdrop Collected!')
        .setColor(0xf1c40f)
        .setDescription('Funds credited to your internal balance.');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (commandName === 'withdraw') {
      const userId = interaction.user.id;
      const amount = interaction.options.getNumber('amount');
  const coin = interaction.options.getString('coin');
  if (!inputValidation.isValidAmount(amount) || coin.toUpperCase() !== 'SOL') {
        return interaction.reply({ content: 'Invalid amount or unsupported coin', ephemeral: true });
      }
      const fee = calculateFee(amount);
      const netAmount = amount - fee;
      const feeWallet = getFeeWallet(coin);
      // ...deduct netAmount from user, fee to feeWallet...
      if (fee > 0 && feeWallet) {
        await db.creditBalance(feeWallet, fee, coin.toUpperCase());
      }
      const embed = new EmbedBuilder()
        .setTitle('Withdraw Request')
        .setColor(0xe67e22)
        .setDescription(`Your balance has been updated. Withdrawable: **${netAmount} ${coin.toUpperCase()}**.\nFee: **${fee} ${coin.toUpperCase()}** sent to the admin wallet. Please send your crypto yourself using your own wallet. This bot does NOT send or receive real crypto.`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (commandName === 'deposit') {
      const embed = new EmbedBuilder()
        .setTitle('Deposit Instructions')
        .setColor(0x9b59b6)
        .setDescription('To increase your balance, send proof of your on-chain deposit to an admin or in the designated channel. This bot does NOT hold or receive real crypto.');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (commandName === 'burn') {
      const userId = interaction.user.id;
      const coin = interaction.options.getString('coin');
      if (!inputValidation.isSupportedCoin(coin)) {
        return interaction.reply({ content: 'Unsupported coin', ephemeral: true });
      }
      // ...burn logic...
      const embed = new EmbedBuilder()
        .setTitle('Thank You!')
        .setColor(0xe74c3c)
        .setDescription(`All your ${coin.toUpperCase()} has been burned to support the community.`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (commandName === 'registerwallet') {
      const userId = interaction.user.id;
      const coin = interaction.options.getString('coin');
      const address = interaction.options.getString('address');
      if (!inputValidation.isSupportedCoin(coin) || !inputValidation.isValidAddress(address, coin)) {
        return interaction.reply({ content: 'Invalid address or unsupported coin', ephemeral: true });
      }
      // ...register wallet logic...
      const embed = new EmbedBuilder()
        .setTitle('Wallet Registered')
        .setColor(0x1abc9c)
        .setDescription(`Wallet for ${coin.toUpperCase()} registered!`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('JustTheTip Helper Bot')
        .setColor(0x7289da)
        .setDescription(HELP_MESSAGE);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (commandName === 'setbalance' || commandName === 'backup' || commandName === 'viewlogs') {
      if (!isAdmin(interaction.member)) {
        return await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }
      if (commandName === 'setbalance') {
        const user = interaction.options.getUser('user');
        const coin = interaction.options.getString('coin');
        const amount = interaction.options.getNumber('amount');
        // ...set balance logic...
        await interaction.reply({ content: `Set ${user}'s ${coin.toUpperCase()} balance to ${amount}.`, ephemeral: true });
      } else if (commandName === 'help') {
        const embed = new EmbedBuilder()
          .setTitle('JustTheTip Bot Help')
          .setColor(0x7289da)
          .setDescription('Supported commands:\n' +
            '/balance — Show your SOL balance\n' +
            '/tip @user amount — Tip a user in SOL\n' +
            '/registerwallet address — Register your SOL wallet address\n' +
            '/withdraw address amount — Withdraw to external wallet\n' +
            '/deposit — Get deposit instructions\n' +
            '/airdrop amount — Create an airdrop for others to collect\n' +
            '/collect — Collect from the latest airdrop\n' +
            '/burn amount — Donate to support development\n' +
            '/help — Show this help message')
          .addFields({ name: 'Supported Coin', value: 'Only SOL (Solana) is supported.' });
        await interaction.reply({ embeds: [embed], ephemeral: true });
