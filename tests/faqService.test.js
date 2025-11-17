/**
 * JustTheTip - FAQ Service Tests
 * Test intelligent FAQ search and categorization
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const {
  searchFAQ,
  getAllCategories,
  getFAQsByCategory,
  getRandomTip,
  analyzeIntent
} = require('../src/services/faqService');

describe('FAQ Service', () => {
  describe('searchFAQ', () => {
    test('should find FAQs by keyword', () => {
      const results = searchFAQ('how to tip');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('question');
      expect(results[0]).toHaveProperty('answer');
      expect(results[0]).toHaveProperty('category');
    });

    test('should rank results by relevance', () => {
      const results = searchFAQ('tip someone');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0);
      // First result should have highest score
      if (results.length > 1) {
        expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      }
    });

    test('should handle wallet-related queries', () => {
      const results = searchFAQ('create wallet');
      expect(results.length).toBeGreaterThan(0);
      const hasWalletInfo = results.some(r => 
        r.answer.includes('wallet') || r.question.includes('wallet')
      );
      expect(hasWalletInfo).toBe(true);
    });

    test('should handle security queries', () => {
      const results = searchFAQ('is it safe');
      expect(results.length).toBeGreaterThan(0);
      const hasSecurityInfo = results.some(r => 
        r.answer.includes('security') || r.answer.includes('encryption')
      );
      expect(hasSecurityInfo).toBe(true);
    });

    test('should return empty array for nonsense queries', () => {
      const results = searchFAQ('asdfghjkl qwerty');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    test('should limit results to top 5', () => {
      const results = searchFAQ('how');
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getAllCategories', () => {
    test('should return all FAQ categories', () => {
      const categories = getAllCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty('key');
      expect(categories[0]).toHaveProperty('category');
      expect(categories[0]).toHaveProperty('questionCount');
    });

    test('should include Getting Started category', () => {
      const categories = getAllCategories();
      const hasGettingStarted = categories.some(c => 
        c.key === 'gettingStarted'
      );
      expect(hasGettingStarted).toBe(true);
    });
  });

  describe('getFAQsByCategory', () => {
    test('should return FAQs for valid category', () => {
      const category = getFAQsByCategory('gettingStarted');
      expect(category).not.toBeNull();
      expect(category).toHaveProperty('category');
      expect(category).toHaveProperty('questions');
      expect(Array.isArray(category.questions)).toBe(true);
    });

    test('should return null for invalid category', () => {
      const category = getFAQsByCategory('invalidCategory123');
      expect(category).toBeNull();
    });

    test('should include tipping category', () => {
      const category = getFAQsByCategory('tipping');
      expect(category).not.toBeNull();
      expect(category.questions.length).toBeGreaterThan(0);
    });
  });

  describe('getRandomTip', () => {
    test('should return a tip string', () => {
      const tip = getRandomTip();
      expect(typeof tip).toBe('string');
      expect(tip.length).toBeGreaterThan(0);
    });

    test('should return tip starting with emoji', () => {
      const tip = getRandomTip();
      expect(tip.startsWith('💡')).toBe(true);
    });
  });

  describe('analyzeIntent', () => {
    test('should detect FAQ intent', () => {
      const intent = analyzeIntent('how do I create a wallet?');
      expect(intent.type).toBe('faq');
      expect(intent.confidence).toBeGreaterThan(0.5);
    });

    test('should detect balance check intent', () => {
      const intent = analyzeIntent('what is my balance?');
      expect(intent.type).toBe('balance_check');
      expect(intent.confidence).toBeGreaterThan(0.5);
    });

    test('should detect transaction intent', () => {
      const intent = analyzeIntent('send 0.5 SOL to @user');
      expect(intent.type).toBe('transaction');
      expect(intent.confidence).toBeGreaterThan(0.5);
    });

    test('should detect report intent', () => {
      const intent = analyzeIntent('generate my weekly report');
      expect(intent.type).toBe('report');
      expect(intent.confidence).toBeGreaterThan(0.5);
    });

    test('should handle general queries', () => {
      const intent = analyzeIntent('hello bot');
      expect(intent).toHaveProperty('type');
      expect(intent).toHaveProperty('confidence');
    });
  });
});
