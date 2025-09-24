const { EmbedBuilder } = require('discord.js');
const db = require('../../db/database.cjs');

module.exports = async function handleBalance(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const userId = interaction.user.id;
  const balances = await db.getBalances(userId);
  const embed = new EmbedBuilder()
    .setTitle('💜 Your Balances')
    .setColor(0x8e44ad)
    .setDescription(Object.entries(balances).map(([coin, amt]) => `> **${coin}:** \t${amt}`).join('\n'))
    .setFooter({ text: 'JustTheTip Bot', iconURL: interaction.client.user.displayAvatarURL() });
  try {
    const dm = await interaction.user.createDM();
    await dm.send({ embeds: [embed] });
  } catch (e) {}
  if (interaction.channel && interaction.channel.type !== 1) {
    await interaction.editReply({ content: 'Check your DMs for your balance!' });
  } else {
    await interaction.editReply({ content: 'Balance sent to your DM.' });
  }
};
