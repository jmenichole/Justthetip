/**
 * JustTheTip - Tip Command Module
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

'use strict';

const { LAMPORTS_PER_SOL } = require('@solana/web3.js');
const x402Client = require('../utils/x402Client');
const trustBadgeService = require('../utils/trustBadge');
const { createTipSuccessEmbed } = require('../utils/embedBuilders');
const { isValidAmount } = require('../utils/validation');
const { isTokenSupported, getTokenInfo, getTokenDecimals } = require('../utils/tokenRegistry');

const MICROPAYMENT_SIGNER = process.env.X402_PAYER_SECRET;

async function handleTipCommand(interaction, dependencies = {}) {
  const payments = dependencies.x402Client || x402Client;
  const badges = dependencies.trustBadgeService || trustBadgeService;
  const db = dependencies.sqlite || require('../../db/db');

  const recipient = interaction.options.getUser('user');
  const amount = interaction.options.getNumber('amount');
  const currency = interaction.options.getString('currency') || 'SOL';

  if (!isValidAmount(amount)) {
    await interaction.reply({ content: '❌ Amount must be a positive number.', ephemeral: true });
    return;
  }

  if (recipient.id === interaction.user.id) {
    await interaction.reply({ content: '😅 You cannot tip yourself. Try a friend instead!', ephemeral: true });
    return;
  }

  // Check if token is supported
  const tokenSymbol = currency.toUpperCase();
  if (!isTokenSupported(tokenSymbol)) {
    await interaction.reply({ 
      content: `❌ Token ${tokenSymbol} is not supported. Supported tokens: SOL, USDC, BONK, USDT`, 
      ephemeral: true 
    });
    return;
  }

  // For now, only SOL tips are enabled via x402 client
  // Multi-token support requires on-chain transaction building
  if (tokenSymbol !== 'SOL') {
    await interaction.reply({ 
      content: `⚠️ ${tokenSymbol} tipping is coming soon! Currently only SOL tips are available via the x402 micropayment system.\n\nMulti-token support (USDC, BONK, USDT) will be enabled in the next update as part of our Trustless Agent enhancement.`, 
      ephemeral: true 
    });
    return;
  }

  if (!MICROPAYMENT_SIGNER) {
    await interaction.reply({ content: '❌ Payment signer not configured. Set X402_PAYER_SECRET in your environment.', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  try {
    const senderBadge = await badges.requireBadge(interaction.user.id);
    const recipientBadge = await badges.requireBadge(recipient.id);

    const lamports = Math.round(amount * LAMPORTS_PER_SOL);
    if (lamports <= 0) {
      throw new Error('Calculated lamports must be greater than zero.');
    }

    const paymentResult = await payments.sendPayment({
      fromSecret: MICROPAYMENT_SIGNER,
      toAddress: recipientBadge.wallet_address,
      amountLamports: lamports,
      reference: `tip:${interaction.user.id}:${recipient.id}`,
    });

    db.getUser(interaction.user.id);
    db.getUser(recipient.id);
    db.recordTip(interaction.user.id, recipient.id, amount, currency, paymentResult.signature);

    const senderScore = await badges.adjustReputation(interaction.user.id, 1);
    const recipientScore = await badges.adjustReputation(recipient.id, 2);

    const embed = createTipSuccessEmbed(interaction.user, recipient, amount, currency)
      .setFooter({ text: `Sig: ${paymentResult.signature.slice(0, 8)}… | Sender Rep ${senderScore} | Receiver Rep ${recipientScore}` });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Tip command failed:', error);
    await interaction.editReply({ content: `❌ Tip failed: ${error.message}` });
  }
}

module.exports = {
  handleTipCommand,
};
