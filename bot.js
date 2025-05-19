const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const { getSolBalance, sendSol } = require('./chains/solana');
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
    const ltc = db.getBalance(userId, 'LTC');
    try {
      await msg.author.send(`💰 Your balances:\n• Solana: ${sol} SOL\n• Litecoin: ${ltc} LTC`);
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
    db.registerWallet(msg.author.id, coin, address);
    msg.reply(`✅ Registered ${coin.toUpperCase()} address: ${address}`);
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
    if (!mention.startsWith('<@') || isNaN(amount) || amount <= 0 || !['SOL', 'LTC', 'BTC', 'BCH'].includes(coinU)) {
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
    const recipientWallet = db.getWallet(targetId, coinU);
    if (!recipientWallet) {
      msg.reply(`❌ That user has not registered a ${coinU} wallet.`);
      return;
    }
    try {
      if (coinU === 'SOL') {
        const fromWallet = db.getWallet(msg.author.id, 'SOL');
        if (!fromWallet) {
          msg.reply('❌ You must register your SOL wallet first.');
          return;
        }
        const txid = await sendSol(recipientWallet, amount);
        db.updateBalance(msg.author.id, coinU, senderBal - amount);
        db.updateBalance(targetId, coinU, db.getBalance(targetId, coinU) + amount);
        db.addHistory(msg.author.id, { type: 'tip', to: targetId, coin: coinU, amount, txid, date: new Date() });
        db.addHistory(targetId, { type: 'receive', from: msg.author.id, coin: coinU, amount, txid, date: new Date() });
        msg.reply(`✅ Sent ${amount} ${coinU} to <@${targetId}>! [View on Solana Explorer](https://explorer.solana.com/tx/${txid})`);
      } else if (coinU === 'LTC') {
        const fromWallet = db.getWallet(msg.author.id, 'LTC');
        if (!fromWallet) {
          msg.reply('❌ You must register your LTC wallet first.');
          return;
        }
        const txid = await sendLtc(recipientWallet, amount);
        db.updateBalance(msg.author.id, coinU, senderBal - amount);
        db.updateBalance(targetId, coinU, db.getBalance(targetId, coinU) + amount);
        db.addHistory(msg.author.id, { type: 'tip', to: targetId, coin: coinU, amount, txid, date: new Date() });
        db.addHistory(targetId, { type: 'receive', from: msg.author.id, coin: coinU, amount, txid, date: new Date() });
        msg.reply(`✅ Sent ${amount} ${coinU} to <@${targetId}>! [View on BlockCypher](https://live.blockcypher.com/ltc/tx/${txid})`);
      } else if (coinU === 'BCH') {
        const fromWallet = db.getWallet(msg.author.id, 'BCH');
        if (!fromWallet) {
          msg.reply('❌ You must register your BCH wallet first.');
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
    if (!address || isNaN(amount) || amount <= 0 || !['SOL', 'LTC', 'BTC', 'BCH'].includes(coinU)) {
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
        msg.reply('⚠️ BTC withdrawal not yet implemented.');
        return;
      }
    } catch (e) {
      msg.reply(`❌ Withdrawal failed: ${e.message}`);
    }
    return;
  }

  if (cmd === '!deposit') {
    const userId = msg.author.id;
    const solAddr = db.getWallet(userId, 'SOL');
    const ltcAddr = db.getWallet(userId, 'LTC');
    let solOnChain = 'N/A';
    let ltcOnChain = 'N/A';
    if (solAddr) {
      try {
        solOnChain = await SolanaService.getBalance(solAddr);
      } catch {}
    }
    if (ltcAddr) {
      try {
        ltcOnChain = await LitecoinService.getBalance(ltcAddr);
      } catch {}
    }
    msg.reply(
      `**Deposit Instructions:**\n` +
      `• Solana: Send SOL to \`${solAddr || 'Not registered'}\` (On-chain: ${solOnChain})\n` +
      `• Litecoin: Send LTC to \`${ltcAddr || 'Not registered'}\` (On-chain: ${ltcOnChain})\n` +
      `*(Register your wallet with !registerwallet)*`
    );
    return;
  }

  // AIRDROP: !airdrop amount coin
  if (cmd === '!airdrop') {
    if (args.length !== 2) {
      msg.reply('❌ Usage: `!airdrop amount coin`');
      return;
    }
    const [amountStr, coin] = args;
    const coinU = coin.toUpperCase();
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0 || !['SOL', 'LTC', 'BTC', 'BCH'].includes(coinU)) {
      msg.reply('❌ Invalid command. Example: `!airdrop 1 sol`');
      return;
    }
    const userId = msg.author.id;
    const bal = db.getBalance(userId, coinU);
    if (bal < amount) {
      msg.reply(`❌ Insufficient ${coinU} balance for airdrop.`);
      return;
    }
    // Deduct from sender and create airdrop
    db.updateBalance(userId, coinU, bal - amount);
    airdrops[coinU] = { creator: userId, amount, coin: coinU, claimed: false };
    db.addHistory(userId, { type: 'airdrop', coin: coinU, amount, date: new Date() });
    msg.reply(`🎁 Airdrop of ${amount} ${coinU} created! First to !collect gets it!`);
    return;
  }

  // COLLECT: !collect
  if (cmd === '!collect') {
    const userId = msg.author.id;
    let collected = false;
    for (const coinU of Object.keys(airdrops)) {
      const drop = airdrops[coinU];
      if (drop && !drop.claimed && drop.creator !== userId) {
        const userWallet = db.getWallet(userId, coinU);
        if (!userWallet) {
          msg.reply(`❌ You must register your ${coinU} wallet to collect the airdrop.`);
          return;
        }
        try {
          if (coinU === 'SOL') {
            db.updateBalance(userId, coinU, db.getBalance(userId, coinU) + drop.amount);
          } else if (coinU === 'LTC') {
            db.updateBalance(userId, coinU, db.getBalance(userId, coinU) + drop.amount);
          } else if (coinU === 'BCH') {
            const txid = await sendBch(userWallet, drop.amount);
            db.updateBalance(userId, coinU, db.getBalance(userId, coinU) + drop.amount);
            drop.claimed = true;
            db.addHistory(userId, { type: 'collect', coin: coinU, amount: drop.amount, from: drop.creator, txid, date: new Date() });
            msg.reply(`🎉 You collected ${drop.amount} ${coinU} from the airdrop! [View on Blockchair](https://blockchair.com/bitcoin-cash/transaction/${txid})`);
            collected = true;
            break;
          } else if (coinU === 'BTC') {
            // Placeholder for BTC airdrop collect logic
            msg.reply('⚠️ BTC airdrop collection not yet implemented.');
            return;
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
    if (isNaN(amount) || amount <= 0 || !['SOL', 'LTC', 'BTC', 'BCH'].includes(coinU)) {
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
      'BCH': 'bitcoincash:qexampleaddressforbch'
    };
    const donationAddress = donationAddresses[coinU];
    if (!donationAddress) {
      msg.reply('❌ Donation address not set for this coin.');
      return;
    }
    try {
      const fromWallet = db.getWallet(userId, coinU);
      if (!fromWallet) {
        msg.reply(`❌ You must register your ${coinU} wallet first.`);
        return;
      }
      let txid;
      if (coinU === 'SOL') {
        txid = await sendSol(donationAddress, amount);
      } else if (coinU === 'LTC') {
        txid = await sendLtc(donationAddress, amount);
      } else if (coinU === 'BCH') {
        txid = await sendBch(donationAddress, amount);
      }
      db.updateBalance(userId, coinU, bal - amount);
      db.addHistory(userId, { type: 'burn', address: donationAddress, coin: coinU, amount, txid, date: new Date() });
      let explorer = coinU === 'SOL' ? `https://explorer.solana.com/tx/${txid}` : coinU === 'LTC' ? `https://live.blockcypher.com/ltc/tx/${txid}` : coinU === 'BCH' ? `https://blockchair.com/bitcoin-cash/transaction/${txid}` : '';
      msg.reply(`🔥 Donated ${amount} ${coinU} to support development!${explorer ? ` [View on Explorer](${explorer})` : ''}`);
    } catch (e) {
      msg.reply(`❌ Donation failed: ${e.message}`);
    }
    return;
  }
});

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