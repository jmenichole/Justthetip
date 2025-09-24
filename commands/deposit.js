const { EmbedBuilder } = require('discord.js');
const db = require('../../db/database.cjs');
const inputValidation = require('../../src/validators/inputValidation.cjs');

module.exports = async function handleDeposit(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const userId = interaction.user.id;
  const amount = interaction.options.getNumber('amount');
  const coin = interaction.options.getString('coin');
  if (!inputValidation.isValidAmount(amount) || coin.toUpperCase() !== 'SOL') {
    return await interaction.editReply({ content: 'Invalid amount or unsupported coin.' });
  }
  // Apply 0.5% fee
  const FEE_RATE = 0.005;
  const fee = Math.max(Math.floor(amount * FEE_RATE * 1e8) / 1e8, 0);
  const netAmount = amount - fee;
  // Credit net to user, fee to admin wallet
  await db.creditBalance(userId, netAmount, coin.toUpperCase());
  const feeWallets = require('../../security/feeWallet.json');
  const feeWallet = feeWallets[coin.toUpperCase()] || null;
  if (fee > 0 && feeWallet) {
    await db.creditBalance(feeWallet, fee, coin.toUpperCase());
  }
  const embed = new EmbedBuilder()
    .setTitle('💰 Deposit Successful')
    .setColor(0x5f27cd)
    .setDescription(`Deposited **${netAmount} ${coin.toUpperCase()}** to your balance.\nFee: **${fee} ${coin.toUpperCase()}** sent to admin wallet.`)
    .setFooter({ text: 'JustTheTip Bot', iconURL: interaction.client.user.displayAvatarURL() });
  try {
    const dm = await interaction.user.createDM();
    await dm.send({ embeds: [embed] });
  } catch (e) {}
  if (interaction.channel && interaction.channel.type !== 1) {
    await interaction.editReply({ content: 'Deposit complete! Check your DMs for details.' });
  } else {
    await interaction.editReply({ content: 'Deposit sent to your DM.' });
  }
};
