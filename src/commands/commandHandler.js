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

  deposit: async (message, args) => {
    const userId = message.author.id;
    const depositInstructions = await getDepositInstructions(userId);
    try {
      await message.author.send({ content: depositInstructions });
      return message.reply('Deposit instructions have been sent to your DM.');
    } catch (error) {
      logger.error(`Failed to send DM to user ${userId}: ${error}`);
      return message.reply('Unable to send deposit instructions via DM. Please check your DM settings.');
    }
  },

  withdraw: async (message, args) => {
    if (args.length !== 3) {
      return message.reply('Usage: !withdraw address amount coin');
    }
    const [address, amount, coin] = args;
    if (!isValidAddress(address, coin) || !isValidAmount(amount)) {
      return message.reply('Invalid address or amount');
    }
    const userId = message.author.id;
    try {
      const txId = await processWithdrawal(userId, address, amount, coin.toUpperCase());
      await message.author.send(`Withdrawal initiated! Transaction ID: ${txId}`);
      return message.reply('Withdrawal details have been sent to your DM.');
    } catch (error) {
      logger.error(`Failed to process withdrawal for user ${userId}: ${error}`);
      return message.reply('An error occurred while processing your withdrawal.');
    }
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
    if (args.length !== 1) {
      return message.reply('Usage: !burn coin');
    }
    const [coin] = args;
    if (!isSupportedCoin(coin)) {
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
