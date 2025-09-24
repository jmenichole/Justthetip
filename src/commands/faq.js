const { EmbedBuilder } = require('discord.js');

module.exports = async function handleFaq(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const embed = new EmbedBuilder()
    .setTitle('❓ FAQ & About JustTheTip Bot')
    .setColor(0x6c63ff)
    .setDescription([
      '**What is JustTheTip Bot?**',
      'A Discord bot for tipping, airdrops, and managing crypto balances off-chain, with on-chain withdrawals.',
      '',
      '**How do I keep my funds safe?**',
      '- Never share your private key with anyone.\n- Always withdraw to your own wallet for long-term storage.',
      '',
      '**Supported Coins:**',
      '- SOL (Solana)',
      '',
      '**Need help?**',
      'Contact an admin or visit the support server.'
    ].join('\n'))
    .setFooter({ text: 'JustTheTip Bot', iconURL: interaction.client.user.displayAvatarURL() });
  await interaction.editReply({ embeds: [embed] });
};
