/**
 * JustTheTip - Natural Language Service Tests
 * Test natural language processing for transactions
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const {
  processNaturalLanguage,
  parseTransactionIntent,
  parseBalanceCheck,
  parseHistoryRequest,
  parseAirdropIntent,
  parseHelpRequest,
  generateTransactionResponse,
  generateBalanceResponse,
  formatPeriod,
  isBotMentioned
} = require('../src/services/naturalLanguageService');

describe('Natural Language Service', () => {
  describe('parseTransactionIntent', () => {
    test('should parse "send X SOL to @user"', () => {
      const result = parseTransactionIntent('send 0.5 SOL to @alice');
      expect(result).not.toBeNull();
      expect(result.type).toBe('tip');
      expect(result.amount).toBe(0.5);
      expect(result.currency).toBe('SOL');
      expect(result.recipient).toBe('alice');
    });

    test('should parse "tip @user X"', () => {
      const result = parseTransactionIntent('tip @bob 1.5');
      expect(result).not.toBeNull();
      expect(result.amount).toBe(1.5);
      expect(result.recipient).toBe('bob');
    });

    test('should handle dollar amounts', () => {
      const result = parseTransactionIntent('send $5 to @charlie');
      expect(result).not.toBeNull();
      expect(result.amount).toBe(5);
      expect(result.currency).toBe('USD');
    });

    test('should handle "give" keyword', () => {
      const result = parseTransactionIntent('give 2 dollars to @dave');
      expect(result).not.toBeNull();
      if (result) {
        expect(result.amount).toBe(2);
        expect(result.currency).toBe('USD');
      }
    });

    test('should return null for invalid amounts', () => {
      const result = parseTransactionIntent('send zero to @user');
      expect(result).toBeNull();
    });

    test('should return null without recipient', () => {
      const result = parseTransactionIntent('send 1 SOL');
      expect(result).toBeNull();
    });
  });

  describe('parseBalanceCheck', () => {
    test('should detect "what\'s my balance"', () => {
      const result = parseBalanceCheck('what\'s my balance?');
      expect(result).not.toBeNull();
      expect(result.type).toBe('balance_check');
    });

    test('should detect "check my wallet"', () => {
      const result = parseBalanceCheck('check my wallet');
      expect(result).not.toBeNull();
      expect(result.type).toBe('balance_check');
    });

    test('should detect "how much SOL"', () => {
      const result = parseBalanceCheck('how much SOL do I have?');
      expect(result).not.toBeNull();
    });

    test('should return null for non-balance queries', () => {
      const result = parseBalanceCheck('send money to someone');
      expect(result).toBeNull();
    });
  });

  describe('parseHistoryRequest', () => {
    test('should detect "show my transactions"', () => {
      const result = parseHistoryRequest('show my transactions');
      expect(result).not.toBeNull();
      expect(result.type).toBe('history');
    });

    test('should parse time period - today', () => {
      const result = parseHistoryRequest('show my transactions today');
      expect(result).not.toBeNull();
      expect(result.period).toBe('today');
    });

    test('should parse time period - this week', () => {
      const result = parseHistoryRequest('view logs for this week');
      expect(result).not.toBeNull();
      expect(result.period).toBe('this_week');
    });

    test('should default to recent period', () => {
      const result = parseHistoryRequest('show my transaction history');
      expect(result).not.toBeNull();
      expect(result.period).toBe('recent');
    });
  });

  describe('parseAirdropIntent', () => {
    test('should parse "airdrop X to everyone"', () => {
      const result = parseAirdropIntent('airdrop 0.1 to everyone');
      expect(result).not.toBeNull();
      expect(result.type).toBe('airdrop');
      expect(result.amount).toBe(0.1);
    });

    test('should parse "everyone gets X"', () => {
      const result = parseAirdropIntent('everyone gets 0.5 SOL');
      expect(result).not.toBeNull();
      expect(result.amount).toBe(0.5);
      expect(result.currency).toBe('SOL');
    });

    test('should handle dollar amounts', () => {
      const result = parseAirdropIntent('give everyone $2');
      expect(result).not.toBeNull();
      expect(result.amount).toBe(2);
      expect(result.currency).toBe('USD');
    });

    test('should return null for invalid amounts', () => {
      const result = parseAirdropIntent('airdrop nothing to everyone');
      expect(result).toBeNull();
    });
  });

  describe('parseHelpRequest', () => {
    test('should detect "help" keyword', () => {
      const result = parseHelpRequest('I need help with tipping');
      expect(result).not.toBeNull();
      expect(result.type).toBe('help');
    });

    test('should detect "how do I" questions', () => {
      const result = parseHelpRequest('how do I create a wallet?');
      expect(result).not.toBeNull();
      expect(result.type).toBe('help');
    });

    test('should detect "what is" questions', () => {
      const result = parseHelpRequest('what is an airdrop?');
      expect(result).not.toBeNull();
    });

    test('should return null for non-help messages', () => {
      const result = parseHelpRequest('hello there');
      expect(result).toBeNull();
    });
  });

  describe('processNaturalLanguage', () => {
    test('should return highest confidence intent', () => {
      const result = processNaturalLanguage('send 0.5 SOL to @user');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should handle tip messages', () => {
      const result = processNaturalLanguage('tip @friend 1 SOL');
      expect(result.type).toBe('tip');
    });

    test('should handle balance checks', () => {
      const result = processNaturalLanguage('what is my balance?');
      expect(result.type).toBe('balance_check');
    });

    test('should return unknown for unclear messages', () => {
      const result = processNaturalLanguage('random text here');
      expect(result.type).toBe('unknown');
    });

    test('should handle empty messages', () => {
      const result = processNaturalLanguage('');
      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe(0);
    });
  });

  describe('generateTransactionResponse', () => {
    test('should generate success response', () => {
      const result = {
        success: true,
        amount: 0.5,
        currency: 'SOL',
        recipient: 'user123',
        signature: 'abc123'
      };
      const response = generateTransactionResponse(result);
      expect(response).toContain('✅');
      expect(response).toContain('0.5');
      expect(response).toContain('SOL');
    });

    test('should generate failure response', () => {
      const result = {
        success: false,
        error: 'Insufficient balance'
      };
      const response = generateTransactionResponse(result);
      expect(response).toContain('❌');
      expect(response).toContain('failed');
    });
  });

  describe('generateBalanceResponse', () => {
    test('should format balance information', () => {
      const balance = {
        SOL: 1.5,
        USDC: 10.0,
        address: 'abc123xyz'
      };
      const response = generateBalanceResponse(balance);
      expect(response).toContain('💰');
      expect(response).toContain('1.5');
      expect(response).toContain('SOL');
      expect(response).toContain('abc123xyz');
    });

    test('should handle missing address', () => {
      const balance = {
        SOL: 0,
        USDC: 0
      };
      const response = generateBalanceResponse(balance);
      expect(response).toContain('Not registered');
    });
  });

  describe('formatPeriod', () => {
    test('should format known periods', () => {
      expect(formatPeriod('today')).toBe('Today');
      expect(formatPeriod('this_week')).toBe('This Week');
      expect(formatPeriod('this_month')).toBe('This Month');
    });

    test('should default to Recent for unknown periods', () => {
      expect(formatPeriod('invalid')).toBe('Recent');
    });
  });

  describe('isBotMentioned', () => {
    test('should detect bot mention', () => {
      const message = '<@123456789> help me';
      expect(isBotMentioned(message, '123456789')).toBe(true);
    });

    test('should detect bot mention with !', () => {
      const message = '<@!123456789> what is my balance';
      expect(isBotMentioned(message, '123456789')).toBe(true);
    });

    test('should return false for no mention', () => {
      const message = 'hello everyone';
      expect(isBotMentioned(message, '123456789')).toBe(false);
    });
  });
});
