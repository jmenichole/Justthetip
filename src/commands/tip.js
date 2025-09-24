const { EmbedBuilder } = require('discord.js');
const db = require('../../db/database.cjs');
const inputValidation = require('../../src/validators/inputValidation.cjs');
const LOG_CHANNEL_ID = '1414091527969439824';

function calculateFee(amount) {
  const FEE_RATE = 0.005;
  return Math.max(Math.floor(amount * FEE_RATE * 1e8) / 1e8, 0);
}
function getFeeWallet(coin) {
  const feeWallets = require('../../security/feeWallet.json');
  return feeWallets[coin.toUpperCase()] || null;
}

module.exports = async function handleTip(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const userId = interaction.user.id;
  const recipient = interaction.options.getUser('user');
  const amount = interaction.options.getNumber('amount');
  const coin = interaction.options.getString('coin');
  if (!inputValidation.isValidAmount(amount) || coin.toUpperCase() !== 'SOL') {
    return await interaction.editReply({ content: 'Invalid amount or unsupported coin' });
  }
  // ...rate limit logic if needed...
  const fee = calculateFee(amount);
  const netAmount = amount - fee;
  const feeWallet = getFeeWallet(coin);
  await db.processTip(userId, recipient.id, netAmount, coin.toUpperCase());
  if (fee > 0 && feeWallet) {
    await db.creditBalance(feeWallet, fee, coin.toUpperCase());
  }
  const embed = new EmbedBuilder()
    .setTitle('💸 Tip Sent!')
    .setColor(0x6c63ff)
    .setDescription(`You tipped ${recipient} **${netAmount} ${coin.toUpperCase()}**!\nFee: **${fee} ${coin.toUpperCase()}** sent to the admin wallet.`)
    .setFooter({ text: 'JustTheTip Bot', iconURL: interaction.client.user.displayAvatarURL() });
  await interaction.editReply({ embeds: [embed] });
  // DM the recipient if possible
  try {
    const dm = await recipient.createDM();
    await dm.send(`You received a tip of **${netAmount} ${coin.toUpperCase()}** from <@${userId}>!`);
  } catch (e) {}
  // Log tip to log channel
  try {
    const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({
        content: `Tip: <@${userId}> tipped <@${recipient.id}> **${netAmount} ${coin.toUpperCase()}** (Fee: ${fee})`
      });
    }
  } catch (e) {}
};
