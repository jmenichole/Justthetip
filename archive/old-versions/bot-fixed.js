const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const { getSolBalance, sendSol, getUsdcBalance, sendUsdc } = require('./chains/solana');
const { getLtcBalance, sendLtc } = require('./chains/litecoin');
const { getBtcBalance, sendBtc } = require('./chains/bitcoin');
const { getBchBalance, sendBch } = require('./chains/bitcoincash');
const db = require('./db/database');
const SolanaService = require('./chains/solanaService');
const LitecoinService = require('./chains/litecoinService');

// In-memory airdrop state (for demo; replace with persistent storage for production)
const airdrops = {};

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => console.log(`🟢 Logged in as ${client.user.tag}`));

client.on('messageCreate', async msg => {
  if (msg.author.bot) return;

  const [cmd, ...args] = msg.content.trim().split(/\s+/);

  if (cmd === '!help') {
    msg.reply(
      '**JustTheTip Bot Commands:**\n' +
      '`!balance` - Show your SOL and LTC balances\n' +
      '`!tip @user amount coin` - Tip a user (e.g. !tip @bob 0.1 sol)\n' +
      '`!registerwallet coin address` - Register your wallet address\n' +
      '`!withdraw address amount coin` - Withdraw to external wallet\n' +
      '`!deposit` - Get deposit instructions\n' +
      '`!airdrop amount coin` - Create an airdrop for others to collect\n' +
      '`!collect` - Collect from the latest airdrop (if available)\n' +
      '`!help` - Show this help message'
    );
    return;
  }

  if (cmd === '!balance') {
    const userId = msg.author.id;
    const sol = db.getBalance(userId, 'SOL');
    const usdc = db.getBalance(userId, 'USDC');
    const ltc = db.getBalance(userId, 'LTC');
    const btc = db.getBalance(userId, 'BTC');
    const bch = db.getBalance(userId, 'BCH');
    try {
      await msg.author.send(
        `💰 **Your Balances:**\n` +
        `• Solana: ${sol} SOL\n` +
        `• USDC: ${usdc} USDC\n` +
        `• Litecoin: ${ltc} LTC\n` +
        `• Bitcoin: ${btc} BTC\n` +
        `• Bitcoin Cash: ${bch} BCH`
      );
      if (msg.channel.type !== 1) {
        msg.reply('📬 I have sent your balance in a private message.');
      }
    } catch (e) {
      msg.reply('❌ I could not send you a DM. Please check your privacy settings.');
    }
    return;
  }

  if (cmd === '!registerwallet') {
    const [coin, address] = args;
    if (!coin || !address) {
      msg.reply('❌ Usage: `!registerwallet coin address`');
      return;
    }
    const coinU = coin.toUpperCase();
    if (!['SOL', 'LTC', 'BCH', 'BTC', 'USDC'].includes(coinU)) {
      msg.reply('❌ Supported coins: SOL, USDC, LTC, BTC, BCH');
      return;
    }
    db.registerWallet(msg.author.id, coinU, address);
    msg.reply(`✅ Registered ${coinU} address: ${address}`);
    return;
  }

  if (cmd === '!tip') {
    if (args.length !== 3) {
      msg.reply('❌ Usage: `!tip @user amount coin`');
      return;
    }
    const [mention, amountStr, coin] = args;
    const coinU = coin.toUpperCase();
    const amount = parseFloat(amountStr);
    if (!mention.startsWith('<@') || isNaN(amount) || amount <= 0 || !['SOL', 'LTC', 'BTC', 'BCH', 'USDC'].includes(coinU)) {
      msg.reply('❌ Invalid command. Example: `!tip @user 0.1 sol`');
      return;
    }
    const targetId = mention.replace(/[^0-9]/g, '');
    if (targetId === msg.author.id) {
      msg.reply("❌ You can't tip yourself!");
      return;
    }
    const senderBal = db.getBalance(msg.author.id, coinU);
    if (senderBal < amount) {
      msg.reply(`❌ Insufficient ${coinU} balance.`);
      return;
    }

    // On-chain transactions
    try {
      if (coinU === 'SOL') {
        const recipientWallet = db.getWallet(targetId, 'SOL');
        if (!recipientWallet) {
          msg.reply('❌ Recipient must register their SOL wallet first.');
          return;
        }
        const txid = await sendSol(recipientWallet, amount);
        db.updateBalance(msg.author.id, coinU, senderBal - amount);
        db.updateBalance(targetId, coinU, db.getBalance(targetId, coinU) + amount);
        db.addHistory(msg.author.id, { type: 'tip', to: targetId, coin: coinU, amount, txid, date: new Date() });
        db.addHistory(targetId, { type: 'receive', from: msg.author.id, coin: coinU, amount, txid, date: new Date() });
        msg.reply(`✅ Sent ${amount} ${coinU} to <@${targetId}>! [View on Solana Explorer](https://explorer.solana.com/tx/${txid})`);
      } else if (coinU === 'LTC') {
        const recipientWallet = db.getWallet(targetId, 'LTC');
        if (!recipientWallet) {
          msg.reply('❌ Recipient must register their LTC wallet first.');
          return;
        }
        const txid = await sendLtc(recipientWallet, amount);
        db.updateBalance(msg.author.id, coinU, senderBal - amount);
        db.updateBalance(targetId, coinU, db.getBalance(targetId, coinU) + amount);
        db.addHistory(msg.author.id, { type: 'tip', to: targetId, coin: coinU, amount, txid, date: new Date() });
        db.addHistory(targetId, { type: 'receive', from: msg.author.id, coin: coinU, amount, txid, date: new Date() });
        msg.reply(`✅ Sent ${amount} ${coinU} to <@${targetId}>! [View on BlockCypher](https://live.blockcypher.com/ltc/tx/${txid})`);
      } else if (coinU === 'BCH') {
        const recipientWallet = db.getWallet(targetId, 'BCH');
        if (!recipientWallet) {
          msg.reply('❌ Recipient must register their BCH wallet first.');
          return;
        }
        const txid = await sendBch(recipientWallet, amount);
        db.updateBalance(msg.author.id, coinU, senderBal - amount);
        db.updateBalance(targetId, coinU, db.getBalance(targetId, coinU) + amount);
        db.addHistory(msg.author.id, { type: 'tip', to: targetId, coin: coinU, amount, txid, date: new Date() });
        db.addHistory(targetId, { type: 'receive', from: msg.author.id, coin: coinU, amount, txid, date: new Date() });
        msg.reply(`✅ Sent ${amount} ${coinU} to <@${targetId}>! [View on Blockchair](https://blockchair.com/bitcoin-cash/transaction/${txid})`);
      } else if (coinU === 'BTC') {
        // Placeholder for BTC tip logic
        msg.reply('⚠️ BTC tipping not yet implemented.');
        return;
      } else if (coinU === 'USDC') {
        const recipientWallet = db.getWallet(targetId, 'SOL');
        if (!recipientWallet) {
          msg.reply('❌ Recipient must register their SOL wallet first.');
          return;
        }
        const txid = await sendUsdc(recipientWallet, amount);
        db.updateBalance(msg.author.id, coinU, senderBal - amount);
        db.updateBalance(targetId, coinU, db.getBalance(targetId, coinU) + amount);
        db.addHistory(msg.author.id, { type: 'tip', to: targetId, coin: coinU, amount, txid, date: new Date() });
        db.addHistory(targetId, { type: 'receive', from: msg.author.id, coin: coinU, amount, txid, date: new Date() });
        msg.reply(`✅ Sent ${amount} ${coinU} to <@${targetId}>! [View on Solana Explorer](https://explorer.solana.com/tx/${txid})`);
      }
    } catch (e) {
      msg.reply(`❌ On-chain tip failed: ${e.message}`);
    }
    return;
  }

  if (cmd === '!withdraw') {
    const [address, amountStr, coin] = args;
    const coinU = coin?.toUpperCase();
    const amount = parseFloat(amountStr);
    if (!address || isNaN(amount) || amount <= 0 || !['SOL', 'LTC', 'BTC', 'BCH', 'USDC'].includes(coinU)) {
      msg.reply('❌ Usage: `!withdraw address amount coin`');
      return;
    }
    const userId = msg.author.id;
    const bal = db.getBalance(userId, coinU);
    if (bal < amount) {
      msg.reply(`❌ Insufficient ${coinU} balance.`);
      return;
    }
    try {
      if (coinU === 'SOL') {
        const fromWallet = db.getWallet(userId, 'SOL');
        if (!fromWallet) {
          msg.reply('❌ You must register your SOL wallet first.');
          return;
        }
        const txid = await sendSol(address, amount);
        db.updateBalance(userId, coinU, bal - amount);
        db.addHistory(userId, { type: 'withdraw', address, coin: coinU, amount, txid, date: new Date() });
        msg.reply(`⏳ Withdrawal of ${amount} ${coinU} to ${address} sent! [View on Solana Explorer](https://explorer.solana.com/tx/${txid})`);
      } else if (coinU === 'LTC') {
        const fromWallet = db.getWallet(userId, 'LTC');
        if (!fromWallet) {
          msg.reply('❌ You must register your LTC wallet first.');
          return;
        }
        const txid = await sendLtc(address, amount);
        db.updateBalance(userId, coinU, bal - amount);
        db.addHistory(userId, { type: 'withdraw', address, coin: coinU, amount, txid, date: new Date() });
        msg.reply(`⏳ Withdrawal of ${amount} ${coinU} to ${address} sent! [View on BlockCypher](https://live.blockcypher.com/ltc/tx/${txid})`);
      } else if (coinU === 'BCH') {
        const fromWallet = db.getWallet(userId, 'BCH');
        if (!fromWallet) {
          msg.reply('❌ You must register your BCH wallet first.');
          return;
        }
        const txid = await sendBch(address, amount);
        db.updateBalance(userId, coinU, bal - amount);
        db.addHistory(userId, { type: 'withdraw', address, coin: coinU, amount, txid, date: new Date() });
        msg.reply(`⏳ Withdrawal of ${amount} ${coinU} to ${address} sent! [View on Blockchair](https://blockchair.com/bitcoin-cash/transaction/${txid})`);
      } else if (coinU === 'BTC') {
        // Placeholder for BTC withdraw logic
        msg.reply('⚠️ BTC withdrawal not yet implemented.');
        return;
      } else if (coinU === 'USDC') {
        const fromWallet = db.getWallet(userId, 'SOL');
        if (!fromWallet) {
          msg.reply('❌ You must register your SOL wallet first.');
          return;
        }
        const txid = await sendUsdc(address, amount);
        db.updateBalance(userId, coinU, bal - amount);
        db.addHistory(userId, { type: 'withdraw', address, coin: coinU, amount, txid, date: new Date() });
        msg.reply(`⏳ Withdrawal of ${amount} ${coinU} to ${address} sent! [View on Solana Explorer](https://explorer.solana.com/tx/${txid})`);
      }
    } catch (e) {
      msg.reply(`❌ Withdrawal failed: ${e.message}`);
    }
    return;
  }

  if (cmd === '!deposit') {
    const userId = msg.author.id;
    const solWallet = db.getWallet(userId, 'SOL') || 'Not registered';
    const ltcWallet = db.getWallet(userId, 'LTC') || 'Not registered';
    const btcWallet = db.getWallet(userId, 'BTC') || 'Not registered';
    const bchWallet = db.getWallet(userId, 'BCH') || 'Not registered';
    try {
      await msg.author.send(
        `**💳 Deposit Instructions:**\n\n` +
        `**Solana (SOL/USDC):** ${solWallet}\n` +
        `**Litecoin (LTC):** ${ltcWallet}\n` +
        `**Bitcoin (BTC):** ${btcWallet}\n` +
        `**Bitcoin Cash (BCH):** ${bchWallet}\n\n` +
        `❗ **Important:** Only send coins to the matching network address!\n` +
        `💡 Use \`!registerwallet coin address\` to update your addresses.`
      );
      if (msg.channel.type !== 1) {
        msg.reply('📬 I have sent your deposit instructions in a private message.');
      }
    } catch (e) {
      msg.reply('❌ I could not send you a DM. Please check your privacy settings.');
    }
    return;
  }

  if (cmd === '!airdrop') {
    if (args.length !== 2) {
      msg.reply('❌ Usage: `!airdrop amount coin` (e.g. !airdrop 0.1 sol)');
      return;
    }
    const amount = parseFloat(args[0]);
    const coinU = args[1].toUpperCase();
    if (isNaN(amount) || amount <= 0 || !['SOL', 'LTC', 'BTC', 'BCH', 'USDC'].includes(coinU)) {
      msg.reply('❌ Invalid command. Example: `!airdrop 0.1 sol`');
      return;
    }
    const userId = msg.author.id;
    const bal = db.getBalance(userId, coinU);
    if (bal < amount) {
      msg.reply(`❌ Insufficient ${coinU} balance.`);
      return;
    }
    
    // Create airdrop
    const airdropId = `${userId}_${Date.now()}`;
    airdrops[airdropId] = {
      creator: userId,
      coin: coinU,
      amount: amount,
      claimed: false,
      createdAt: new Date()
    };
    
    db.updateBalance(userId, coinU, bal - amount);
    db.addHistory(userId, { type: 'airdrop_create', coin: coinU, amount, airdropId, date: new Date() });
    msg.reply(`🎁 Created an airdrop of ${amount} ${coinU}! Others can use \`!collect\` to claim it.`);
    return;
  }

  if (cmd === '!collect') {
    const userId = msg.author.id;
    let collected = false;
    
    // Find an unclaimed airdrop
    for (const [airdropId, drop] of Object.entries(airdrops)) {
      if (!drop.claimed && drop.creator !== userId) {
        const userWallet = db.getWallet(userId, drop.coin === 'USDC' ? 'SOL' : drop.coin);
        if (!userWallet) {
          msg.reply(`❌ You must register your ${drop.coin === 'USDC' ? 'SOL' : drop.coin} wallet first to collect ${drop.coin}.`);
          return;
        }
        
        try {
          if (drop.coin === 'SOL') {
            const txid = await sendSol(userWallet, drop.amount);
            db.updateBalance(userId, drop.coin, db.getBalance(userId, drop.coin) + drop.amount);
            drop.claimed = true;
            db.addHistory(userId, { type: 'collect', coin: drop.coin, amount: drop.amount, from: drop.creator, txid, date: new Date() });
            msg.reply(`🎉 You collected ${drop.amount} ${drop.coin} from the airdrop! [View on Solana Explorer](https://explorer.solana.com/tx/${txid})`);
            collected = true;
            break;
          } else if (drop.coin === 'LTC') {
            const txid = await sendLtc(userWallet, drop.amount);
            db.updateBalance(userId, drop.coin, db.getBalance(userId, drop.coin) + drop.amount);
            drop.claimed = true;
            db.addHistory(userId, { type: 'collect', coin: drop.coin, amount: drop.amount, from: drop.creator, txid, date: new Date() });
            msg.reply(`🎉 You collected ${drop.amount} ${drop.coin} from the airdrop! [View on BlockCypher](https://live.blockcypher.com/ltc/tx/${txid})`);
            collected = true;
            break;
          } else if (drop.coin === 'BCH') {
            const txid = await sendBch(userWallet, drop.amount);
            db.updateBalance(userId, drop.coin, db.getBalance(userId, drop.coin) + drop.amount);
            drop.claimed = true;
            db.addHistory(userId, { type: 'collect', coin: drop.coin, amount: drop.amount, from: drop.creator, txid, date: new Date() });
            msg.reply(`🎉 You collected ${drop.amount} ${drop.coin} from the airdrop! [View on Blockchair](https://blockchair.com/bitcoin-cash/transaction/${txid})`);
            collected = true;
            break;
          } else if (drop.coin === 'BTC') {
            // Placeholder for BTC airdrop collect logic
            msg.reply('⚠️ BTC airdrop collection not yet implemented.');
            return;
          } else if (drop.coin === 'USDC') {
            const txid = await sendUsdc(userWallet, drop.amount);
            db.updateBalance(userId, drop.coin, db.getBalance(userId, drop.coin) + drop.amount);
            drop.claimed = true;
            db.addHistory(userId, { type: 'collect', coin: drop.coin, amount: drop.amount, from: drop.creator, txid, date: new Date() });
            msg.reply(`🎉 You collected ${drop.amount} ${drop.coin} from the airdrop! [View on Solana Explorer](https://explorer.solana.com/tx/${txid})`);
            collected = true;
            break;
          }
        } catch (e) {
          msg.reply(`❌ Failed to collect airdrop: ${e.message}`);
          return;
        }
      }
    }
    if (!collected) {
      msg.reply('❌ No available airdrops to collect.');
    }
    return;
  }

  // BURN: !burn amount coin
  if (cmd === '!burn') {
    if (args.length !== 2) {
      msg.reply('❌ Usage: `!burn amount coin` (e.g. !burn 0.1 sol)');
      return;
    }
    const amount = parseFloat(args[0]);
    const coinU = args[1].toUpperCase();
    if (isNaN(amount) || amount <= 0 || !['SOL', 'LTC', 'BTC', 'BCH', 'USDC'].includes(coinU)) {
      msg.reply('❌ Invalid command. Example: `!burn 0.1 sol`');
      return;
    }
    const userId = msg.author.id;
    const bal = db.getBalance(userId, coinU);
    if (bal < amount) {
      msg.reply(`❌ Insufficient ${coinU} balance.`);
      return;
    }
    // Set your donation wallet addresses here:
    const donationAddresses = {
      'SOL': 'H8m2gN2GEPSbk4u6PoWa8JYkEZRJWH45DyWjbAm76uCX',
      'LTC': 'LP7AApgqKnJhPQgpBKFiHzPJSNXP7ygMDQ',
      'BTC': 'bc1qexampleaddressforbtc',
      'BCH': 'bitcoincash:qexampleaddressforbch',
      'USDC': 'H8m2gN2GEPSbk4u6PoWa8JYkEZRJWH45DyWjbAm76uCX' // Example: same as SOL
    };
    const donationAddress = donationAddresses[coinU];
    if (!donationAddress) {
      msg.reply('❌ Donation address not set for this coin.');
      return;
    }
    try {
      const fromWallet = db.getWallet(userId, coinU === 'USDC' ? 'SOL' : coinU);
      if (!fromWallet) {
        msg.reply(`❌ You must register your ${coinU === 'USDC' ? 'SOL' : coinU} wallet first.`);
        return;
      }
      let txid;
      if (coinU === 'SOL') {
        txid = await sendSol(donationAddress, amount);
      } else if (coinU === 'LTC') {
        txid = await sendLtc(donationAddress, amount);
      } else if (coinU === 'BCH') {
        txid = await sendBch(donationAddress, amount);
      } else if (coinU === 'USDC') {
        txid = await sendUsdc(donationAddress, amount);
      } else if (coinU === 'BTC') {
        msg.reply('⚠️ BTC donation not yet implemented.');
        return;
      }
      db.updateBalance(userId, coinU, bal - amount);
      db.addHistory(userId, { type: 'burn', address: donationAddress, coin: coinU, amount, txid, date: new Date() });
      let explorer = coinU === 'SOL' || coinU === 'USDC' ? `https://explorer.solana.com/tx/${txid}` : coinU === 'LTC' ? `https://live.blockcypher.com/ltc/tx/${txid}` : coinU === 'BCH' ? `https://blockchair.com/bitcoin-cash/transaction/${txid}` : '';
      msg.reply(`🔥 Donated ${amount} ${coinU} to support development!${explorer ? ` [View on Explorer](${explorer})` : ''}`);
    } catch (e) {
      msg.reply(`❌ Donation failed: ${e.message}`);
    }
    return;
  }
});

// Connect to the database before starting the bot
(async () => {
  try {
    await db.connectToDatabase();
    console.log('Database connection established');
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
})();

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'help') {
    await interaction.reply(
      '**JustTheTip Bot Commands:**\n' +
      '`/balance` - Show your SOL and LTC balances\n' +
      '`/tip @user amount coin` - Tip a user (e.g. /tip @bob 0.1 sol)\n' +
      '`/registerwallet coin address` - Register your wallet address\n' +
      '`/withdraw address amount coin` - Withdraw to external wallet\n' +
      '`/deposit` - Get deposit instructions\n' +
      '`/airdrop amount coin` - Create an airdrop for others to collect\n' +
      '`/collect` - Collect from the latest airdrop (if available)\n' +
      '`/help` - Show this help message'
    );
  }

  if (interaction.commandName === 'balance') {
    const userId = interaction.user.id;
    const sol = db.getBalance(userId, 'SOL');
    const ltc = db.getBalance(userId, 'LTC');
    await interaction.reply({
      content: `💰 Your balances:\n• Solana: ${sol} SOL\n• Litecoin: ${ltc} LTC`,
      ephemeral: true
    });
    return;
  }
});

client.login(process.env.BOT_TOKEN);