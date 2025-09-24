const { EmbedBuilder } = require('discord.js');

module.exports = async function handleHelp(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const helpMsg = [
    '**JustTheTip Bot Help**',
    '',
  'This bot lets you tip, airdrop, donate (burn), and manage crypto balances off-chain on Discord. All balances are stored securely and can be withdrawn to your own wallet at any time.',
    '',
    '**How It Works:**',
  '- Use `/deposit amount:<amt> coin:<coin>` to add to your off-chain balance (a 0.5% fee is applied and sent to the admin wallet).',
    '- Use `/balance` to check your balances.',
    '- Use `/tip user:<@user> amount:<amt> coin:<coin>` to send a tip to another user.',
    '- Use `/airdrop amount:<amt> coin:<coin> users:<n> time:<window>` to create a claimable airdrop.',
    '- Click the "Collect" button on an airdrop to claim your share.',
    '- Use `/registerwallet coin:<coin> address:<address>` to save your own wallet address for reference.',
  '- Use `/withdraw amount:<amt> coin:<coin>` to request a withdrawal to your registered wallet (on-chain for SOL, manual for others).',
    '',
    '**Supported Coins:**',
    '- SOL (Solana)',
    '',
    '**Commands:**',
    '- `/balance` — Show your balances',
    '- `/tip` — Tip a user',
    '- `/airdrop` — Create a claimable airdrop',
  '- `/deposit` — Add to your balance',
  '- `/registerwallet` — Save your wallet address for reference',
  '- `/withdraw` — Request a withdrawal',
  '- `/burn` — Donate your balance to support development',
    '- `/help` — Show this help message',
  '- `/burn` — Donate your balance',
    '',
    'For more info or support, contact an admin or visit the support server.'
  ].join('\n');
  const embed = new EmbedBuilder()
    .setTitle('JustTheTip Bot Help')
    .setColor(0x6c63ff)
    .setDescription(helpMsg)
    .setFooter({ text: 'JustTheTip Bot', iconURL: interaction.client.user.displayAvatarURL() });
  await interaction.editReply({ embeds: [embed] });
};
