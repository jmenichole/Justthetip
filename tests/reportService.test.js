/**
 * JustTheTip - Report Service Tests
 * Test automated report generation
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const {
  calculateDateRange,
  filterTransactionsByDate,
  calculateTransactionStats,
  generateQuickSummary,
  scheduleAutomatedReport
} = require('../src/services/reportService');

describe('Report Service', () => {
  describe('calculateDateRange', () => {
    test('should calculate today range', () => {
      const range = calculateDateRange('today');
      expect(range).toHaveProperty('start');
      expect(range).toHaveProperty('end');
      expect(range.start).toBeLessThanOrEqual(range.end);
    });

    test('should calculate this week range', () => {
      const range = calculateDateRange('this_week');
      const daysDiff = (range.end - range.start) / (24 * 60 * 60);
      expect(daysDiff).toBeGreaterThanOrEqual(0);
      expect(daysDiff).toBeLessThanOrEqual(7);
    });

    test('should calculate this month range', () => {
      const range = calculateDateRange('this_month');
      expect(range.start).toBeLessThanOrEqual(range.end);
    });

    test('should default to recent (7 days)', () => {
      const range = calculateDateRange('invalid');
      const daysDiff = (range.end - range.start) / (24 * 60 * 60);
      expect(daysDiff).toBeCloseTo(7, 0);
    });
  });

  describe('filterTransactionsByDate', () => {
    const mockTransactions = [
      { timestamp: Math.floor(Date.now() / 1000) - 3600, amount: 1 }, // 1 hour ago
      { timestamp: Math.floor(Date.now() / 1000) - 86400, amount: 2 }, // 1 day ago
      { timestamp: Math.floor(Date.now() / 1000) - 604800, amount: 3 }, // 7 days ago
      { timestamp: Math.floor(Date.now() / 1000) - 2592000, amount: 4 } // 30 days ago
    ];

    test('should filter transactions within range', () => {
      const range = {
        start: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        end: Math.floor(Date.now() / 1000)
      };
      const filtered = filterTransactionsByDate(mockTransactions, range);
      expect(filtered.length).toBe(1);
      expect(filtered[0].amount).toBe(1);
    });

    test('should handle empty transaction list', () => {
      const range = calculateDateRange('today');
      const filtered = filterTransactionsByDate([], range);
      expect(filtered).toEqual([]);
    });

    test('should use created_at if timestamp missing', () => {
      const txs = [
        { created_at: Math.floor(Date.now() / 1000) - 3600, amount: 1 }
      ];
      const range = {
        start: Math.floor(Date.now() / 1000) - 7200,
        end: Math.floor(Date.now() / 1000)
      };
      const filtered = filterTransactionsByDate(txs, range);
      expect(filtered.length).toBe(1);
    });
  });

  describe('calculateTransactionStats', () => {
    const userId = 'user123';
    const mockTransactions = [
      {
        sender_id: userId,
        recipient_id: 'user456',
        amount: '1.5',
        timestamp: Math.floor(Date.now() / 1000)
      },
      {
        sender_id: 'user789',
        recipient_id: userId,
        amount: '2.0',
        timestamp: Math.floor(Date.now() / 1000)
      },
      {
        sender_id: userId,
        recipient_id: 'user456',
        amount: '0.5',
        timestamp: Math.floor(Date.now() / 1000)
      }
    ];

    test('should calculate basic stats', () => {
      const stats = calculateTransactionStats(mockTransactions, userId);
      expect(stats.total).toBe(3);
      expect(stats.sent).toBe(2);
      expect(stats.received).toBe(1);
    });

    test('should calculate totals', () => {
      const stats = calculateTransactionStats(mockTransactions, userId);
      expect(stats.totalSent).toBe(2.0);
      expect(stats.totalReceived).toBe(2.0);
    });

    test('should identify largest tip', () => {
      const stats = calculateTransactionStats(mockTransactions, userId);
      expect(stats.largestTip.amount).toBe(2.0);
    });

    test('should identify most tipped user', () => {
      const stats = calculateTransactionStats(mockTransactions, userId);
      expect(stats.topTipped).toBeDefined();
      expect(stats.topTipped.userId).toBe('user456');
      expect(stats.topTipped.amount).toBe(2.0);
    });

    test('should handle empty transaction list', () => {
      const stats = calculateTransactionStats([], userId);
      expect(stats.total).toBe(0);
      expect(stats.sent).toBe(0);
      expect(stats.received).toBe(0);
    });

    test('should handle alternative field names', () => {
      const altTransactions = [
        {
          from_user_id: userId,
          to_user_id: 'user456',
          amount: '1.0',
          timestamp: Math.floor(Date.now() / 1000)
        }
      ];
      const stats = calculateTransactionStats(altTransactions, userId);
      expect(stats.sent).toBe(1);
      expect(stats.totalSent).toBe(1.0);
    });
  });

  describe('generateQuickSummary', () => {
    const userId = 'user123';
    const mockTransactions = [
      {
        sender_id: userId,
        recipient_id: 'user456',
        amount: '1.5',
        timestamp: Math.floor(Date.now() / 1000)
      },
      {
        sender_id: 'user789',
        recipient_id: userId,
        amount: '2.0',
        timestamp: Math.floor(Date.now() / 1000)
      }
    ];

    test('should generate text summary', () => {
      const summary = generateQuickSummary(mockTransactions, userId);
      expect(typeof summary).toBe('string');
      expect(summary).toContain('Recent Transactions');
      expect(summary).toContain('SOL');
    });

    test('should handle empty transactions', () => {
      const summary = generateQuickSummary([], userId);
      expect(summary).toContain('No recent transactions');
    });

    test('should limit to 10 transactions', () => {
      const manyTxs = Array(20).fill(null).map((_, i) => ({
        sender_id: userId,
        recipient_id: `user${i}`,
        amount: '1.0',
        timestamp: Math.floor(Date.now() / 1000)
      }));
      const summary = generateQuickSummary(manyTxs, userId);
      // Should only show 10 transactions
      const lines = summary.split('\n').filter(line => line.match(/^\d+\./));
      expect(lines.length).toBeLessThanOrEqual(10);
    });

    test('should show direction of transaction', () => {
      const summary = generateQuickSummary(mockTransactions, userId);
      expect(summary).toMatch(/→|←/); // Should have direction arrows
    });
  });

  describe('scheduleAutomatedReport', () => {
    test('should schedule daily report', () => {
      const callback = jest.fn();
      const schedule = scheduleAutomatedReport(callback, 'daily');
      expect(schedule.schedule).toBe('daily');
      expect(schedule.interval).toBe(24 * 60 * 60 * 1000);
      expect(schedule.nextRun).toBeGreaterThan(Date.now());
    });

    test('should schedule weekly report', () => {
      const callback = jest.fn();
      const schedule = scheduleAutomatedReport(callback, 'weekly');
      expect(schedule.schedule).toBe('weekly');
      expect(schedule.interval).toBe(7 * 24 * 60 * 60 * 1000);
    });

    test('should schedule monthly report', () => {
      const callback = jest.fn();
      const schedule = scheduleAutomatedReport(callback, 'monthly');
      expect(schedule.schedule).toBe('monthly');
      expect(schedule.interval).toBe(30 * 24 * 60 * 60 * 1000);
    });

    test('should default to weekly', () => {
      const callback = jest.fn();
      const schedule = scheduleAutomatedReport(callback, 'invalid');
      expect(schedule.interval).toBe(7 * 24 * 60 * 60 * 1000);
    });

    test('should include success message', () => {
      const callback = jest.fn();
      const schedule = scheduleAutomatedReport(callback, 'daily');
      expect(schedule.message).toContain('scheduled successfully');
    });
  });
});
