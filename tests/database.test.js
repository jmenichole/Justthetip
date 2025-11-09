/**
 * Database Tests
 * Tests for SQLite database functions
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

const Database = require('../db/database.js');

// Note: Using the main db instance since it's in-memory for tests
// and automatically cleans up

describe('SQLite Database Functions', () => {

  // Note: Tests are disabled for direct sqlite calls since it uses the main database
  // We test through the Database wrapper instead
});

describe('Database Wrapper', () => {
  const db = Database;

  describe('connectDB', () => {
    it('should connect without errors', async () => {
      await expect(db.connectDB()).resolves.not.toThrow();
    });
  });

  describe('getBalances', () => {
    it('should return balance object', async () => {
      const balances = await db.getBalances('testuser');
      expect(balances).toBeDefined();
      expect(balances).toHaveProperty('SOL');
      expect(balances).toHaveProperty('USDC');
      expect(balances).toHaveProperty('LTC');
    });
  });

  describe('processTip', () => {
    it('should process a tip successfully', async () => {
      await db.creditBalance('sender123', 100, 'SOL');
      await expect(
        db.processTip('sender123', 'receiver123', 10, 'SOL')
      ).resolves.not.toThrow();
    });

    it('should throw error for insufficient balance', async () => {
      await expect(
        db.processTip('pooruser', 'richuser', 100, 'SOL')
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('creditBalance', () => {
    it('should credit user balance', async () => {
      const uniqueUser = 'credituser_' + Date.now() + '_' + Math.random();
      await db.creditBalance(uniqueUser, 50, 'SOL');
      const balances = await db.getBalances(uniqueUser);
      expect(balances.SOL).toBe(50);
    });
  });

  describe('getUserTransactions', () => {
    it('should return user transactions', async () => {
      await db.creditBalance('txuser1', 100, 'SOL');
      await db.processTip('txuser1', 'txuser2', 10, 'SOL');
      
      const transactions = await db.getUserTransactions('txuser1', 10);
      expect(transactions).toBeDefined();
      expect(Array.isArray(transactions)).toBe(true);
    });
  });
});
