/**
 * /wallet Command Handler
 * Display wallet information and QR code
 * Author: 4eckd
 */

const { Markup } = require('telegraf');
const logger = require('../../src/utils/logger');

async function walletCommand(ctx) {
  const user = ctx.state.user;

  if (!user || !user.wallet) {
    await ctx.reply('❌ Wallet not registered. Use /register first.');
    return;
  }

  try {
    const walletAddress = user.wallet;
    const shortAddress = `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`;

    const message = `
🔐 *Your Wallet*

Address: \`${walletAddress}\`
Short: ${shortAddress}

*Network:* Solana ${process.env.SOLANA_CLUSTER === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}
*Status:* ✅ Active

*Quick Actions:*
• Check balance: /balance
• Send tip: /tip
• View history: /history
    `.trim();

    // Generate QR code URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${walletAddress}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('💰 Check Balance', 'check_balance'),
        Markup.button.callback('💸 Send Tip', 'send_tip')
      ],
      [
        Markup.button.url('🔍 View on Solscan', `https://solscan.io/account/${walletAddress}`)
      ]
    ]);

    // Send wallet info
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });

    // Send QR code
    await ctx.replyWithPhoto(
      { url: qrCodeUrl },
      {
        caption: `Scan to send funds to this wallet`,
        ...keyboard
      }
    );

    logger.info(`Wallet command executed for user ${ctx.from.id}`);

  } catch (error) {
    logger.error('Error in wallet command:', error);
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}

module.exports = walletCommand;
