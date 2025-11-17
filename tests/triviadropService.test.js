/**
 * JustTheTip - Triviadrop Service Tests
 * Test trivia-based airdrops
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

const {
  createTriviadrop,
  startNextRound,
  submitAnswer,
  endRound,
  getTriviadropStatus,
  getAllWinners,
  getLeaderboard
} = require('../src/services/triviadropService');

describe('Triviadrop Service', () => {
  let triviadrop;

  beforeEach(() => {
    // Create a test triviadrop
    triviadrop = createTriviadrop({
      creator_id: 'creator123',
      creator_name: 'TestCreator',
      total_amount: 10,
      rounds: 3,
      topic: 'crypto',
      winners_per_round: 2,
      guild_id: 'guild123',
      channel_id: 'channel123'
    });
  });

  describe('createTriviadrop', () => {
    test('should create triviadrop with correct configuration', () => {
      expect(triviadrop).toBeDefined();
      expect(triviadrop.creator_id).toBe('creator123');
      expect(triviadrop.total_amount).toBe(10);
      expect(triviadrop.rounds).toBe(3);
      expect(triviadrop.winners_per_round).toBe(2);
      expect(triviadrop.total_winners).toBe(6);
      expect(triviadrop.amount_per_winner).toBe(10 / 6);
    });

    test('should generate correct number of questions', () => {
      expect(triviadrop.questions.length).toBeGreaterThanOrEqual(3);
    });

    test('should initialize with round 0', () => {
      expect(triviadrop.current_round).toBe(0);
      expect(triviadrop.active).toBe(true);
    });
  });

  describe('startNextRound', () => {
    test('should start first round', () => {
      const roundInfo = startNextRound(triviadrop.triviadrop_id);
      expect(roundInfo.round).toBe(1);
      expect(roundInfo.total_rounds).toBe(3);
      expect(roundInfo.question).toBeDefined();
      expect(roundInfo.options).toHaveLength(4);
    });

    test('should throw error if triviadrop not found', () => {
      expect(() => startNextRound('invalid_id')).toThrow('Triviadrop not found');
    });
  });

  describe('submitAnswer', () => {
    beforeEach(() => {
      startNextRound(triviadrop.triviadrop_id);
    });

    test('should submit correct answer', () => {
      const currentQuestion = triviadrop.questions[0];
      const result = submitAnswer(
        triviadrop.triviadrop_id,
        'user123',
        'TestUser',
        currentQuestion.answer
      );

      expect(result.correct).toBe(true);
      expect(result.correct_answer).toBe(currentQuestion.answer);
    });

    test('should submit incorrect answer', () => {
      const result = submitAnswer(
        triviadrop.triviadrop_id,
        'user456',
        'WrongUser',
        'Wrong Answer'
      );

      expect(result.correct).toBe(false);
    });

    test('should track participant stats', () => {
      const currentQuestion = triviadrop.questions[0];
      submitAnswer(triviadrop.triviadrop_id, 'user123', 'TestUser', currentQuestion.answer);
      
      const participant = triviadrop.participants.get('user123');
      expect(participant.correct_answers).toBe(1);
      expect(participant.rounds_participated).toHaveLength(1);
    });
  });

  describe('endRound', () => {
    beforeEach(() => {
      startNextRound(triviadrop.triviadrop_id);
      const currentQuestion = triviadrop.questions[0];
      // Submit correct answers for 3 users
      submitAnswer(triviadrop.triviadrop_id, 'user1', 'User1', currentQuestion.answer);
      submitAnswer(triviadrop.triviadrop_id, 'user2', 'User2', currentQuestion.answer);
      submitAnswer(triviadrop.triviadrop_id, 'user3', 'User3', currentQuestion.answer);
    });

    test('should end round and select winners', () => {
      const results = endRound(triviadrop.triviadrop_id);
      
      expect(results.round).toBe(1);
      expect(results.winners.length).toBeLessThanOrEqual(2);
      expect(results.completed).toBe(false);
    });

    test('should increment current round', () => {
      const before = triviadrop.current_round;
      endRound(triviadrop.triviadrop_id);
      expect(triviadrop.current_round).toBe(before + 1);
    });

    test('should mark as completed after all rounds', () => {
      // Complete all 3 rounds
      endRound(triviadrop.triviadrop_id);
      startNextRound(triviadrop.triviadrop_id);
      endRound(triviadrop.triviadrop_id);
      startNextRound(triviadrop.triviadrop_id);
      const results = endRound(triviadrop.triviadrop_id);
      
      expect(results.completed).toBe(true);
      expect(triviadrop.active).toBe(false);
    });
  });

  describe('getTriviadropStatus', () => {
    test('should return current status', () => {
      const status = getTriviadropStatus(triviadrop.triviadrop_id);
      
      expect(status.triviadrop_id).toBe(triviadrop.triviadrop_id);
      expect(status.total_amount).toBe(10);
      expect(status.rounds).toBe(3);
      expect(status.current_round).toBe(0);
      expect(status.active).toBe(true);
    });
  });

  describe('getAllWinners', () => {
    test('should return all winners from completed rounds', () => {
      startNextRound(triviadrop.triviadrop_id);
      const currentQuestion = triviadrop.questions[0];
      submitAnswer(triviadrop.triviadrop_id, 'user1', 'User1', currentQuestion.answer);
      endRound(triviadrop.triviadrop_id);
      
      const winners = getAllWinners(triviadrop.triviadrop_id);
      expect(Array.isArray(winners)).toBe(true);
    });
  });

  describe('getLeaderboard', () => {
    test('should return sorted leaderboard', () => {
      startNextRound(triviadrop.triviadrop_id);
      const currentQuestion = triviadrop.questions[0];
      
      submitAnswer(triviadrop.triviadrop_id, 'user1', 'User1', currentQuestion.answer);
      submitAnswer(triviadrop.triviadrop_id, 'user2', 'User2', 'wrong');
      
      const leaderboard = getLeaderboard(triviadrop.triviadrop_id);
      
      expect(leaderboard.length).toBe(2);
      expect(leaderboard[0].correct_answers).toBeGreaterThanOrEqual(leaderboard[1].correct_answers);
    });
  });
});
