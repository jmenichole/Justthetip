const db = require('../../db/database.cjs');

module.exports = async function handleRegisterWallet(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const userId = interaction.user.id;
  const coin = interaction.options.getString('coin');
  const address = interaction.options.getString('address');
  if (!coin || !address) {
    return await interaction.editReply({ content: 'You must provide both a coin and an address.' });
  }
  // Optionally: validate address format here
  await db.registerWallet(userId, coin, address);
  await interaction.editReply({ content: `Your ${coin.toUpperCase()} address has been saved for reference.` });
};
