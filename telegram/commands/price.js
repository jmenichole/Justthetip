/**
 * /price Command Handler
 * Check current token prices
 * Author: 4eckd
 */

const { Markup } = require('telegraf');
const logger = require('../../src/utils/logger');
const priceService = require('../../src/utils/priceService');
const tokenRegistry = require('../../src/utils/tokenRegistry');

async function priceCommand(ctx) {
  try {
    const args = ctx.message.text.split(/\s+/).slice(1);
    const specificToken = args[0]?.toUpperCase();

    // Get prices
    const prices = await priceService.getAllPrices();

    if (!prices || Object.keys(prices).length === 0) {
      await ctx.reply('❌ Unable to fetch prices at this time. Please try again later.');
      return;
    }

    // If specific token requested
    if (specificToken) {
      if (!tokenRegistry.TOKENS[specificToken]) {
        const supportedTokens = Object.keys(tokenRegistry.TOKENS).join(', ');
        await ctx.reply(
          `❌ Unknown token: ${specificToken}\n\n` +
          `Supported tokens: ${supportedTokens}`
        );
        return;
      }

      const price = prices[specificToken];
      if (!price) {
        await ctx.reply(`❌ Price not available for ${specificToken}`);
        return;
      }

      const message = `
💰 *${specificToken} Price*

Current: $${price.toFixed(specificToken === 'BONK' ? 8 : 4)}

*Token Info:*
Mint: \`${tokenRegistry.TOKENS[specificToken].mint}\`
Decimals: ${tokenRegistry.TOKENS[specificToken].decimals}

*Quick Convert:*
1 ${specificToken} = $${price.toFixed(4)}
10 ${specificToken} = $${(price * 10).toFixed(2)}
100 ${specificToken} = $${(price * 100).toFixed(2)}
      `.trim();

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh', `refresh_price_${specificToken}`)],
        [Markup.button.url('📊 CoinGecko', `https://www.coingecko.com/en/coins/${tokenRegistry.TOKENS[specificToken].coingeckoId}`)]
      ]);

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      return;
    }

    // Show all prices
    let message = '💰 *Current Token Prices*\n\n';

    const tokens = ['SOL', 'USDC', 'BONK', 'USDT'];
    for (const token of tokens) {
      const price = prices[token];
      if (price) {
        const decimals = token === 'BONK' ? 8 : 4;
        message += `*${token}*: $${price.toFixed(decimals)}\n`;
      }
    }

    message += '\n_Prices from CoinGecko_\n';
    message += `\nUse \`/price <token>\` for details\n`;
    message += `Example: \`/price SOL\``;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🔄 Refresh', 'refresh_all_prices')
      ]
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });

    logger.info(`Price command executed for user ${ctx.from.id}`);

  } catch (error) {
    logger.error('Error in price command:', error);
    await ctx.reply('❌ An error occurred fetching prices. Please try again.');
  }
}

module.exports = priceCommand;
