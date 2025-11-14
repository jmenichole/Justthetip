/**
 * JustTheTip - Tip Command Handler
 * Handles tipping between Discord users with USD to SOL conversion
 * Uses Solana Pay for direct P2P transfers (x402 Trustless Agent)
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const crypto = require('crypto');

/**
 * Generate Solana Pay URL for direct P2P transfer
 * @param {string} recipient - Recipient's wallet address
 * @param {number} amount - Amount in SOL
 * @param {string} reference - Unique reference for tracking
 * @param {string} memo - Optional memo
 * @returns {string} Solana Pay URL
 */
function generateSolanaPayURL(recipient, amount, reference, memo = 'JustTheTip') {
  const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
  const params = new URLSearchParams({
    amount: lamports.toString(),
    reference: reference,
    label: 'JustTheTip',
    message: memo
  });
  
  return `solana:${recipient}?${params.toString()}`;
}

/**
 * Handle the /tip command
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} context - Command context { sdk, database, priceService }
 */
async function handleTipCommand(interaction, context) {
  const { database, priceService, sdk } = context;
  
  const recipient = interaction.options.getUser('user');
  const usdAmount = interaction.options.getNumber('amount');
  const senderId = interaction.user.id;
  
  // Prevent self-tipping
  if (senderId === recipient.id) {
    return interaction.reply({ 
      content: '❌ You cannot tip yourself!', 
      ephemeral: true 
    });
  }
  
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
    // TODO: Store as pending tip and notify recipient
    return interaction.reply({ 
      content: `❌ **${recipient.username}** hasn't registered their wallet yet.\n\nThey need to use \`/register-wallet\` to receive tips.`, 
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
  
  // Check sender balance
  try {
    const balance = await sdk.getBalance(senderWallet);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    
    // Add 5% buffer for transaction fees
    const requiredSOL = solAmount * 1.05;
    
    if (balanceSOL < requiredSOL) {
      const balanceUSD = await priceService.convertSolToUsd(balanceSOL);
      const requiredUSD = await priceService.convertSolToUsd(requiredSOL);
      
      return interaction.reply({ 
        content: 
          `❌ **Insufficient Balance**\n\n` +
          `**You have:** ${balanceSOL.toFixed(4)} SOL (~$${balanceUSD.toFixed(2)} USD)\n` +
          `**Required:** ${requiredSOL.toFixed(4)} SOL (~$${requiredUSD.toFixed(2)} USD)\n` +
          `_Includes 5% buffer for transaction fees_`,
        ephemeral: true 
      });
    }
  } catch (error) {
    console.error('Error checking balance:', error);
    return interaction.reply({
      content: '❌ Could not verify your wallet balance. Please try again.',
      ephemeral: true
    });
  }
  
  // Generate unique reference for tracking
  const reference = crypto.randomUUID();
  
  // Store tip record for tracking
  try {
    await database.createPendingTip({
      senderId: senderId,
      recipientId: recipient.id,
      senderWallet: senderWallet,
      recipientWallet: recipientWallet,
      usdAmount: usdAmount,
      solAmount: solAmount,
      solPrice: solPrice,
      reference: reference,
      status: 'pending',
      createdAt: Date.now()
    });
  } catch (error) {
    console.error('Error storing tip record:', error);
    // Continue anyway - tip can still work without tracking
  }
  
  // Generate Solana Pay URL
  const solanaPayUrl = generateSolanaPayURL(
    recipientWallet,
    solAmount,
    reference,
    `Tip $${usdAmount.toFixed(2)} to ${recipient.username} via JustTheTip`
  );
  
  // Create embed
  const embed = new EmbedBuilder()
    .setTitle('💸 Send Tip')
    .setDescription(
      `**From:** <@${senderId}>\n` +
      `**To:** <@${recipient.id}>\n` +
      `**Amount:** $${usdAmount.toFixed(2)} USD (~${solAmount.toFixed(4)} SOL)\n` +
      `**SOL Price:** $${solPrice.toFixed(2)}\n\n` +
      `Click the button below to open your wallet and complete the transaction.\n\n` +
      `_Your wallet will pre-fill the transaction for you to approve_`
    )
    .setColor(0x667eea)
    .setFooter({ text: '100% Free • No Fees • x402 Trustless Agent' })
    .setTimestamp();
  
  // Create buttons
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('💸 Open in Wallet')
        .setStyle(ButtonStyle.Link)
        .setURL(solanaPayUrl),
      new ButtonBuilder()
        .setLabel('☕ Tip the Dev')
        .setStyle(ButtonStyle.Link)
        .setURL('https://mischief-manager.com/support')
    );
  
  // Send message
  await interaction.reply({ 
    embeds: [embed], 
    components: [row],
    ephemeral: false 
  });
  
  console.log(`💸 Tip initiated: ${interaction.user.tag} → ${recipient.tag}: $${usdAmount.toFixed(2)} USD (${solAmount.toFixed(4)} SOL) | Reference: ${reference}`);
  
  // Start monitoring for transaction (async, don't await)
  monitorTipTransaction(reference, interaction, recipient, usdAmount, solAmount, database).catch(err => {
    console.error('Error monitoring tip transaction:', err);
  });
}

/**
 * Monitor blockchain for tip transaction with specific reference
 * @param {string} reference - Unique reference UUID
 * @param {Interaction} interaction - Original Discord interaction
 * @param {User} recipient - Recipient Discord user
 * @param {number} usdAmount - USD amount
 * @param {number} solAmount - SOL amount
 * @param {Object} database - Database instance
 */
async function monitorTipTransaction(reference, interaction, recipient, usdAmount, solAmount, database) {
  const { Connection, PublicKey } = require('@solana/web3.js');
  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
  
  const maxAttempts = 60; // 5 minutes (5 second intervals)
  let attempts = 0;
  
  const checkTransaction = async () => {
    try {
      attempts++;
      
      // Search for transaction with our reference
      const signatures = await connection.getSignaturesForAddress(
        new PublicKey(reference), 
        { limit: 10 },
        'confirmed'
      );
      
      if (signatures.length > 0) {
        const signature = signatures[0].signature;
        
        // Get transaction details
        const tx = await connection.getTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        });
        
        if (tx && !tx.meta.err) {
          // Transaction confirmed!
          console.log(`✅ Tip confirmed: ${signature}`);
          
          // Update database
          await database.completeTip(reference, signature);
          
          // Send confirmation embed
          const confirmEmbed = new EmbedBuilder()
            .setTitle('✅ Tip Confirmed!')
            .setDescription(
              `**From:** <@${interaction.user.id}>\n` +
              `**To:** <@${recipient.id}>\n` +
              `**Amount:** $${usdAmount.toFixed(2)} USD (~${solAmount.toFixed(4)} SOL)\n\n` +
              `[View on Solscan](https://solscan.io/tx/${signature})\n\n` +
              `_JustTheTip is 100% free with no transaction fees_`
            )
            .setColor(0x10b981)
            .setFooter({ text: '100% Free • No Fees • x402 Trustless Agent' })
            .setTimestamp();
          
          try {
            await interaction.followUp({ embeds: [confirmEmbed] });
          } catch (error) {
            console.error('Could not send confirmation:', error);
          }
          
          // Notify recipient via DM
          try {
            await recipient.send({
              content: `💰 You received a $${usdAmount.toFixed(2)} tip from **${interaction.user.username}**!`,
              embeds: [confirmEmbed]
            });
          } catch (error) {
            // User has DMs disabled
            console.log(`Could not DM tip notification to ${recipient.tag}`);
          }
          
          return true; // Stop monitoring
        }
      }
      
      // Continue monitoring if not found or not confirmed
      if (attempts < maxAttempts) {
        setTimeout(checkTransaction, 5000); // Check every 5 seconds
      } else {
        console.log(`⏱️ Tip monitoring timeout for reference: ${reference}`);
        // Could send timeout message to user here
      }
      
    } catch (error) {
      console.error('Error checking transaction:', error);
      if (attempts < maxAttempts) {
        setTimeout(checkTransaction, 5000);
      }
    }
  };
  
  // Start monitoring after 5 second delay (give user time to approve)
  setTimeout(checkTransaction, 5000);
}

module.exports = { handleTipCommand };
