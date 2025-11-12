/**
 * /help Command Handler
 * Display available commands and usage
 * Author: 4eckd
 */

const { Markup } = require('telegraf');
const logger = require('../../src/utils/logger');

async function helpCommand(ctx) {
  const helpMessage = `
📖 *JustTheTip Command Guide*

*💰 Wallet Management*
/register - Register your Solana wallet
/wallet - View wallet information and QR code
/balance - Check your token balances

*💸 Tipping*
/tip @username 10 SOL - Send a tip to a user
/tip 5 USDC - Reply to a message to tip that user
/history - View your transaction history

*📊 Information*
/price SOL - Check current token prices
/help - Show this help message

*🎯 Quick Tips:*
• You can tip by mentioning a user: \`/tip @alice 10 SOL\`
• Or reply to their message with: \`/tip 5 USDC\`
• Supported tokens: SOL, USDC, BONK, USDT

*🔐 Security:*
• JustTheTip is non-custodial - you control your wallet
• Transactions are signed in your wallet app
• Your private keys never leave your device

*💡 Example Commands:*
\`\`\`
/tip @bob 10 SOL
/tip 5.5 USDC
/balance
/price BONK
\`\`\`

*🆘 Need More Help?*
Visit our documentation: https://jmenichole.github.io/Justthetip
  `.trim();

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.url('📚 Documentation', 'https://jmenichole.github.io/Justthetip'),
      Markup.button.url('💬 Discord', 'https://discord.gg/justthetip')
    ],
    [
      Markup.button.callback('🔙 Back', 'back_to_start')
    ]
  ]);

  try {
    await ctx.reply(helpMessage, {
      parse_mode: 'Markdown',
      ...keyboard
    });

    logger.info(`Help command executed for user ${ctx.from.id}`);
  } catch (error) {
    logger.error('Error in help command:', error);
    await ctx.reply('An error occurred. Please try again.');
  }
}

module.exports = helpCommand;
