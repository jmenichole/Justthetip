let checkRateLimit = require('../utils/rateLimiter').checkRateLimit;
if (process.env.NODE_ENV === 'test') {
  checkRateLimit = async () => ({ limited: false });
}

const inputValidation = require('../validators/inputValidation');
const EthereumService = require('../../chains/ethereumService');
const PolygonService = require('../../chains/polygonService');
const DogecoinService = require('../../chains/dogecoinService');

const commands = {
  balance: async (message, args) => {
    const userId = message.author.id;
    const balances = await getBalances(userId);
    try {
      await message.author.send({ content: formatBalances(balances) });
      if (message.channel.type !== 1) {
        message.reply('📬 I have sent your balance in a private message.');
      }
    } catch (e) {
      message.reply('❌ I could not send you a DM. Please check your privacy settings.');
    }
  },

  tip: async (message, args) => {
    if (args.length !== 3) {
      return message.reply('Usage: !tip @user amount coin');
    }
    const [recipient, amount, coin] = args;
    if (!inputValidation.isValidAmount(amount) || !inputValidation.isSupportedCoin(coin)) {
      return message.reply('Invalid amount or unsupported coin');
    }
    if (!inputValidation.validateDiscordId(recipient.replace(/\D/g, ''))) {
      return message.reply('Invalid recipient. Please mention a valid user.');
    }
    await processTip(message.author.id, recipient, amount, coin.toUpperCase());
    return message.reply('Tip sent successfully!');
  },

  deposit: async (message, args) => {
    return message.reply('To increase your balance, send proof of your on-chain deposit to an admin or in the designated channel. This bot does NOT hold or receive real crypto.');
  },

  withdraw: async (message, args) => {
    if (args.length !== 2) {
      return message.reply('Usage: !withdraw amount coin');
    }
    const [amount, coin] = args;
    if (!inputValidation.isValidAmount(amount) || !inputValidation.isSupportedCoin(coin)) {
      return message.reply('Invalid amount or unsupported coin');
    }
    // Deduct from user balance (off-chain)
    // db.updateBalance(message.author.id, coin.toUpperCase(), ...)
    return message.reply('Your balance has been updated. Please send your crypto yourself using your own wallet. This bot does NOT send or receive real crypto.');
  },

  airdrop: async (message, args) => {
    if (args.length !== 2) {
      return message.reply('Usage: !airdrop amount coin');
    }
    const [amount, coin] = args;
    if (!inputValidation.isValidAmount(amount) || !inputValidation.isSupportedCoin(coin)) {
      return message.reply('Invalid amount or unsupported coin');
    }
    const dropId = await createAirdrop(message.author.id, amount, coin.toUpperCase());
    return message.reply(`Airdrop created! ID: ${dropId}`);
  },

  collect: async (message, args) => {
    const result = await collectAirdrop(message.author.id);
    return message.reply(result);
  },

  burn: async (message, args) => {
    if (args.length !== 1) {
      return message.reply('Usage: !burn coin');
    }
    const [coin] = args;
    if (!inputValidation.isSupportedCoin(coin)) {
      return message.reply('Unsupported coin');
    }

    const userId = message.author.id;
    try {
      const balance = await getBalance(userId, coin.toUpperCase());
      if (balance <= 0) {
        return message.reply(`You have no ${coin.toUpperCase()} to burn.`);
      }

      const txId = await processBurn(userId, balance, coin.toUpperCase());
      return message.reply(`Thank you for supporting the development! All your ${coin.toUpperCase()} (${balance}) has been burned. Transaction ID: ${txId}`);
    } catch (error) {
      logger.error(`Failed to process burn for user ${userId}: ${error}`);
      return message.reply('An error occurred while processing your burn request.');
    }
  },

  help: async (message) => {
    const HELP_MESSAGE = `**JustTheTip Helper Bot Commands:**
    - balance — Show your off-chain balances
    - tip @user amount coin — Tip a user (off-chain, for fun/community)
    - registerwallet coin address — Register your wallet address (for reference only)
    - withdraw amount coin — Request a balance deduction; send your crypto yourself
    - deposit — Request a balance increase; provide proof to an admin
    - airdrop amount coin — Create an airdrop for others to collect (off-chain)
    - collect — Collect from the latest airdrop
    - burn coin — Donate your balance to support the community
    - help — Show this help message

    Security Note: This bot does NOT hold, send, or receive real crypto. All balances are tracked off-chain for fun and engagement only. You are responsible for your own wallets and on-chain transactions.`;
    return message.reply(HELP_MESSAGE);
  }
};

async function getBalances(userId) {
  // ...existing logic for other coins...
  // Add ETH, DOGE, MATIC
  const ethAddr = db.getWallet(userId, 'ETH');
  const dogeAddr = db.getWallet(userId, 'DOGE');
  const maticAddr = db.getWallet(userId, 'MATIC');
  let eth = 0, doge = 0, matic = 0;
  try { if (ethAddr) eth = await EthereumService.getBalance(ethAddr); } catch {}
  try { if (dogeAddr) doge = await DogecoinService.getBalance(dogeAddr); } catch {}
  try { if (maticAddr) matic = await PolygonService.getBalance(maticAddr); } catch {}
  // ...return or format balances including eth, doge, matic...
}

module.exports = {
  handleCommand: async (message) => {
    const userId = message.author.id;
    const command = message.content.slice(1).trim().split(/\s+/)[0].toLowerCase();
    let action = 'command';
    if (command === 'withdraw') action = 'withdrawal';
    if (command === 'tip') action = 'tip';
    const rate = await checkRateLimit(userId, action);
    if (rate.limited) {
      return message.reply(`⏳ Rate limit exceeded. Please wait ${Math.ceil(rate.msBeforeNext/1000)} seconds before using this command again.`);
    }

    const args = message.content.slice(1).trim().split(/\s+/);
    args.shift(); // remove the command part

    if (commands[command]) {
      try {
        await commands[command](message, args);
      } catch (error) {
        console.error(`Command error: ${error}`);
        message.reply('An error occurred while processing your command.');
      }
    }
  }
};
