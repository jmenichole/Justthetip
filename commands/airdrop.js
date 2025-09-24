const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../db/database.cjs');
const inputValidation = require('../../src/validators/inputValidation.cjs');
const LOG_CHANNEL_ID = '1414091527969439824';

module.exports = async function handleAirdrop(interaction, client) {
  await interaction.deferReply({ ephemeral: true });
  const userId = interaction.user.id;
  const amount = interaction.options.getNumber('amount');
  const coin = interaction.options.getString('coin');
  const maxUsers = interaction.options.getInteger('users') || 1;
  const timeStr = interaction.options.getString('time');
  let timeMs = 0;
  if (timeStr) {
    const match = timeStr.match(/(\d+)([sm]?)/i);
    if (match) {
      const val = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      if (unit === 'm') timeMs = val * 60000;
      else if (unit === 's' || unit === '') timeMs = val * 1000;
    }
  }
  if (!inputValidation.isValidAmount(amount) || coin.toUpperCase() !== 'SOL') {
    return await interaction.editReply({ content: 'Invalid amount or unsupported coin' });
  }
  const fee = Math.max(Math.floor(amount * 0.005 * 1e8) / 1e8, 0);
  const netAmount = amount - fee;
  const feeWallets = require('../../security/feeWallet.json');
  const feeWallet = feeWallets[coin.toUpperCase()] || null;
  const embed = new EmbedBuilder()
    .setTitle('🎁 Airdrop!')
    .setDescription(`${interaction.user} is dropping **${netAmount} ${coin.toUpperCase()}**!\nClick Collect below!\nFee: **${fee} ${coin.toUpperCase()}** sent to the admin wallet.`)
    .setColor(0xe056fd)
    .setFooter({ text: 'JustTheTip Bot', iconURL: interaction.client.user.displayAvatarURL() });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('collect_airdrop')
      .setLabel('Collect')
      .setStyle(ButtonStyle.Success)
  );
  const airdropId = await db.createAirdrop({
    creator: userId,
    amount: netAmount,
    coin: coin.toUpperCase(),
    maxUsers,
    timeMs,
    created: Date.now(),
    guildId: interaction.guildId
  });
  if (fee > 0 && feeWallet) {
    await db.creditBalance(feeWallet, fee, coin.toUpperCase());
  }
  await interaction.editReply({ embeds: [embed], components: [row] });
  if (timeMs > 0) {
    setTimeout(async () => {
      await db.endAirdrop(airdropId);
      try {
        const airdrop = await db.getAirdrop(airdropId);
        const creatorUser = await client.users.fetch(airdrop.creator);
        if (creatorUser) {
          await creatorUser.send(`Your airdrop of **${airdrop.amount} ${airdrop.coin}** has ended. ${airdrop.claimedBy?.length || 0} user(s) claimed.`);
        }
      } catch (e) {}
    }, timeMs);
  }
};
