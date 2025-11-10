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
const priceService = require('../utils/priceService');
const feeWallets = require('../../security/feeWallet.json');

const MICROPAYMENT_SIGNER = process.env.X402_PAYER_SECRET;
const FEE_RATE = 0.005; // 0.5% fee
const FEE_WALLET_SOL = feeWallets.SOL;

async function handleTipCommand(interaction, dependencies = {}) {
  const payments = dependencies.x402Client || x402Client;
  const badges = dependencies.trustBadgeService || trustBadgeService;
  const db = dependencies.sqlite || require('../../db/db');
  const prices = dependencies.priceService || priceService;

  const recipient = interaction.options.getUser('user');
  const amountInput = interaction.options.getString('amount');
  const currency = 'SOL'; // Only SOL is supported now

  // Check if amount is "all" keyword
  const isAllAmount = typeof amountInput === 'string' && amountInput.toLowerCase() === 'all';
  
  // Check if amount starts with $ to indicate USD
  let isUsdAmount = false;
  let numericAmount = 0;

  if (!isAllAmount) {
    if (typeof amountInput === 'string' && amountInput.startsWith('$')) {
      isUsdAmount = true;
      numericAmount = parseFloat(amountInput.substring(1));
    } else {
      numericAmount = parseFloat(amountInput);
    }

    if (!isValidAmount(numericAmount)) {
      await interaction.reply({ content: '❌ Amount must be a positive number. Use `$10` for USD, `0.5` for SOL, or `all` to send your entire balance.', ephemeral: true });
      return;
    }
  }

  if (recipient.id === interaction.user.id) {
    await interaction.reply({ content: '😅 You cannot tip yourself. Try a friend instead!', ephemeral: true });
    return;
  }

  if (!MICROPAYMENT_SIGNER) {
    await interaction.reply({ content: '❌ Payment signer not configured. Set X402_PAYER_SECRET in your environment.', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  try {
    // Check if sender has a badge
    let senderBadge;
    try {
      senderBadge = await badges.requireBadge(interaction.user.id);
    } catch (error) {
      await interaction.editReply({ 
        content: '❌ You need to register your wallet before sending tips.\n\n' +
                 'Use `/register-wallet` to get started!',
      });
      return;
    }

    // If user specified "all", get their current balance from the payment signer wallet
    if (isAllAmount) {
      try {
        // Get the balance of the micropayment signer (bot's wallet that holds funds)
        // Note: In this system, the bot wallet holds the funds and sends on behalf of users
        const { Keypair } = require('@solana/web3.js');
        const bs58 = require('bs58');
        const bs58decode = bs58.default?.decode || bs58.decode;
        const signerKeypair = Keypair.fromSecretKey(bs58decode(MICROPAYMENT_SIGNER));
        const balanceResult = await payments.getBalance(signerKeypair.publicKey.toBase58());
        
        // Reserve some SOL for transaction fees (0.001 SOL per transaction)
        const reservedForFees = 0.001;
        const availableBalance = balanceResult.sol - reservedForFees;
        
        if (availableBalance <= 0) {
          await interaction.editReply({ 
            content: '❌ Insufficient balance to send tip. Your available balance (after reserving for fees) is 0 SOL.',
          });
          return;
        }
        
        numericAmount = availableBalance;
        // Note: "all" cannot be used with USD conversion, so isUsdAmount remains false
      } catch (balanceError) {
        console.error('Failed to get balance for "all" amount:', balanceError);
        await interaction.editReply({ 
          content: '❌ Failed to retrieve balance. Please try again or specify a specific amount.',
        });
        return;
      }
    }

    // Check if recipient has a badge
    let recipientBadge;
    try {
      recipientBadge = await badges.requireBadge(recipient.id);
    } catch (error) {
      // Recipient is not registered - create pending tip and notify them
      
      // Convert USD to SOL if needed, or use the amount we already have (from "all" or direct input)
      let amountInSol = numericAmount;
      let originalUsdAmount = null;
      if (isUsdAmount) {
        amountInSol = await prices.convertUsdToSol(numericAmount);
        originalUsdAmount = numericAmount;
      }

      // Create pending tip
      const pendingTip = db.createPendingTip(
        interaction.user.id,
        recipient.id,
        amountInSol,
        currency,
        originalUsdAmount
      );

      // Try to DM the recipient
      try {
        const dmChannel = await recipient.createDM();
        const amountDisplay = isUsdAmount 
          ? `$${numericAmount} USD (${amountInSol.toFixed(6)} SOL)` 
          : isAllAmount 
            ? `${amountInSol.toFixed(6)} SOL (your full balance)`
            : `${amountInSol.toFixed(6)} SOL`;
        
        await dmChannel.send(
          `🎉 **You've received a tip!**\n\n` +
          `${interaction.user} just sent you **${amountDisplay}**!\n\n` +
          `To claim your tip, you need to register your wallet:\n` +
          `1. Use the \`/register-wallet\` command in any server where JustTheTip is available\n` +
          `2. Complete the wallet verification process\n` +
          `3. Your tip will be automatically sent to your wallet!\n\n` +
          `⏰ **Important:** You have **24 hours** to register your wallet. ` +
          `After that, the tip will be returned to ${interaction.user.username}.\n\n` +
          `_Need help? Use \`/support\` in the server._`
        );
        
        db.markPendingTipNotified(pendingTip.id);
      } catch (dmError) {
        console.error('Failed to DM recipient:', dmError);
        // Continue even if DM fails
      }

      // Reply to the sender
      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setTitle('💌 Tip Pending - User Not Registered')
        .setDescription(
          `Your tip to ${recipient} has been queued!\n\n` +
          `They've been notified via DM and have **24 hours** to register their wallet.\n` +
          `Once they register, the tip will be sent automatically.`
        )
        .setColor(0xffa500)
        .addFields(
          { 
            name: '💰 Amount', 
            value: isUsdAmount 
              ? `$${numericAmount} USD (${amountInSol.toFixed(6)} SOL)` 
              : isAllAmount 
                ? `${amountInSol.toFixed(6)} SOL (your full balance)` 
                : `${amountInSol.toFixed(6)} SOL`, 
            inline: true 
          },
          { name: '⏰ Expires', value: `<t:${Math.floor(new Date(pendingTip.expires_at).getTime() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'If not claimed within 24 hours, the tip will be returned to you.' });
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Convert USD to SOL if needed
    let amountInSol = numericAmount;
    if (isUsdAmount) {
      amountInSol = await prices.convertUsdToSol(numericAmount);
    }

    // Calculate fee (0.5% of the amount)
    const feeAmount = amountInSol * FEE_RATE;
    const netAmount = amountInSol - feeAmount;

    // Convert to lamports
    const netLamports = Math.round(netAmount * LAMPORTS_PER_SOL);
    const feeLamports = Math.round(feeAmount * LAMPORTS_PER_SOL);
    
    if (netLamports <= 0) {
      throw new Error('Net amount must be greater than zero after fees.');
    }

    // Send net amount to recipient
    const paymentResult = await payments.sendPayment({
      fromSecret: MICROPAYMENT_SIGNER,
      toAddress: recipientBadge.wallet_address,
      amountLamports: netLamports,
      reference: `tip:${interaction.user.id}:${recipient.id}`,
    });

    // Send fee to fee wallet
    let feeSignature = null;
    if (feeLamports > 0) {
      try {
        const feeResult = await payments.sendPayment({
          fromSecret: MICROPAYMENT_SIGNER,
          toAddress: FEE_WALLET_SOL,
          amountLamports: feeLamports,
          reference: `fee:${interaction.user.id}:${recipient.id}`,
        });
        feeSignature = feeResult.signature;
      } catch (feeError) {
        console.error('Fee transfer failed:', feeError);
        // Continue even if fee transfer fails
      }
    }

    db.getUser(interaction.user.id);
    db.getUser(recipient.id);
    db.recordTip(interaction.user.id, recipient.id, amountInSol, currency, paymentResult.signature);

    const senderScore = await badges.adjustReputation(interaction.user.id, 1);
    const recipientScore = await badges.adjustReputation(recipient.id, 2);

    const embed = createTipSuccessEmbed(interaction.user, recipient, amountInSol, currency, feeAmount, netAmount);
    
    let footerText = `Sig: ${paymentResult.signature.slice(0, 8)}… | Sender Rep ${senderScore} | Receiver Rep ${recipientScore}`;
    if (feeSignature) {
      footerText += ` | Fee: ${feeSignature.slice(0, 8)}…`;
    }
    
    embed.setFooter({ text: footerText });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Tip command failed:', error);
    await interaction.editReply({ content: `❌ Tip failed: ${error.message}` });
  }
}

module.exports = {
  handleTipCommand,
};
