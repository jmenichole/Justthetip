/**
 * JustTheTip - Tip Command Handler
 * Handles tipping between Discord users with USD to SOL conversion
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { EmbedBuilder } = require('discord.js');

/**
 * Handle the /tip command
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} context - Command context { sdk, database, priceService }
 */
async function handleTipCommand(interaction, context) {
  const { database, priceService } = context;
  
  const recipient = interaction.options.getUser('user');
  const usdAmount = interaction.options.getNumber('amount');
  const senderId = interaction.user.id;
  
  // Validate USD amount
  if (usdAmount < 0.10 || usdAmount > 100) {
    return interaction.reply({ 
      content: '❌ Amount must be between $0.10 and $100.00 USD', 
      ephemeral: true 
    });
  }
  
  // Check sender wallet
  const senderWallet = await database.getUserWallet(senderId);
  if (!senderWallet) {
    return interaction.reply({ 
      content: '❌ Please register your wallet first using `/register-wallet`', 
      ephemeral: true 
    });
  }
  
  // Check recipient wallet
  const recipientWallet = await database.getUserWallet(recipient.id);
  if (!recipientWallet) {
    return interaction.reply({ 
      content: '❌ Recipient has not registered their wallet yet', 
      ephemeral: true 
    });
  }
  
  // Convert USD to SOL
  let solAmount;
  let solPrice;
  try {
    solPrice = await priceService.getSolPrice();
    solAmount = await priceService.convertUsdToSol(usdAmount);
  } catch (error) {
    console.error('Error converting USD to SOL:', error);
    return interaction.reply({ 
      content: '❌ Error fetching SOL price. Please try again later.', 
      ephemeral: true 
    });
  }
  
  // Check sender balance (using SDK)
  const { getSolanaBalance } = require('../../../contracts/sdk');
  const balance = await getSolanaBalance(senderWallet);
  const balanceSOL = balance / 1000000000;
  
  if (balanceSOL < solAmount) {
    const balanceUSD = await priceService.convertSolToUsd(balanceSOL);
    return interaction.reply({ 
      content: `❌ Insufficient balance. You have ${balanceSOL.toFixed(4)} SOL (~$${balanceUSD.toFixed(2)} USD)`, 
      ephemeral: true 
    });
  }
  
  // Create tip embed
  const embed = new EmbedBuilder()
    .setTitle('💸 Tip Transaction')
    .setDescription(
      `**From:** <@${interaction.user.id}>\n` +
      `**To:** <@${recipient.id}>\n` +
      `**Amount:** $${usdAmount.toFixed(2)} USD\n` +
      `**Equivalent:** ${solAmount.toFixed(4)} SOL\n` +
      `**SOL Price:** $${solPrice.toFixed(2)}\n\n` +
      `**Status:** ⏳ Processing...\n\n` +
      `_Transaction will be confirmed on Solana blockchain_`
    )
    .setColor(0x667eea)
    .setFooter({ text: 'Non-custodial tip • Processed on-chain' })
    .setTimestamp();
    
  await interaction.reply({ embeds: [embed] });
  
  console.log(`💸 Tip: ${interaction.user.tag} -> ${recipient.tag}: $${usdAmount.toFixed(2)} USD (${solAmount.toFixed(4)} SOL)`);
}

module.exports = { handleTipCommand };
