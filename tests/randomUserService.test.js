/**
 * JustTheTip - Random User Service Tests
 * Test random user selection for tips and airdrops
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const {
  parseRandomTipCommand,
  selectRandomUsers
} = require('../src/services/randomUserService');

describe('Random User Service', () => {
  describe('parseRandomTipCommand', () => {
    test('should parse "tip X active" command', () => {
      const result = parseRandomTipCommand('tip 5 active 0.5');
      expect(result).not.toBeNull();
      expect(result.type).toBe('random_tip');
      expect(result.count).toBe(5);
      expect(result.criterion).toBe('active');
      expect(result.amount).toBe(0.5);
      expect(result.isLastMessages).toBe(false);
    });

    test('should parse "tip X lucky" command', () => {
      const result = parseRandomTipCommand('tip 3 lucky 1.0');
      expect(result).not.toBeNull();
      expect(result.count).toBe(3);
      expect(result.criterion).toBe('lucky');
      expect(result.amount).toBe(1.0);
    });

    test('should parse "tip X last Y messages" command', () => {
      const result = parseRandomTipCommand('tip 2 last 50 messages 0.25');
      expect(result).not.toBeNull();
      expect(result.count).toBe(2);
      expect(result.criterion).toBe('last_messages');
      expect(result.messageCount).toBe(50);
      expect(result.amount).toBe(0.25);
      expect(result.isLastMessages).toBe(true);
    });

    test('should parse fun criterions (gay, poor, rich, etc)', () => {
      const criterions = ['gay', 'poor', 'rich', 'smart', 'dumb', 'cool'];
      
      criterions.forEach(criterion => {
        const result = parseRandomTipCommand(`tip 1 ${criterion} 0.1`);
        expect(result).not.toBeNull();
        expect(result.criterion).toBe(criterion);
      });
    });

    test('should return null for invalid command', () => {
      const result = parseRandomTipCommand('invalid command');
      expect(result).toBeNull();
    });

    test('should handle case insensitivity', () => {
      const result = parseRandomTipCommand('TIP 5 ACTIVE 0.5');
      expect(result).not.toBeNull();
      expect(result.criterion).toBe('active');
    });
  });

  describe('selectRandomUsers', () => {
    // Mock channel and guild
    const mockChannel = {
      messages: {
        fetch: jest.fn().mockResolvedValue(new Map([
          ['msg1', { author: { id: 'user1', username: 'User1', bot: false }, createdTimestamp: Date.now() }],
          ['msg2', { author: { id: 'user2', username: 'User2', bot: false }, createdTimestamp: Date.now() }],
          ['msg3', { author: { id: 'user3', username: 'User3', bot: false }, createdTimestamp: Date.now() }]
        ]))
      }
    };

    const mockGuild = {
      members: {
        fetch: jest.fn().mockResolvedValue(),
        cache: new Map([
          ['user1', { user: { id: 'user1', username: 'User1', bot: false }, joinedTimestamp: Date.now() }],
          ['user2', { user: { id: 'user2', username: 'User2', bot: false }, joinedTimestamp: Date.now() }],
          ['user3', { user: { id: 'user3', username: 'User3', bot: false }, joinedTimestamp: Date.now() }]
        ])
      }
    };

    test('should select users for active criterion', async () => {
      const command = { count: 2, criterion: 'active', isLastMessages: false };
      const users = await selectRandomUsers(mockChannel, mockGuild, command);
      
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeLessThanOrEqual(2);
    });

    test('should select users for lucky criterion', async () => {
      const command = { count: 2, criterion: 'lucky', isLastMessages: false };
      const users = await selectRandomUsers(mockChannel, mockGuild, command);
      
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeLessThanOrEqual(2);
    });

    test('should select users from last messages', async () => {
      const command = { count: 2, criterion: 'last_messages', messageCount: 50, isLastMessages: true };
      const users = await selectRandomUsers(mockChannel, mockGuild, command);
      
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeLessThanOrEqual(2);
    });

    test('should not select more users than available', async () => {
      const command = { count: 100, criterion: 'lucky', isLastMessages: false };
      const users = await selectRandomUsers(mockChannel, mockGuild, command);
      
      expect(users.length).toBeLessThanOrEqual(3); // Only 3 mock users
    });
  });
});
