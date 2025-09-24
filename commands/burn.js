
const db = require('../../db/database.cjs');
const { EmbedBuilder } = require('discord.js');
const LOG_CHANNEL_ID = '1414091527969439824';

function getFeeWallet(coin) {
  const feeWallets = require('../../security/feeWallet.json');
  return feeWallets[coin.toUpperCase()] || null;
}

module.exports = async function handleBurn(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const userId = interaction.user.id;
  const coin = interaction.options.getString('coin');
  if (!coin || !['SOL', 'USDC', 'LTC', 'BTC', 'BCH'].includes(coin.toUpperCase())) {
    return await interaction.editReply({ content: 'Please specify a supported coin to burn: SOL, USDC, LTC, BTC, BCH.' });
  }
  const balances = await db.getBalances(userId);
  const balance = balances[coin.toUpperCase()] || 0;
  if (balance <= 0) {
    return await interaction.editReply({ content: `You have no ${coin.toUpperCase()} to burn.` });
  }
  // Remove all user's balance for this coin
  await db.creditBalance(userId, -balance, coin.toUpperCase());
  // Credit to fee wallet (donation)
  const feeWallet = getFeeWallet(coin);
  if (feeWallet) {
    await db.creditBalance(feeWallet, balance, coin.toUpperCase());
  }
  // Log to channel
  const embed = new EmbedBuilder()
    .setTitle('🔥 Burn/Donate')
    .setColor(0xff5733)
    .setDescription(`<@${userId}> donated **${balance} ${coin.toUpperCase()}** to support development!`)
    .setFooter({ text: 'JustTheTip Bot', iconURL: interaction.client.user.displayAvatarURL() });
  try {
    const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
    if (logChannel) await logChannel.send({ embeds: [embed] });
  } catch (e) {}
  // DM user
  try {
    const dm = await interaction.user.createDM();
    await dm.send({ embeds: [embed] });
  } catch (e) {}
  await interaction.editReply({ content: `Thank you for supporting the development! All your ${coin.toUpperCase()} (${balance}) has been donated.` });
};
