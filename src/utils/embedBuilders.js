/**
 * JustTheTip - Discord Embed Builders
 * Centralized embed creation to eliminate duplication
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
 */

const { EmbedBuilder } = require('discord.js');

/**
 * Create portfolio balance embed
 * @param {Object} balances - Balance object with SOL, USDC properties
 * @param {Object} priceConfig - Price configuration object
 * @param {boolean} isRefresh - Whether this is a refresh action
 * @returns {EmbedBuilder} Discord embed for balance display
 */
function createBalanceEmbed(balances, priceConfig, isRefresh = false) {
  const solBalance = balances.SOL || 0;
  const usdcBalance = balances.USDC || 0;
  
  // Calculate approximate USD values
  const solUsdValue = solBalance * (priceConfig.SOL || 20);
  const usdcUsdValue = usdcBalance * (priceConfig.USDC || 1);
  const totalValue = solUsdValue + usdcUsdValue;
  
  const footerText = isRefresh 
    ? 'Balance updated with current prices'
    : 'Click refresh to update with current prices';
  
  return new EmbedBuilder()
    .setTitle('💎 Your Portfolio Balance')
    .setColor(0x3498db)
    .setDescription(
      `**Total Portfolio Value:** $${totalValue.toFixed(2)}\n\n` +
      `☀️ **SOL:** ${solBalance.toFixed(6)} (~$${solUsdValue.toFixed(2)})\n` +
      `💚 **USDC:** ${usdcBalance.toFixed(6)} (~$${usdcUsdValue.toFixed(2)})`
    )
    .setFooter({ text: footerText });
}

/**
 * Create on-chain balance embed for smart contract bot
 * @param {string} walletAddress - Solana wallet address
 * @param {number} balance - Balance in SOL
 * @param {boolean} isRefresh - Whether this is a refresh action
 * @returns {EmbedBuilder} Discord embed for on-chain balance
 */
function createOnChainBalanceEmbed(walletAddress, balance, isRefresh = false) {
  const description = isRefresh
    ? `**Wallet:** \`${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}\`\n` +
      `**Balance:** ${balance.toFixed(6)} SOL\n\n` +
      `*Balance updated from Solana blockchain*`
    : `**Wallet:** \`${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}\`\n` +
      `**Balance:** ${balance.toFixed(6)} SOL\n\n` +
      `*This is your actual on-chain balance, queried directly from the Solana blockchain.*`;
  
  const embed = new EmbedBuilder()
    .setTitle('💰 On-Chain Balance')
    .setDescription(description)
    .setColor(0x1e3a8a);
  
  if (isRefresh) {
    embed.setFooter({ text: 'Last updated: ' + new Date().toLocaleString() });
  }
  
  return embed;
}

/**
 * Create wallet registered embed
 * @param {string} currency - Currency type
 * @param {string} address - Wallet address
 * @param {boolean} isVerified - Whether signature was verified
 * @returns {EmbedBuilder} Discord embed for wallet registration
 */
function createWalletRegisteredEmbed(currency, address, isVerified = false) {
  const embed = new EmbedBuilder()
    .setTitle(isVerified ? '✅ Wallet Registered & Verified Successfully' : '✅ Wallet Registered')
    .setColor(0x2ecc71)
    .setDescription(
      isVerified 
        ? `Your ${currency} wallet has been registered and verified with signature!`
        : `Your Solana wallet has been registered for smart contract operations.\n\n**Address:** \`${address}\``
    )
    .addFields(
      { name: 'Currency', value: currency, inline: true },
      { name: 'Address', value: `\`${address.substring(0, 8)}...${address.substring(address.length - 8)}\``, inline: true }
    );
  
  if (isVerified) {
    embed
      .addFields(
        { name: 'Status', value: '✅ Verified', inline: false },
        { name: 'Security', value: '🔐 Signature verified - wallet ownership confirmed', inline: false }
      )
      .setFooter({ text: 'You can now deposit and withdraw using this verified address' });
  }
  
  return embed;
}

/**
 * Create tip success embed
 * @param {Object} sender - Sender user object
 * @param {Object} recipient - Recipient user object
 * @param {number} amount - Tip amount
 * @param {string} currency - Currency type
 * @returns {EmbedBuilder} Discord embed for successful tip
 */
function createTipSuccessEmbed(sender, recipient, amount, currency, details = {}) {
  const parts = [`${sender} tipped ${recipient} **${amount} ${currency}**! 🎉`];

  if (typeof details.recipientAmount === 'number') {
    parts.push(`✅ Recipient receives **${details.recipientAmount.toFixed(4)} ${currency}**`);
  }

  if (typeof details.feeAmount === 'number' && details.feeAmount > 0) {
    const walletPreview = details.feeWallet
      ? ` → \`${details.feeWallet.slice(0, 4)}…${details.feeWallet.slice(-4)}\``
      : '';
    parts.push(`🏦 Platform fee: **${details.feeAmount.toFixed(4)} ${currency}**${walletPreview}`);
  }

  const embed = new EmbedBuilder()
    .setTitle('💸 Tip Sent Successfully!')
    .setDescription(parts.join('\n'))
    .setColor(0x2ecc71)
    .setFooter({ text: 'Thanks for spreading the love!' });

  if (details.feeSignature) {
    embed.addFields({
      name: 'Fee Signature',
      value: `\`${details.feeSignature.slice(0, 8)}…${details.feeSignature.slice(-8)}\``,
      inline: false,
    });
  }

  return embed;
}

/**
 * Create airdrop embed
 * @param {Object} creator - Creator user object
 * @param {number} amount - Airdrop amount
 * @param {string} currency - Currency type
 * @returns {EmbedBuilder} Discord embed for airdrop
 */
function createAirdropEmbed(creator, amount, currency) {
  return new EmbedBuilder()
    .setTitle('🎁 Airdrop Created!')
    .setDescription(`${creator} is dropping **${amount} ${currency}**! Click to collect!`)
    .setColor(0x00ff99);
}

/**
 * Create airdrop collected embed
 * @param {number} amount - Collected amount
 * @param {string} currency - Currency type
 * @returns {EmbedBuilder} Discord embed for collected airdrop
 */
function createAirdropCollectedEmbed(amount, currency) {
  return new EmbedBuilder()
    .setTitle('🎉 Airdrop Collected!')
    .setDescription(`You collected **${amount} ${currency}**!`)
    .setColor(0xf1c40f);
}

module.exports = {
  createBalanceEmbed,
  createOnChainBalanceEmbed,
  createWalletRegisteredEmbed,
  createTipSuccessEmbed,
  createAirdropEmbed,
  createAirdropCollectedEmbed,
};
