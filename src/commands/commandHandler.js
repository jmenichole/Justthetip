const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_COMMANDS = 5;

const userCommandCounts = new Map();

const commands = {
  balance: async (message, args) => {
    const userId = message.author.id;
    const balances = await getBalances(userId);
    return message.reply({ content: formatBalances(balances) });
  },

  tip: async (message, args) => {
    if (args.length !== 3) {
      return message.reply('Usage: !tip @user amount coin');
    }
    const [recipient, amount, coin] = args;
    if (!isValidAmount(amount) || !isSupportedCoin(coin)) {
      return message.reply('Invalid amount or unsupported coin');
    }
    await processTip(message.author.id, recipient, amount, coin.toUpperCase());
    return message.reply('Tip sent successfully!');
  },

  withdraw: async (message, args) => {
    if (args.length !== 3) {
      return message.reply('Usage: !withdraw address amount coin');
    }
    const [address, amount, coin] = args;
    if (!isValidAddress(address, coin) || !isValidAmount(amount)) {
      return message.reply('Invalid address or amount');
    }
    const txId = await processWithdrawal(message.author.id, address, amount, coin.toUpperCase());
    return message.reply(`Withdrawal initiated! Transaction ID: ${txId}`);
  },

  airdrop: async (message, args) => {
    if (args.length !== 2) {
      return message.reply('Usage: !airdrop amount coin');
    }
    const [amount, coin] = args;
    if (!isValidAmount(amount) || !isSupportedCoin(coin)) {
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
    if (args.length !== 2) {
      return message.reply('Usage: !burn amount coin');
    }
    const [amount, coin] = args;
    if (!isValidAmount(amount) || !isSupportedCoin(coin)) {
      return message.reply('Invalid amount or unsupported coin');
    }
    const txId = await processBurn(message.author.id, amount, coin.toUpperCase());
    return message.reply(`Thank you for your donation! Transaction ID: ${txId}`);
  }
};

function isRateLimited(userId) {
  const now = Date.now();
  const userCount = userCommandCounts.get(userId) || { count: 0, timestamp: now };
  
  if (now - userCount.timestamp > RATE_LIMIT_WINDOW) {
    userCount.count = 1;
    userCount.timestamp = now;
  } else if (userCount.count >= MAX_COMMANDS) {
    return true;
  } else {
    userCount.count++;
  }
  
  userCommandCounts.set(userId, userCount);
  return false;
}

module.exports = {
  handleCommand: async (message) => {
    if (isRateLimited(message.author.id)) {
      return message.reply('Please wait before using more commands.');
    }

    const args = message.content.slice(1).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

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
