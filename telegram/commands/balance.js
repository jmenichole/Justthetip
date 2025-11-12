/**
 * /balance Command Handler
 * Display user's token balances
 * Author: 4eckd
 */

const { Markup } = require('telegraf');
const logger = require('../../src/utils/logger');
const { Connection, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const priceService = require('../../src/utils/priceService');
const tokenRegistry = require('../../src/utils/tokenRegistry');

async function balanceCommand(ctx) {
  const user = ctx.state.user;

  if (!user || !user.wallet) {
    await ctx.reply('❌ Wallet not registered. Use /register first.');
    return;
  }

  try {
    await ctx.reply('⏳ Fetching balances...');

    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    );

    const walletPubkey = new PublicKey(user.wallet);

    // Get SOL balance
    const solBalance = await connection.getBalance(walletPubkey);
    const solBalanceInSol = solBalance / 1e9;

    // Get token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPubkey,
      { programId: TOKEN_PROGRAM_ID }
    );

    // Get current prices
    const prices = await priceService.getAllPrices();

    // Build balance message
    let message = `💰 *Your Balances*\n\n`;
    message += `Wallet: \`${user.wallet.slice(0, 8)}...${user.wallet.slice(-8)}\`\n\n`;

    let totalValueUsd = 0;

    // SOL balance
    const solValueUsd = solBalanceInSol * (prices.SOL || 0);
    totalValueUsd += solValueUsd;

    message += `*SOL*\n`;
    message += `  ${solBalanceInSol.toFixed(4)} SOL\n`;
    if (prices.SOL) {
      message += `  ≈ $${solValueUsd.toFixed(2)} USD\n`;
    }
    message += `\n`;

    // Token balances
    const supportedTokens = Object.keys(tokenRegistry.TOKENS);

    for (const tokenSymbol of supportedTokens) {
      if (tokenSymbol === 'SOL') continue;

      const tokenInfo = tokenRegistry.TOKENS[tokenSymbol];
      const tokenAccount = tokenAccounts.value.find(
        acc => acc.account.data.parsed.info.mint === tokenInfo.mint
      );

      if (tokenAccount) {
        const amount = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
        const valueUsd = amount * (prices[tokenSymbol] || 0);
        totalValueUsd += valueUsd;

        message += `*${tokenSymbol}*\n`;
        message += `  ${amount.toLocaleString()} ${tokenSymbol}\n`;
        if (prices[tokenSymbol]) {
          message += `  ≈ $${valueUsd.toFixed(2)} USD\n`;
        }
        message += `\n`;
      }
    }

    message += `━━━━━━━━━━━━━━━━\n`;
    message += `*Total Value:* $${totalValueUsd.toFixed(2)} USD\n`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🔄 Refresh', 'refresh_balance'),
        Markup.button.callback('💸 Send Tip', 'start_tip')
      ],
      [
        Markup.button.url('🔍 View on Solscan', `https://solscan.io/account/${user.wallet}`)
      ]
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });

    logger.info(`Balance command executed for user ${ctx.from.id}`);

  } catch (error) {
    logger.error('Error fetching balance:', error);
    await ctx.reply(
      '❌ Failed to fetch balances. Please try again.\n\n' +
      `Error: ${error.message}`
    );
  }
}

module.exports = balanceCommand;
