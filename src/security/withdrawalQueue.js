/**
 * Withdrawal Approval System
 * Admin must approve large withdrawals before they're processed
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

const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');

class WithdrawalQueue {
  constructor(database, connection) {
    this.db = database;
    this.connection = connection;
    
    // Configuration
    this.AUTO_APPROVE_THRESHOLD = 0.1 * LAMPORTS_PER_SOL; // Auto-approve under 0.1 SOL
    this.PENDING_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Request a withdrawal
   * @param {string} userId - Discord user ID
   * @param {string} username - Discord username
   * @param {string} toAddress - Destination wallet address
   * @param {number} amount - Amount in lamports
   * @param {string} currency - Currency type (SOL/USDC)
   * @returns {Promise<Object>} - Withdrawal request details
   */
  async requestWithdrawal(userId, username, toAddress, amount, currency = 'SOL') {
    // Validate destination address
    try {
      new PublicKey(toAddress);
    } catch (err) {
      throw new Error('Invalid destination address');
    }

    // Check user balance
    const userBalance = await this._getUserBalance(userId, currency);
    if (userBalance < amount) {
      throw new Error('Insufficient balance');
    }

    // Create withdrawal request
    const withdrawal = {
      id: this._generateWithdrawalId(),
      userId,
      username,
      toAddress,
      amount,
      currency,
      status: 'PENDING',
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + this.PENDING_TIMEOUT),
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      txSignature: null
    };

    // Auto-approve small withdrawals
    if (amount <= this.AUTO_APPROVE_THRESHOLD) {
      withdrawal.status = 'AUTO_APPROVED';
      withdrawal.approvedAt = new Date();
      withdrawal.approvedBy = 'SYSTEM';
      
      // Process immediately
      try {
        const txSignature = await this._processWithdrawal(withdrawal);
        withdrawal.txSignature = txSignature;
        withdrawal.status = 'COMPLETED';
      } catch (error) {
        withdrawal.status = 'FAILED';
        withdrawal.rejectionReason = error.message;
      }
    }

    // Save to database
    await this.db.collection('withdrawalQueue').insertOne(withdrawal);

    // Log to audit trail
    await this.db.collection('auditLog').insertOne({
      action: 'WITHDRAWAL_REQUESTED',
      userId,
      withdrawalId: withdrawal.id,
      amount,
      currency,
      status: withdrawal.status,
      timestamp: new Date()
    });

    return withdrawal;
  }

  /**
   * Approve a withdrawal (admin only)
   * @param {string} withdrawalId - Withdrawal request ID
   * @param {string} adminId - Admin Discord user ID
   * @returns {Promise<Object>} - Updated withdrawal
   */
  async approveWithdrawal(withdrawalId, adminId) {
    const withdrawal = await this.db.collection('withdrawalQueue').findOne({ id: withdrawalId });

    if (!withdrawal) {
      throw new Error('Withdrawal request not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new Error(`Cannot approve withdrawal with status: ${withdrawal.status}`);
    }

    if (Date.now() > withdrawal.expiresAt.getTime()) {
      await this._expireWithdrawal(withdrawalId);
      throw new Error('Withdrawal request has expired');
    }

    // Process the withdrawal
    try {
      const txSignature = await this._processWithdrawal(withdrawal);

      await this.db.collection('withdrawalQueue').updateOne(
        { id: withdrawalId },
        {
          $set: {
            status: 'COMPLETED',
            approvedBy: adminId,
            approvedAt: new Date(),
            txSignature
          }
        }
      );

      // Log to audit trail
      await this.db.collection('auditLog').insertOne({
        action: 'WITHDRAWAL_APPROVED',
        adminId,
        withdrawalId,
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        txSignature,
        timestamp: new Date()
      });

      return { ...withdrawal, status: 'COMPLETED', txSignature, approvedBy: adminId };
    } catch (error) {
      await this.db.collection('withdrawalQueue').updateOne(
        { id: withdrawalId },
        {
          $set: {
            status: 'FAILED',
            approvedBy: adminId,
            approvedAt: new Date(),
            rejectionReason: error.message
          }
        }
      );

      throw new Error(`Withdrawal processing failed: ${error.message}`);
    }
  }

  /**
   * Reject a withdrawal (admin only)
   * @param {string} withdrawalId - Withdrawal request ID
   * @param {string} adminId - Admin Discord user ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} - Updated withdrawal
   */
  async rejectWithdrawal(withdrawalId, adminId, reason) {
    const withdrawal = await this.db.collection('withdrawalQueue').findOne({ id: withdrawalId });

    if (!withdrawal) {
      throw new Error('Withdrawal request not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new Error(`Cannot reject withdrawal with status: ${withdrawal.status}`);
    }

    await this.db.collection('withdrawalQueue').updateOne(
      { id: withdrawalId },
      {
        $set: {
          status: 'REJECTED',
          rejectedBy: adminId,
          rejectedAt: new Date(),
          rejectionReason: reason
        }
      }
    );

    // Log to audit trail
    await this.db.collection('auditLog').insertOne({
      action: 'WITHDRAWAL_REJECTED',
      adminId,
      withdrawalId,
      userId: withdrawal.userId,
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      reason,
      timestamp: new Date()
    });

    return { ...withdrawal, status: 'REJECTED', rejectedBy: adminId, rejectionReason: reason };
  }

  /**
   * Get pending withdrawals
   * @returns {Promise<Array>} - List of pending withdrawals
   */
  async getPendingWithdrawals() {
    return await this.db.collection('withdrawalQueue')
      .find({ status: 'PENDING' })
      .sort({ requestedAt: 1 })
      .toArray();
  }

  /**
   * Get user's withdrawal history
   * @param {string} userId - Discord user ID
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Withdrawal history
   */
  async getUserWithdrawals(userId, limit = 10) {
    return await this.db.collection('withdrawalQueue')
      .find({ userId })
      .sort({ requestedAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Process withdrawal transaction
   * @private
   * @param {Object} withdrawal - Withdrawal details
   * @returns {Promise<string>} - Transaction signature
   */
  async _processWithdrawal(withdrawal) {
    // This would connect to your hot wallet or use connected user wallet
    // For now, throwing error since we don't have private key
    throw new Error('Withdrawal processing requires bot wallet configuration or user wallet signature');
    
    // Implementation would be:
    // 1. Create transaction to send SOL/USDC
    // 2. Sign with bot wallet or request user signature
    // 3. Send transaction
    // 4. Return signature
  }

  /**
   * Get user balance from database
   * @private
   */
  async _getUserBalance(userId, currency) {
    const wallet = await this.db.collection('wallets').findOne({ userId });
    if (!wallet) return 0;
    return wallet[currency.toLowerCase()] || 0;
  }

  /**
   * Expire old withdrawal
   * @private
   */
  async _expireWithdrawal(withdrawalId) {
    await this.db.collection('withdrawalQueue').updateOne(
      { id: withdrawalId },
      { $set: { status: 'EXPIRED' } }
    );
  }

  /**
   * Generate withdrawal ID
   * @private
   */
  _generateWithdrawalId() {
    return `WD${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  /**
   * Clean up expired withdrawals
   */
  async cleanupExpired() {
    const now = new Date();
    const result = await this.db.collection('withdrawalQueue').updateMany(
      {
        status: 'PENDING',
        expiresAt: { $lt: now }
      },
      {
        $set: { status: 'EXPIRED' }
      }
    );

    return result.modifiedCount;
  }
}

module.exports = WithdrawalQueue;
