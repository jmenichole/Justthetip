const db = require('../../db/database.cjs');
const LOG_CHANNEL_ID = '1414091527969439824';

module.exports = async function handleAirdropClaim(interaction, client) {
  await interaction.deferReply({ ephemeral: true });
  // Get latest active airdrop from DB
  const airdrop = await db.getLatestActiveAirdrop();
  if (!airdrop) {
    return await interaction.editReply({ content: 'No active airdrop to collect.' });
  }
  const share = Math.floor((airdrop.amount / airdrop.maxUsers) * 1e8) / 1e8;
  // Atomically claim
  const claimResult = await db.claimAirdrop(airdrop._id.toString(), interaction.user.id, share);
  if (claimResult === 'already_claimed') {
    return await interaction.editReply({ content: 'You have already collected from this airdrop.' });
  }
  if (claimResult === 'ended') {
    return await interaction.editReply({ content: 'Airdrop is over or fully claimed.' });
  }
  if (claimResult !== 'claimed') {
    return await interaction.editReply({ content: 'Failed to claim airdrop. Please try again.' });
  }
  // Credit share to user
  try {
    await db.creditBalance(interaction.user.id, share, airdrop.coin);
  } catch (e) {
    await interaction.editReply({ content: 'Airdrop claim failed due to a balance error. Please contact support.' });
    return;
  }
  await interaction.editReply({ content: `You collected **${share} ${airdrop.coin}** from the airdrop!` });
  // DM user
  try {
    const dm = await interaction.user.createDM();
    await dm.send(`🎉 You collected **${share} ${airdrop.coin}** from an airdrop!\n\nUse /withdraw to move your balance to your own wallet.`);
  } catch (e) {}
  // Log to log channel
  try {
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({
        content: `Airdrop Claim: <@${interaction.user.id}> collected **${share} ${airdrop.coin}** from airdrop by <@${airdrop.creator}>.`
      });
    }
  } catch (e) {}
};
