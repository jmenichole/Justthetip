/**
 * Tests for shared utility modules
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

const {
  isValidSolanaAddress,
  isValidAmount,
  isSupportedCoin,
  isValidAddress,
  sanitizeString,
  verifySignature,
} = require('../src/utils/validation');

const rateLimiter = require('../src/utils/rateLimiter');

const {
  createBalanceEmbed,
  createOnChainBalanceEmbed,
  createWalletRegisteredEmbed,
  createTipSuccessEmbed,
  createAirdropEmbed,
  createAirdropCollectedEmbed,
} = require('../src/utils/embedBuilders');

describe('Validation Utilities', () => {
  describe('isValidSolanaAddress', () => {
    it('should validate correct Solana addresses', () => {
      const validAddress = '11111111111111111111111111111111';
      expect(isValidSolanaAddress(validAddress)).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(isValidSolanaAddress('invalid')).toBe(false);
      expect(isValidSolanaAddress('')).toBe(false);
      expect(isValidSolanaAddress(null)).toBe(false);
    });

    it('should reject addresses with invalid characters', () => {
      expect(isValidSolanaAddress('11111111111111111111111111111111!')).toBe(false);
    });
  });

  describe('isValidAmount', () => {
    it('should validate positive numbers', () => {
      expect(isValidAmount(1)).toBe(true);
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount(0.01)).toBe(true);
    });

    it('should reject zero and negative amounts', () => {
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount(-1)).toBe(false);
    });

    it('should reject amounts exceeding maximum', () => {
      expect(isValidAmount(1000001)).toBe(false);
      expect(isValidAmount(999999)).toBe(true);
    });

    it('should reject non-numeric values', () => {
      expect(isValidAmount('100')).toBe(false);
      expect(isValidAmount(NaN)).toBe(false);
    });
  });

  describe('isSupportedCoin', () => {
    it('should recognize supported coins', () => {
      expect(isSupportedCoin('SOL')).toBe(true);
      expect(isSupportedCoin('USDC')).toBe(true);
      expect(isSupportedCoin('LTC')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isSupportedCoin('sol')).toBe(true);
      expect(isSupportedCoin('usdc')).toBe(true);
    });

    it('should reject unsupported coins', () => {
      expect(isSupportedCoin('BTC')).toBe(false);
      expect(isSupportedCoin('ETH')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should limit length', () => {
      const longString = 'a'.repeat(200);
      expect(sanitizeString(longString).length).toBe(100);
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
    });
  });
});

describe('Rate Limiter', () => {
  beforeEach(() => {
    rateLimiter.clearAll();
  });

  it('should not rate limit first request', () => {
    expect(rateLimiter.isRateLimited('user1', 'command1')).toBe(false);
  });

  it('should rate limit after max requests', () => {
    const userId = 'user1';
    const command = 'tip';
    const max = 3;

    // First 3 requests should pass
    expect(rateLimiter.isRateLimited(userId, command, max)).toBe(false);
    expect(rateLimiter.isRateLimited(userId, command, max)).toBe(false);
    expect(rateLimiter.isRateLimited(userId, command, max)).toBe(false);

    // 4th request should be rate limited
    expect(rateLimiter.isRateLimited(userId, command, max)).toBe(true);
  });

  it('should track different users separately', () => {
    expect(rateLimiter.isRateLimited('user1', 'tip')).toBe(false);
    expect(rateLimiter.isRateLimited('user2', 'tip')).toBe(false);
  });

  it('should track different commands separately', () => {
    expect(rateLimiter.isRateLimited('user1', 'tip')).toBe(false);
    expect(rateLimiter.isRateLimited('user1', 'withdraw')).toBe(false);
  });

  it('should reset rate limit for specific user/command', () => {
    const userId = 'user1';
    const command = 'tip';

    rateLimiter.isRateLimited(userId, command, 1);
    rateLimiter.isRateLimited(userId, command, 1); // Would be rate limited

    rateLimiter.reset(userId, command);

    expect(rateLimiter.isRateLimited(userId, command, 1)).toBe(false);
  });

  it('should clear all rate limits', () => {
    rateLimiter.isRateLimited('user1', 'tip', 1);
    rateLimiter.isRateLimited('user2', 'withdraw', 1);

    rateLimiter.clearAll();

    expect(rateLimiter.isRateLimited('user1', 'tip', 1)).toBe(false);
    expect(rateLimiter.isRateLimited('user2', 'withdraw', 1)).toBe(false);
  });
});

describe('Embed Builders', () => {
  describe('createBalanceEmbed', () => {
    it('should create balance embed with correct data', () => {
      const balances = { SOL: 1.5, USDC: 100 };
      const priceConfig = { SOL: 20, USDC: 1 };

      const embed = createBalanceEmbed(balances, priceConfig);

      expect(embed.data.title).toBe('💎 Your Portfolio');
      expect(embed.data.color).toBe(0x14F195);
      expect(embed.data.description).toContain('$130.00'); // 1.5 * 20 + 100 * 1
    });

    it('should handle zero balances', () => {
      const balances = { SOL: 0, USDC: 0 };
      const priceConfig = { SOL: 20, USDC: 1 };

      const embed = createBalanceEmbed(balances, priceConfig);

      expect(embed.data.description).toContain('$0.00');
    });
  });

  describe('createOnChainBalanceEmbed', () => {
    it('should create on-chain balance embed', () => {
      const address = '11111111111111111111111111111111';
      const balance = 2.5;

      const embed = createOnChainBalanceEmbed(address, balance);

      expect(embed.data.title).toBe('💰 On-Chain Balance');
      expect(embed.data.description).toContain('2.500000 SOL');
    });

    it('should show refresh timestamp when isRefresh is true', () => {
      const address = '11111111111111111111111111111111';
      const balance = 1.0;

      const embed = createOnChainBalanceEmbed(address, balance, true);

      expect(embed.data.footer).toBeDefined();
      expect(embed.data.footer.text).toContain('Last updated:');
    });
  });

  describe('createWalletRegisteredEmbed', () => {
    it('should create verified wallet embed', () => {
      const embed = createWalletRegisteredEmbed('SOL', '11111111111111111111111111111111', true);

      expect(embed.data.title).toContain('Verified');
      expect(embed.data.fields).toBeDefined();
    });

    it('should create unverified wallet embed', () => {
      const embed = createWalletRegisteredEmbed('SOL', '11111111111111111111111111111111', false);

      expect(embed.data.title).toBe('✅ Wallet Registered');
    });
  });

  describe('createTipSuccessEmbed', () => {
    it('should create tip success embed', () => {
      const sender = { toString: () => '@sender' };
      const recipient = { toString: () => '@recipient' };

      const embed = createTipSuccessEmbed(sender, recipient, 10, 'SOL');

      expect(embed.data.title).toBe('💸 Tip Sent Successfully!');
      expect(embed.data.description).toContain('10 SOL');
    });
  });

  describe('createAirdropEmbed', () => {
    it('should create airdrop embed', () => {
      const creator = { toString: () => '@creator' };

      const embed = createAirdropEmbed(creator, 5, 'USDC');

      expect(embed.data.title).toBe('🎁 Airdrop Created!');
      expect(embed.data.description).toContain('5 USDC');
    });
  });

  describe('createAirdropCollectedEmbed', () => {
    it('should create collected airdrop embed', () => {
      const embed = createAirdropCollectedEmbed(2, 'SOL');

      expect(embed.data.title).toBe('🎉 Airdrop Collected!');
      expect(embed.data.description).toContain('2 SOL');
    });
  });
});
