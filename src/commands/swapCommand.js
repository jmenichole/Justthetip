/**
 * Swap Command
 * 
 * Allows users to convert tips between tokens using Jupiter aggregator.
 * Example: Convert USDC to BONK before sending a tip.
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * 
 * This file is part of JustTheTip.
 * 
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * See LICENSE file in the project root for full license information.
 * 
 * SPDX-License-Identifier: MIT
 * 
 * This software may not be sold commercially without permission.
 * 
 * @module SwapCommand
 * @author JustTheTip Bot Team
 * @license Custom MIT-based License
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { JupiterSwap, TOKEN_METADATA } = require('../utils/jupiterSwap');

/**
 * Handle swap command
 * 
 * @param {Object} interaction - Discord interaction object
 * @param {Object} userWallets - Map of user wallets
 * @returns {Promise<void>}
 */
async function handleSwapCommand(interaction, userWallets) {
  try {
    const fromToken = interaction.options.getString('from');
    const toToken = interaction.options.getString('to');
    const amount = interaction.options.getNumber('amount');
    const userId = interaction.user.id;

    // Validate amount
    if (amount <= 0) {
      return await interaction.reply({
        content: '❌ Amount must be greater than 0.',
        ephemeral: true,
      });
    }

    // Check if user has registered wallet
    const userWallet = userWallets.get(userId);
    if (!userWallet) {
      return await interaction.reply({
        content: '❌ Please register your wallet first with `/register-magic`.',
        ephemeral: true,
      });
    }

    // Validate token pair
    if (fromToken === toToken) {
      return await interaction.reply({
        content: '❌ Cannot swap the same token.',
        ephemeral: true,
      });
    }

    // Defer reply for async operation
    await interaction.deferReply({ ephemeral: true });

    // Get Jupiter swap quote
    const jupiter = new JupiterSwap(process.env.SOLANA_RPC_URL);
    
    const fromTokenInfo = TOKEN_METADATA[fromToken];
    const toTokenInfo = TOKEN_METADATA[toToken];

    if (!fromTokenInfo || !toTokenInfo) {
      return await interaction.editReply({
        content: '❌ Unsupported token pair.',
      });
    }

    const fromMint = fromTokenInfo.mint;
    const toMint = toTokenInfo.mint;

    // Calculate input amount in smallest unit
    const inputAmount = Math.floor(amount * Math.pow(10, fromTokenInfo.decimals));

    const quote = await jupiter.getQuote(fromMint, toMint, inputAmount, 50);

    if (!quote) {
      return await interaction.editReply({
        content: '❌ Unable to get swap quote. Please try again later.',
      });
    }

    // Calculate output amount
    const rawOutputAmount = parseInt(quote.outAmount, 10) / Math.pow(10, toTokenInfo.decimals);
    const displayPrecision = Math.min(toTokenInfo.decimals, 6);
    const outputAmount = rawOutputAmount.toFixed(displayPrecision);

    // Create embed with swap details
    const embed = new EmbedBuilder()
      .setTitle('🔄 Token Swap Quote')
      .setDescription(
        `**From:** ${amount} ${fromToken}\n` +
        `**To:** ~${outputAmount} ${toToken}\n` +
        `**Price Impact:** ${quote.priceImpactPct ? (parseFloat(quote.priceImpactPct) * 100).toFixed(2) : '0.00'}%\n` +
        `**Route:** ${quote.routePlan?.length || 0} step(s)\n\n` +
        `⚠️ **Note:** This is a quote only. To execute the swap:\n` +
        `1. Copy the transaction data below\n` +
        `2. Sign it in your Solana wallet\n` +
        `3. Submit the transaction\n\n` +
        `_Swaps are powered by Jupiter Aggregator_`
      )
      .setColor(0x7c3aed)
      .setFooter({ text: 'Non-custodial - You control your keys' });

    // Get swap transaction
    const swapTx = await jupiter.getSwapTransaction(quote, userWallet, true);

    if (!swapTx || !swapTx.swapTransaction) {
      return await interaction.editReply({
        content: '❌ Unable to create swap transaction. Please try again later.',
      });
    }

    // Create buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('copy_swap_tx')
          .setLabel('📋 Copy Transaction')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setLabel('ℹ️ How to Execute')
          .setCustomId('swap_help')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      embeds: [embed],
      components: [row],
      content: `\`\`\`\n${swapTx.swapTransaction}\n\`\`\``,
    });

  } catch (error) {
    console.error('Swap command error:', error);
    
    const errorMessage = '❌ An error occurred while processing your swap request.';
    
    if (interaction.deferred) {
      await interaction.editReply({ content: errorMessage });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

/**
 * Handle swap help button
 * 
 * @param {Object} interaction - Discord button interaction
 * @returns {Promise<void>}
 */
async function handleSwapHelpButton(interaction) {
  const helpEmbed = new EmbedBuilder()
    .setTitle('ℹ️ How to Execute a Swap')
    .setDescription(
      '**Step 1:** Copy the transaction data from the message\n\n' +
      '**Step 2:** Open your Solana wallet (Phantom, Solflare, etc.)\n\n' +
      '**Step 3:** Look for an option to "Import Transaction" or "Sign Message"\n\n' +
      '**Step 4:** Paste the transaction data and sign it\n\n' +
      '**Step 5:** Submit the signed transaction to the network\n\n' +
      '**Need Help?** Contact support or check our documentation.'
    )
    .setColor(0x3b82f6);

  await interaction.reply({
    embeds: [helpEmbed],
    ephemeral: true,
  });
}

module.exports = {
  handleSwapCommand,
  handleSwapHelpButton,
};
