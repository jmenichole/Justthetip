const { EmbedBuilder } = require('discord.js');
const db = require('../../db/database.cjs');
const inputValidation = require('../../src/validators/inputValidation.cjs');
const SolanaService = require('../../chains/solanaService.cjs');

module.exports = async function handleWithdraw(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const userId = interaction.user.id;
  const amount = interaction.options.getNumber('amount');
  const coin = interaction.options.getString('coin');
  if (!inputValidation.isValidAmount(amount) || coin.toUpperCase() !== 'SOL') {
    return await interaction.editReply({ content: 'Invalid amount or unsupported coin.' });
  }
  const balances = await db.getBalances(userId);
  const bal = balances[coin.toUpperCase()] || 0;
  if (bal < amount) {
    return await interaction.editReply({ content: `Insufficient balance. You have ${bal} ${coin.toUpperCase()}.` });
  }
  const wallet = await db.getWallet(userId, coin);
  if (!wallet) {
    return await interaction.editReply({ content: `No registered ${coin.toUpperCase()} wallet found. Please use /registerwallet first.` });
  }
  await db.creditBalance(userId, -amount, coin.toUpperCase());
  let txSig = null;
  let errorMsg = null;
  try {
    const from = (require('@solana/web3.js').Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.SOL_PRIVATE_KEY)))).publicKey.toBase58();
    txSig = await SolanaService.transferSOL(from, wallet, amount);
  } catch (err) {
    errorMsg = err.message || 'Unknown error during on-chain transfer.';
  }
  if (txSig) {
    const embed = new EmbedBuilder()
      .setTitle('🚀 Withdrawal Complete')
      .setColor(0x6c63ff)
      .setDescription(`Your withdrawal of **${amount} ${coin.toUpperCase()}** has been sent on-chain.\n\n**Destination:** \
${wallet}\n\n[View on Solana Explorer](https://explorer.solana.com/tx/${txSig})`)
      .setFooter({ text: 'JustTheTip Bot', iconURL: interaction.client.user.displayAvatarURL() });
    try {
      const dm = await interaction.user.createDM();
      await dm.send({ embeds: [embed] });
    } catch (e) {}
    if (interaction.channel && interaction.channel.type !== 1) {
      await interaction.editReply({ content: 'Withdrawal complete! Check your DMs for details.' });
    } else {
      await interaction.editReply({ content: 'Withdrawal sent to your DM.' });
    }
    // Log withdrawal to log channel
    try {
      const logChannel = await interaction.client.channels.fetch('1414091527969439824').catch(() => null);
      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send({
          content: `Withdraw: <@${userId}> withdrew **${amount} ${coin.toUpperCase()}** to \
${wallet}\nTx: https://explorer.solana.com/tx/${txSig}`
        });
      }
    } catch (e) {}
  } else {
    await interaction.editReply({ content: `Your balance was debited, but the on-chain transfer failed: ${errorMsg}` });
    // Log failed withdrawal to log channel
    try {
      const logChannel = await interaction.client.channels.fetch('1414091527969439824').catch(() => null);
      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send({
          content: `FAILED Withdraw: <@${userId}> tried to withdraw **${amount} ${coin.toUpperCase()}** to \
${wallet}\nError: ${errorMsg}`
        });
      }
    } catch (e) {}
  }
};
