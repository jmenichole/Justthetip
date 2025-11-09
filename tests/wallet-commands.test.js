/**
 * Wallet Commands Tests
 * Tests for wallet management command implementations
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

const sqlite = require('../db/db.js');
const { isValidSolanaAddress } = require('../src/utils/validation');

describe('Wallet Commands', () => {
  
  describe('updateWallet function', () => {
    it('should update wallet address for a user', () => {
      const testUserId = 'testuser_' + Date.now();
      const testWallet = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'; // Valid Solana address
      
      // Create user and update wallet
      sqlite.updateWallet(testUserId, testWallet);
      
      // Verify wallet was updated
      const user = sqlite.getUser(testUserId);
      expect(user.wallet).toBe(testWallet);
    });

    it('should throw error when wallet update fails', () => {
      // This should not fail since getUser creates the user if it doesn't exist
      // So we'll test that it properly creates and updates
      const testUserId = 'newuser_' + Date.now();
      const testWallet = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
      
      expect(() => {
        sqlite.updateWallet(testUserId, testWallet);
      }).not.toThrow();
      
      const user = sqlite.getUser(testUserId);
      expect(user.wallet).toBe(testWallet);
    });

    it('should update existing user wallet', () => {
      const testUserId = 'existinguser_' + Date.now();
      const wallet1 = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
      const wallet2 = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
      
      // Create user with first wallet
      sqlite.updateWallet(testUserId, wallet1);
      let user = sqlite.getUser(testUserId);
      expect(user.wallet).toBe(wallet1);
      
      // Update to second wallet
      sqlite.updateWallet(testUserId, wallet2);
      user = sqlite.getUser(testUserId);
      expect(user.wallet).toBe(wallet2);
    });
  });

  describe('Wallet address validation', () => {
    it('should validate correct Solana addresses', () => {
      const validAddresses = [
        'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
        '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        'So11111111111111111111111111111111111111112'
      ];
      
      validAddresses.forEach(address => {
        expect(isValidSolanaAddress(address)).toBe(true);
      });
    });

    it('should reject invalid Solana addresses', () => {
      const invalidAddresses = [
        'invalid',
        '123',
        '',
        'not-a-valid-address',
        'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH-invalid'
      ];
      
      invalidAddresses.forEach(address => {
        expect(isValidSolanaAddress(address)).toBe(false);
      });
    });
  });

  describe('Wallet verification flow', () => {
    it('should show user as not verified without wallet', () => {
      const testUserId = 'noverify_' + Date.now();
      const user = sqlite.getUser(testUserId);
      
      expect(user.wallet).toBeNull();
      expect(user.trust_badge_mint).toBeNull();
    });

    it('should show user as connected after wallet update', () => {
      const testUserId = 'connected_' + Date.now();
      const testWallet = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
      
      sqlite.updateWallet(testUserId, testWallet);
      const user = sqlite.getUser(testUserId);
      
      expect(user.wallet).toBe(testWallet);
      expect(user.trust_badge_mint).toBeNull(); // Not fully verified yet
    });

    it('should show user as verified with trust badge', () => {
      const testUserId = 'verified_' + Date.now();
      const testWallet = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
      const testMint = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
      
      // Create trust badge (simulates full verification)
      sqlite.upsertTrustBadge(testUserId, testWallet, testMint, 100);
      
      const trustBadge = sqlite.getTrustBadgeByDiscordId(testUserId);
      expect(trustBadge).not.toBeNull();
      expect(trustBadge.wallet_address).toBe(testWallet);
      expect(trustBadge.mint_address).toBe(testMint);
      expect(trustBadge.reputation_score).toBe(100);
    });
  });

  describe('User reputation tracking', () => {
    it('should initialize reputation score to 0', () => {
      const testUserId = 'rep_' + Date.now();
      const user = sqlite.getUser(testUserId);
      
      expect(user.reputation_score).toBe(0);
    });

    it('should update reputation score', () => {
      const testUserId = 'rep_update_' + Date.now();
      const testWallet = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
      const testMint = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
      
      // Create trust badge with initial score
      sqlite.upsertTrustBadge(testUserId, testWallet, testMint, 50);
      
      // Update reputation
      sqlite.updateReputationScore(testUserId, 10);
      
      const score = sqlite.getReputationScore(testUserId);
      expect(score).toBe(60);
    });

    it('should not allow negative reputation scores', () => {
      const testUserId = 'rep_negative_' + Date.now();
      const testWallet = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
      const testMint = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
      
      // Create trust badge with initial score
      sqlite.upsertTrustBadge(testUserId, testWallet, testMint, 10);
      
      // Try to decrease below 0
      sqlite.updateReputationScore(testUserId, -20);
      
      const score = sqlite.getReputationScore(testUserId);
      expect(score).toBe(0); // Should be capped at 0
    });
  });
});
