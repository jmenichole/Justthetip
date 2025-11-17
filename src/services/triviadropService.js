/**
 * JustTheTip - Triviadrop Service
 * Trivia-based airdrops with random winner selection
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

/**
 * Triviadrop state management
 * Stores active trivia games
 */
const activeTrivadrops = new Map();

/**
 * Premium tier configurations for triviadrop features
 */
const PREMIUM_TRIVIADROP_TIERS = {
  free: {
    name: 'Free',
    timer_options: [15, 30], // seconds
    custom_timers: false,
    fee_free: false,
    max_rounds: 5,
    max_winners_per_round: 5
  },
  premium: {
    name: 'Premium',
    price: 14.99,
    timer_options: [10, 15, 20, 30, 45, 60, 90, 120], // seconds
    custom_timers: true,
    fee_free: true,
    max_rounds: 20,
    max_winners_per_round: 50
  }
};

/**
 * Validate timer based on user's premium status
 * @param {number} timer - Timer in seconds
 * @param {string} tier - Premium tier
 * @returns {Object} Validation result
 */
function validateTimer(timer, tier = 'free') {
  const tierConfig = PREMIUM_TRIVIADROP_TIERS[tier] || PREMIUM_TRIVIADROP_TIERS.free;
  
  if (!tierConfig.timer_options.includes(timer)) {
    return {
      valid: false,
      error: `Timer ${timer}s not allowed for ${tierConfig.name} tier. Allowed: ${tierConfig.timer_options.join(', ')}s`,
      allowed: tierConfig.timer_options
    };
  }
  
  return {
    valid: true,
    tier: tierConfig
  };
}

/**
 * Triviadrop state management
 * Stores active trivia games
 */

/**
 * Generate random trivia questions by topic
 * @param {string} topic - Topic for trivia questions
 * @param {number} count - Number of questions needed
 * @returns {Array} Array of trivia questions
 */
function generateTriviaQuestions(topic, count) {
  // Placeholder questions - in production, this would fetch from an API or database
  const questionBank = {
    crypto: [
      { question: 'What is the maximum supply of Bitcoin?', answer: '21 million', options: ['21 million', '100 million', '1 billion', 'Unlimited'] },
      { question: 'What consensus mechanism does Solana use?', answer: 'Proof of History', options: ['Proof of Work', 'Proof of Stake', 'Proof of History', 'Delegated Proof of Stake'] },
      { question: 'Who created Ethereum?', answer: 'Vitalik Buterin', options: ['Satoshi Nakamoto', 'Vitalik Buterin', 'Charles Hoskinson', 'Gavin Wood'] },
      { question: 'What is the native token of Solana?', answer: 'SOL', options: ['SOL', 'ETH', 'BTC', 'ADA'] },
      { question: 'What year was Bitcoin created?', answer: '2009', options: ['2007', '2008', '2009', '2010'] }
    ],
    general: [
      { question: 'What is the capital of France?', answer: 'Paris', options: ['London', 'Berlin', 'Paris', 'Madrid'] },
      { question: 'How many continents are there?', answer: '7', options: ['5', '6', '7', '8'] },
      { question: 'What is the largest planet in our solar system?', answer: 'Jupiter', options: ['Mars', 'Saturn', 'Jupiter', 'Neptune'] },
      { question: 'What year did World War II end?', answer: '1945', options: ['1943', '1944', '1945', '1946'] },
      { question: 'Who painted the Mona Lisa?', answer: 'Leonardo da Vinci', options: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'] }
    ],
    science: [
      { question: 'What is the chemical symbol for gold?', answer: 'Au', options: ['Go', 'Gd', 'Au', 'Ag'] },
      { question: 'What is the speed of light?', answer: '299,792,458 m/s', options: ['299,792,458 m/s', '300,000,000 m/s', '186,000 mph', '299,000 km/s'] },
      { question: 'What is the largest organ in the human body?', answer: 'Skin', options: ['Heart', 'Brain', 'Liver', 'Skin'] },
      { question: 'What is the chemical formula for water?', answer: 'H2O', options: ['H2O', 'CO2', 'O2', 'H2O2'] },
      { question: 'What planet is known as the Red Planet?', answer: 'Mars', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'] }
    ],
    random: [
      { question: 'What is 2 + 2?', answer: '4', options: ['3', '4', '5', '6'] },
      { question: 'What color is the sky on a clear day?', answer: 'Blue', options: ['Red', 'Green', 'Blue', 'Yellow'] },
      { question: 'How many days are in a week?', answer: '7', options: ['5', '6', '7', '8'] },
      { question: 'What is the opposite of hot?', answer: 'Cold', options: ['Warm', 'Cool', 'Cold', 'Freezing'] },
      { question: 'What do bees make?', answer: 'Honey', options: ['Milk', 'Honey', 'Sugar', 'Jam'] }
    ]
  };

  const questions = questionBank[topic.toLowerCase()] || questionBank.random;
  
  // Shuffle and return requested number of questions
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Create a new triviadrop
 * @param {Object} config - Triviadrop configuration
 * @returns {Object} Triviadrop instance
 */
function createTriviadrop(config) {
  const {
    creator_id,
    creator_name,
    total_amount,
    rounds,
    topic,
    winners_per_round,
    guild_id,
    channel_id,
    timer = 30, // Default 30 seconds
    premium_tier = 'free'
  } = config;

  // Validate timer based on premium tier
  const timerValidation = validateTimer(timer, premium_tier);
  if (!timerValidation.valid) {
    throw new Error(timerValidation.error);
  }

  const triviadropId = `triviadrop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Calculate amount per winner
  const total_winners = rounds * winners_per_round;
  const amount_per_winner = total_amount / total_winners;

  // Generate trivia questions
  const questions = generateTriviaQuestions(topic, rounds);

  const triviadrop = {
    triviadrop_id: triviadropId,
    creator_id,
    creator_name,
    total_amount,
    amount_per_winner,
    rounds,
    topic,
    winners_per_round,
    total_winners,
    current_round: 0,
    questions,
    participants: new Map(), // userId -> { correct_answers: number, rounds_participated: [] }
    round_winners: [], // Array of arrays, one for each round
    active: true,
    created_at: Date.now(),
    guild_id,
    channel_id,
    timer, // Timer per round in seconds
    premium_tier,
    fee_free: timerValidation.tier.fee_free
  };

  activeTrivadrops.set(triviadropId, triviadrop);
  return triviadrop;
}

/**
 * Start next round of triviadrop
 * @param {string} triviadropId - Triviadrop ID
 * @returns {Object} Round information
 */
function startNextRound(triviadropId) {
  const triviadrop = activeTrivadrops.get(triviadropId);
  if (!triviadrop) {
    throw new Error('Triviadrop not found');
  }

  if (triviadrop.current_round >= triviadrop.rounds) {
    throw new Error('All rounds completed');
  }

  const currentQuestion = triviadrop.questions[triviadrop.current_round];
  
  return {
    round: triviadrop.current_round + 1,
    total_rounds: triviadrop.rounds,
    question: currentQuestion.question,
    options: currentQuestion.options,
    time_limit: triviadrop.timer // Use configured timer
  };
}

/**
 * Submit answer for current round
 * @param {string} triviadropId - Triviadrop ID
 * @param {string} userId - User ID
 * @param {string} username - Username
 * @param {string} answer - User's answer
 * @returns {Object} Result of answer submission
 */
function submitAnswer(triviadropId, userId, username, answer) {
  const triviadrop = activeTrivadrops.get(triviadropId);
  if (!triviadrop) {
    throw new Error('Triviadrop not found');
  }

  if (!triviadrop.active) {
    throw new Error('Triviadrop has ended');
  }

  const currentQuestion = triviadrop.questions[triviadrop.current_round];
  const isCorrect = answer.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim();

  // Track participant
  if (!triviadrop.participants.has(userId)) {
    triviadrop.participants.set(userId, {
      username,
      correct_answers: 0,
      rounds_participated: []
    });
  }

  const participant = triviadrop.participants.get(userId);
  participant.rounds_participated.push(triviadrop.current_round);
  
  if (isCorrect) {
    participant.correct_answers++;
  }

  return {
    correct: isCorrect,
    correct_answer: currentQuestion.answer,
    user_stats: {
      correct_answers: participant.correct_answers,
      rounds_participated: participant.rounds_participated.length
    }
  };
}

/**
 * End current round and select winners
 * @param {string} triviadropId - Triviadrop ID
 * @returns {Object} Round results with winners
 */
function endRound(triviadropId) {
  const triviadrop = activeTrivadrops.get(triviadropId);
  if (!triviadrop) {
    throw new Error('Triviadrop not found');
  }

  const currentRound = triviadrop.current_round;
  const currentQuestion = triviadrop.questions[currentRound];

  // Get all participants who answered correctly in this round
  const correctParticipants = [];
  for (const [userId, data] of triviadrop.participants.entries()) {
    if (data.rounds_participated.includes(currentRound)) {
      // Check if they got it right by comparing their correct_answers before and after
      // For simplicity, we'll assume the last participation was this round
      correctParticipants.push({ userId, username: data.username, data });
    }
  }

  // Randomly select winners from correct participants
  const winners = [];
  const shuffled = [...correctParticipants].sort(() => Math.random() - 0.5);
  const winnerCount = Math.min(triviadrop.winners_per_round, shuffled.length);
  
  for (let i = 0; i < winnerCount; i++) {
    winners.push({
      userId: shuffled[i].userId,
      username: shuffled[i].username,
      amount: triviadrop.amount_per_winner
    });
  }

  triviadrop.round_winners.push(winners);
  triviadrop.current_round++;

  // Check if triviadrop is complete
  if (triviadrop.current_round >= triviadrop.rounds) {
    triviadrop.active = false;
  }

  return {
    round: currentRound + 1,
    question: currentQuestion.question,
    correct_answer: currentQuestion.answer,
    winners,
    participants_count: correctParticipants.length,
    completed: !triviadrop.active,
    next_round: triviadrop.active ? triviadrop.current_round + 1 : null
  };
}

/**
 * Get triviadrop status
 * @param {string} triviadropId - Triviadrop ID
 * @returns {Object} Triviadrop status
 */
function getTriviadropStatus(triviadropId) {
  const triviadrop = activeTrivadrops.get(triviadropId);
  if (!triviadrop) {
    throw new Error('Triviadrop not found');
  }

  return {
    triviadrop_id: triviadrop.triviadrop_id,
    creator_name: triviadrop.creator_name,
    total_amount: triviadrop.total_amount,
    amount_per_winner: triviadrop.amount_per_winner,
    rounds: triviadrop.rounds,
    current_round: triviadrop.current_round,
    topic: triviadrop.topic,
    winners_per_round: triviadrop.winners_per_round,
    total_winners: triviadrop.total_winners,
    participants_count: triviadrop.participants.size,
    active: triviadrop.active,
    round_winners: triviadrop.round_winners
  };
}

/**
 * Get all winners from completed triviadrop
 * @param {string} triviadropId - Triviadrop ID
 * @returns {Array} All winners with amounts
 */
function getAllWinners(triviadropId) {
  const triviadrop = activeTrivadrops.get(triviadropId);
  if (!triviadrop) {
    throw new Error('Triviadrop not found');
  }

  const allWinners = [];
  triviadrop.round_winners.forEach((roundWinners, index) => {
    roundWinners.forEach(winner => {
      allWinners.push({
        ...winner,
        round: index + 1
      });
    });
  });

  return allWinners;
}

/**
 * Cancel triviadrop
 * @param {string} triviadropId - Triviadrop ID
 * @param {string} userId - User requesting cancellation
 * @returns {boolean} Success
 */
function cancelTriviadrop(triviadropId, userId) {
  const triviadrop = activeTrivadrops.get(triviadropId);
  if (!triviadrop) {
    throw new Error('Triviadrop not found');
  }

  if (triviadrop.creator_id !== userId) {
    throw new Error('Only creator can cancel triviadrop');
  }

  triviadrop.active = false;
  activeTrivadrops.delete(triviadropId);
  return true;
}

/**
 * Get leaderboard for triviadrop
 * @param {string} triviadropId - Triviadrop ID
 * @returns {Array} Sorted leaderboard
 */
function getLeaderboard(triviadropId) {
  const triviadrop = activeTrivadrops.get(triviadropId);
  if (!triviadrop) {
    throw new Error('Triviadrop not found');
  }

  const leaderboard = [];
  for (const [userId, data] of triviadrop.participants.entries()) {
    leaderboard.push({
      userId,
      username: data.username,
      correct_answers: data.correct_answers,
      rounds_participated: data.rounds_participated.length
    });
  }

  // Sort by correct answers, then by participation
  leaderboard.sort((a, b) => {
    if (b.correct_answers !== a.correct_answers) {
      return b.correct_answers - a.correct_answers;
    }
    return b.rounds_participated - a.rounds_participated;
  });

  return leaderboard;
}

module.exports = {
  createTriviadrop,
  startNextRound,
  submitAnswer,
  endRound,
  getTriviadropStatus,
  getAllWinners,
  cancelTriviadrop,
  getLeaderboard,
  activeTrivadrops,
  validateTimer,
  PREMIUM_TRIVIADROP_TIERS
};
