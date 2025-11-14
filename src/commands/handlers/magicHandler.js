/**
 * Magic Wallet Handler
 * Handles Magic embedded wallet registration and linking
 */

const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

const API_URL = process.env.API_BASE_URL || 'https://api.mischief-manager.com';

async function handleRegisterMagicCommand(interaction, context) {
  await interaction.deferReply({ ephemeral: true });
  
  const token = interaction.options.getString('token');
  const discordId = interaction.user.id;
  const discordTag = interaction.user.tag;
  
  try {
    // Call API to link Magic wallet to Discord
    const response = await axios.post(`${API_URL}/api/magic/link-discord`, {
      registrationToken: token,
      discordId,
      discordTag
    });
    
    const { user } = response.data;
    
    // Success embed
    const embed = new EmbedBuilder()
      .setTitle('✨ Magic Wallet Linked Successfully!')
      .setDescription(
        `Your Magic wallet is now connected to Discord!\n\n` +
        `**Email:** ${user.email}\n` +
        `**Wallet:** \`${user.walletAddress.substring(0, 8)}...${user.walletAddress.substring(user.walletAddress.length - 6)}\`\n\n` +
        `You can now receive tips instantly! Your wallet was created using passwordless email authentication.`
      )
      .setColor(0x6851ff) // Magic purple
      .setFooter({ text: '✨ Powered by Magic • 100% Non-Custodial' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error linking Magic wallet:', error);
    
    let errorMessage = '❌ Failed to link Magic wallet.';
    
    if (error.response?.status === 404) {
      errorMessage += ' Invalid or expired registration token. Please visit the Magic registration page and generate a new token.';
    } else if (error.response?.status === 400) {
      errorMessage += ` ${error.response.data.error}`;
    } else {
      errorMessage += ' Please try again or contact support if the issue persists.';
    }
    
    await interaction.editReply({ content: errorMessage });
  }
}

module.exports = {
  handleRegisterMagicCommand
};
