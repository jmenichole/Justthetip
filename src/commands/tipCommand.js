'use strict';

const { LAMPORTS_PER_SOL } = require('@solana/web3.js');
const x402Client = require('../utils/x402Client');
const trustBadgeService = require('../utils/trustBadge');
const { createTipSuccessEmbed } = require('../utils/embedBuilders');
const { isValidAmount } = require('../utils/validation');

const MICROPAYMENT_SIGNER = process.env.X402_PAYER_SECRET;

class TipError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TipError';
    this.userMessage = message;
  }
}

async function executeTip({ sender, recipient, amount, currency = 'SOL', dependencies = {} }) {
  if (!recipient) {
    throw new TipError('❌ A valid recipient is required to send a tip.');
  }

  const payments = dependencies.x402Client || x402Client;
  const badges = dependencies.trustBadgeService || trustBadgeService;
  const db = dependencies.sqlite || require('../../db/db');

  const normalizedAmount = typeof amount === 'string' ? Number(amount) : amount;
  if (!isValidAmount(normalizedAmount)) {
    throw new TipError('❌ Amount must be a positive number.');
  }

  if (recipient.bot) {
    throw new TipError('🤖 Tips are for humans only. Bots work for free!');
  }

  if (recipient.id === sender.id) {
    throw new TipError('😅 You cannot tip yourself. Try a friend instead!');
  }

  const normalizedCurrency = (currency || 'SOL').toUpperCase();
  if (normalizedCurrency !== 'SOL') {
    throw new TipError('⚠️ The x402 micropayment client currently supports SOL tips only.');
  }

  if (!MICROPAYMENT_SIGNER) {
    throw new TipError('❌ Payment signer not configured. Set X402_PAYER_SECRET in your environment.');
  }

  const senderBadge = await badges.requireBadge(sender.id);
  const recipientBadge = await badges.requireBadge(recipient.id);

  const lamports = Math.round(normalizedAmount * LAMPORTS_PER_SOL);
  if (lamports <= 0) {
    throw new TipError('❌ Calculated lamports must be greater than zero.');
  }

  let paymentResult;
  try {
    paymentResult = await payments.sendPayment({
      fromSecret: MICROPAYMENT_SIGNER,
      toAddress: recipientBadge.wallet_address,
      amountLamports: lamports,
      reference: `tip:${sender.id}:${recipient.id}`,
    });
  } catch (error) {
    throw new TipError(`❌ Tip failed: ${error.message}`);
  }

  db.getUser(sender.id);
  db.getUser(recipient.id);
  db.recordTip(sender.id, recipient.id, normalizedAmount, normalizedCurrency, paymentResult.signature);

  const senderScore = await badges.adjustReputation(sender.id, 1);
  const recipientScore = await badges.adjustReputation(recipient.id, 2);

  return createTipSuccessEmbed(sender, recipient, normalizedAmount, normalizedCurrency)
    .setFooter({
      text: `Sig: ${paymentResult.signature.slice(0, 8)}… | Sender Rep ${senderScore} | Receiver Rep ${recipientScore}`,
    });
}

async function handleTipCommand(interaction, dependencies = {}) {
  const recipient = interaction.options.getUser('user');
  const amount = interaction.options.getNumber('amount');
  const currency = interaction.options.getString('currency') || 'SOL';

  try {
    await interaction.deferReply();
    const embed = await executeTip({
      sender: interaction.user,
      recipient,
      amount,
      currency,
      dependencies,
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    const message = error.userMessage || `❌ Tip failed: ${error.message}`;

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: message });
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
}

module.exports = {
  handleTipCommand,
  executeTip,
  TipError,
};
