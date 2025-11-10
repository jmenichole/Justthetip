/**
 * JustTheTip - Pending Tips Processor
 * Background job to process expired pending tips and return them to senders
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

const db = require('../../db/db');
const logger = require('../utils/logger');

/**
 * Process expired pending tips and notify users
 * @param {Object} client - Discord client instance
 */
async function processExpiredPendingTips(client) {
  try {
    const expiredTips = db.getExpiredPendingTips();
    
    if (expiredTips.length === 0) {
      return;
    }

    logger.info(`[PendingTips] Processing ${expiredTips.length} expired pending tips`);

    for (const tip of expiredTips) {
      try {
        // Get sender and receiver users
        const sender = await client.users.fetch(tip.sender_id).catch(() => null);
        const receiver = await client.users.fetch(tip.receiver_id).catch(() => null);

        // Notify sender that tip is being returned
        if (sender) {
          try {
            const dmChannel = await sender.createDM();
            const amountDisplay = tip.amount_in_usd 
              ? `$${tip.amount_in_usd} USD (${tip.amount} SOL)`
              : `${tip.amount} SOL`;

            await dmChannel.send(
              `⏰ **Tip Expired - Returned**\n\n` +
              `Your tip of **${amountDisplay}** to ${receiver ? `<@${receiver.id}>` : 'a user'} has expired.\n\n` +
              `The recipient did not register their wallet within 24 hours, so no funds were transferred.\n\n` +
              `_You can try tipping them again once they register their wallet._`
            );
          } catch (dmError) {
            logger.error(`[PendingTips] Failed to DM sender ${tip.sender_id}: ${dmError.message}`);
          }
        }

        // Optionally notify receiver that they missed a tip
        if (receiver) {
          try {
            const dmChannel = await receiver.createDM();
            const amountDisplay = tip.amount_in_usd 
              ? `$${tip.amount_in_usd} USD (${tip.amount} SOL)`
              : `${tip.amount} SOL`;

            await dmChannel.send(
              `😢 **Missed Tip - Expired**\n\n` +
              `A tip of **${amountDisplay}** from ${sender ? `<@${sender.id}>` : 'a user'} has expired.\n\n` +
              `You didn't register your wallet within 24 hours, so the tip could not be processed.\n\n` +
              `🔐 **Register now to receive future tips:**\n` +
              `Use \`/register-wallet\` in any server with JustTheTip to get started!`
            );
          } catch (dmError) {
            logger.error(`[PendingTips] Failed to DM receiver ${tip.receiver_id}: ${dmError.message}`);
          }
        }

        // Delete the expired pending tip
        db.deletePendingTip(tip.id);
        logger.info(`[PendingTips] Processed expired tip ${tip.id} from ${tip.sender_id} to ${tip.receiver_id}`);

      } catch (error) {
        logger.error(`[PendingTips] Error processing expired tip ${tip.id}: ${error.message}`);
      }
    }

    logger.info(`[PendingTips] Completed processing expired tips`);

  } catch (error) {
    logger.error(`[PendingTips] Error in processExpiredPendingTips: ${error.message}`);
  }
}

/**
 * Process pending tips for a newly registered user
 * @param {string} userId - Discord user ID
 * @param {string} walletAddress - Registered wallet address
 * @param {Object} client - Discord client instance
 * @param {Object} x402Client - Payment client
 * @returns {number} Number of tips processed
 */
async function processPendingTipsForUser(userId, walletAddress, client, x402Client) {
  try {
    const pendingTips = db.getPendingTipsForUser(userId);
    
    if (pendingTips.length === 0) {
      return 0;
    }

    logger.info(`[PendingTips] Processing ${pendingTips.length} pending tips for user ${userId}`);

    const { LAMPORTS_PER_SOL } = require('@solana/web3.js');
    const feeWallets = require('../../security/feeWallet.json');
    const FEE_RATE = 0.005;
    const FEE_WALLET_SOL = feeWallets.SOL;
    const MICROPAYMENT_SIGNER = process.env.X402_PAYER_SECRET;

    let processedCount = 0;

    for (const tip of pendingTips) {
      try {
        const amountInSol = tip.amount;
        const feeAmount = amountInSol * FEE_RATE;
        const netAmount = amountInSol - feeAmount;

        const netLamports = Math.round(netAmount * LAMPORTS_PER_SOL);
        const feeLamports = Math.round(feeAmount * LAMPORTS_PER_SOL);

        if (netLamports <= 0) {
          logger.warn(`[PendingTips] Skipping tip ${tip.id} - net amount too small`);
          db.deletePendingTip(tip.id);
          continue;
        }

        // Send net amount to recipient
        const paymentResult = await x402Client.sendPayment({
          fromSecret: MICROPAYMENT_SIGNER,
          toAddress: walletAddress,
          amountLamports: netLamports,
          reference: `pending-tip:${tip.sender_id}:${userId}:${tip.id}`,
        });

        // Send fee to fee wallet
        if (feeLamports > 0) {
          try {
            await x402Client.sendPayment({
              fromSecret: MICROPAYMENT_SIGNER,
              toAddress: FEE_WALLET_SOL,
              amountLamports: feeLamports,
              reference: `pending-fee:${tip.sender_id}:${userId}:${tip.id}`,
            });
          } catch (feeError) {
            logger.error(`[PendingTips] Fee transfer failed for tip ${tip.id}: ${feeError.message}`);
          }
        }

        // Record the tip in the database
        db.recordTip(tip.sender_id, userId, amountInSol, tip.currency, paymentResult.signature);

        // Notify sender that tip was delivered
        try {
          const sender = await client.users.fetch(tip.sender_id).catch(() => null);
          if (sender) {
            const dmChannel = await sender.createDM();
            const amountDisplay = tip.amount_in_usd 
              ? `$${tip.amount_in_usd} USD (${amountInSol.toFixed(6)} SOL)`
              : `${amountInSol.toFixed(6)} SOL`;

            await dmChannel.send(
              `✅ **Pending Tip Delivered!**\n\n` +
              `Your tip of **${amountDisplay}** has been successfully sent to <@${userId}>!\n\n` +
              `They registered their wallet and the tip was automatically delivered.\n\n` +
              `Transaction: \`${paymentResult.signature.slice(0, 16)}...\``
            );
          }
        } catch (dmError) {
          logger.error(`[PendingTips] Failed to notify sender ${tip.sender_id}: ${dmError.message}`);
        }

        // Delete the processed pending tip
        db.deletePendingTip(tip.id);
        processedCount++;

        logger.info(`[PendingTips] Successfully processed pending tip ${tip.id}`);

      } catch (error) {
        logger.error(`[PendingTips] Error processing tip ${tip.id}: ${error.message}`);
      }
    }

    return processedCount;

  } catch (error) {
    logger.error(`[PendingTips] Error in processPendingTipsForUser: ${error.message}`);
    return 0;
  }
}

/**
 * Start the background job to check for expired pending tips
 * Runs every hour
 * @param {Object} client - Discord client instance
 */
function startPendingTipsProcessor(client) {
  // Run immediately on start
  processExpiredPendingTips(client).catch(error => {
    logger.error(`[PendingTips] Initial check failed: ${error.message}`);
  });

  // Then run every hour
  setInterval(() => {
    processExpiredPendingTips(client).catch(error => {
      logger.error(`[PendingTips] Scheduled check failed: ${error.message}`);
    });
  }, 60 * 60 * 1000); // 1 hour

  logger.info('[PendingTips] Background processor started');
}

module.exports = {
  processExpiredPendingTips,
  processPendingTipsForUser,
  startPendingTipsProcessor,
};
