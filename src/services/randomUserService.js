/**
 * JustTheTip - Random User Selection Service
 * Select random users based on various criteria for tips and airdrops
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

/**
 * Get recent messages from channel
 * @param {Channel} channel - Discord channel
 * @param {number} limit - Number of messages to fetch
 * @returns {Promise<Array>} Array of messages
 */
async function getRecentMessages(channel, limit = 100) {
  try {
    const messages = await channel.messages.fetch({ limit });
    return Array.from(messages.values());
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

/**
 * Select random active users from recent messages
 * @param {Channel} channel - Discord channel
 * @param {number} count - Number of users to select
 * @param {number} messageLimit - Number of recent messages to check
 * @returns {Promise<Array>} Array of selected user objects
 */
async function selectActiveUsers(channel, count, messageLimit = 100) {
  const messages = await getRecentMessages(channel, messageLimit);
  
  // Get unique active users (exclude bots)
  const activeUsers = new Map();
  for (const msg of messages) {
    if (!msg.author.bot && !activeUsers.has(msg.author.id)) {
      activeUsers.set(msg.author.id, {
        id: msg.author.id,
        username: msg.author.username,
        tag: msg.author.tag,
        messageCount: 0,
        lastMessage: msg.createdTimestamp
      });
    }
    if (activeUsers.has(msg.author.id)) {
      activeUsers.get(msg.author.id).messageCount++;
    }
  }

  // Convert to array and shuffle
  const usersArray = Array.from(activeUsers.values());
  const shuffled = usersArray.sort(() => Math.random() - 0.5);
  
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Select lucky random users from server members
 * @param {Guild} guild - Discord guild
 * @param {number} count - Number of users to select
 * @returns {Promise<Array>} Array of selected user objects
 */
async function selectLuckyUsers(guild, count) {
  try {
    await guild.members.fetch();
    const members = Array.from(guild.members.cache.values());
    
    // Filter out bots
    const humanMembers = members.filter(m => !m.user.bot);
    
    // Shuffle and select
    const shuffled = humanMembers.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    
    return selected.map(m => ({
      id: m.user.id,
      username: m.user.username,
      tag: m.user.tag,
      joinedAt: m.joinedTimestamp
    }));
  } catch (error) {
    console.error('Error selecting lucky users:', error);
    return [];
  }
}

/**
 * Select users based on a fun criterion (random fun selection)
 * @param {Guild} guild - Discord guild
 * @param {number} count - Number of users to select
 * @param {string} criterion - Fun criterion (not actually evaluated, just for fun)
 * @returns {Promise<Array>} Array of selected user objects
 */
async function selectUsersByCriterion(guild, count, criterion) {
  // This is purely random - the "criterion" is just for fun/engagement
  return selectLuckyUsers(guild, count);
}

/**
 * Select users from last X messages
 * @param {Channel} channel - Discord channel
 * @param {number} count - Number of users to select
 * @param {number} messageCount - Number of recent messages to consider
 * @returns {Promise<Array>} Array of selected user objects
 */
async function selectFromLastMessages(channel, count, messageCount) {
  const messages = await getRecentMessages(channel, messageCount);
  
  // Get unique users from these messages
  const users = new Map();
  for (const msg of messages) {
    if (!msg.author.bot && !users.has(msg.author.id)) {
      users.set(msg.author.id, {
        id: msg.author.id,
        username: msg.author.username,
        tag: msg.author.tag,
        timestamp: msg.createdTimestamp
      });
    }
  }

  // Shuffle and select
  const usersArray = Array.from(users.values());
  const shuffled = usersArray.sort(() => Math.random() - 0.5);
  
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Parse random tip command
 * @param {string} message - Command message
 * @returns {Object|null} Parsed command or null
 */
function parseRandomTipCommand(message) {
  // Patterns: "tip X active", "tip X lucky", "tip X gay", "tip X poor", "tip X last Y messages"
  const patterns = [
    /tip\s+(\d+)\s+(active|lucky|gay|poor|rich|smart|dumb|cool|random)\s+(\d+\.?\d*)/i,
    /tip\s+(\d+)\s+last\s+(\d+)\s+messages?\s+(\d+\.?\d*)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      if (pattern === patterns[0]) {
        return {
          type: 'random_tip',
          count: parseInt(match[1]),
          criterion: match[2].toLowerCase(),
          amount: parseFloat(match[3]),
          isLastMessages: false
        };
      } else {
        return {
          type: 'random_tip',
          count: parseInt(match[1]),
          criterion: 'last_messages',
          messageCount: parseInt(match[2]),
          amount: parseFloat(match[3]),
          isLastMessages: true
        };
      }
    }
  }

  return null;
}

/**
 * Select random users based on command
 * @param {Channel} channel - Discord channel
 * @param {Guild} guild - Discord guild
 * @param {Object} command - Parsed command
 * @returns {Promise<Array>} Array of selected users
 */
async function selectRandomUsers(channel, guild, command) {
  if (command.isLastMessages) {
    return selectFromLastMessages(channel, command.count, command.messageCount);
  }

  switch (command.criterion) {
    case 'active':
      return selectActiveUsers(channel, command.count);
    case 'lucky':
    case 'gay':
    case 'poor':
    case 'rich':
    case 'smart':
    case 'dumb':
    case 'cool':
    case 'random':
      return selectUsersByCriterion(guild, command.count, command.criterion);
    default:
      return selectLuckyUsers(guild, command.count);
  }
}

module.exports = {
  selectActiveUsers,
  selectLuckyUsers,
  selectUsersByCriterion,
  selectFromLastMessages,
  parseRandomTipCommand,
  selectRandomUsers
};
