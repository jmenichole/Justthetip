/**
 * JustTheTip - Airdrop Qualifier Gatekeeper
 * Premium monetized feature for controlled airdrop distribution
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

/**
 * Airdrop qualifiers storage
 * Maps airdrop_id to qualifier configuration
 */
const airdropQualifiers = new Map();

/**
 * Premium tier pricing (monthly subscription)
 */
const PREMIUM_TIERS = {
  basic: {
    name: 'Basic',
    price: 9.99,
    max_airdrops_per_month: 10,
    max_recipients_per_airdrop: 50,
    qualifiers: ['role', 'activity', 'random']
  },
  pro: {
    name: 'Pro',
    price: 29.99,
    max_airdrops_per_month: 50,
    max_recipients_per_airdrop: 200,
    qualifiers: ['role', 'activity', 'random', 'wallet_balance', 'tenure', 'recent_tipper', 'most_generous', 'minimum_tipped']
  },
  enterprise: {
    name: 'Enterprise',
    price: 99.99,
    max_airdrops_per_month: 999,
    max_recipients_per_airdrop: 1000,
    qualifiers: ['all']
  }
};

/**
 * Create airdrop with qualifiers
 * @param {Object} config - Airdrop configuration
 * @returns {Object} Airdrop with qualifier config
 */
function createQualifiedAirdrop(config) {
  const {
    airdrop_id,
    creator_id,
    total_amount,
    qualifiers = [],
    auto_distribute = true,
    premium_tier = null
  } = config;

  const qualifierConfig = {
    airdrop_id,
    creator_id,
    total_amount,
    qualifiers,
    auto_distribute,
    premium_tier,
    qualified_users: new Set(),
    pending_distribution: new Map(), // userId -> amount
    distributed: new Map(), // userId -> { amount, timestamp }
    created_at: Date.now()
  };

  airdropQualifiers.set(airdrop_id, qualifierConfig);
  return qualifierConfig;
}

/**
 * Check if user qualifies based on role
 * @param {GuildMember} member - Guild member
 * @param {Array} requiredRoles - Required role IDs
 * @returns {boolean} True if user has any required role
 */
function checkRoleQualifier(member, requiredRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.some(roleId => member.roles.cache.has(roleId));
}

/**
 * Check if user qualifies based on activity
 * @param {string} userId - User ID
 * @param {Array} recentMessages - Recent channel messages
 * @param {number} minMessages - Minimum message count
 * @returns {boolean} True if user is active enough
 */
function checkActivityQualifier(userId, recentMessages, minMessages = 5) {
  const userMessages = recentMessages.filter(m => m.author.id === userId);
  return userMessages.length >= minMessages;
}

/**
 * Check if user qualifies based on tenure
 * @param {GuildMember} member - Guild member
 * @param {number} minDays - Minimum days in server
 * @returns {boolean} True if user has been member long enough
 */
function checkTenureQualifier(member, minDays = 7) {
  if (!member.joinedTimestamp) return false;
  const daysSinceJoin = (Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24);
  return daysSinceJoin >= minDays;
}

/**
 * Check if user qualifies based on wallet balance
 * @param {string} userId - User ID
 * @param {Object} database - Database instance
 * @param {number} minBalance - Minimum balance (0 for any wallet)
 * @returns {Promise<boolean>} True if user has wallet with sufficient balance
 */
async function checkWalletQualifier(userId, database, minBalance = 0) {
  try {
    const wallet = await database.getUserWallet(userId);
    if (!wallet) return false;
    
    if (minBalance > 0) {
      const balance = await database.getBalances(userId);
      return (balance.SOL || 0) >= minBalance;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user has tipped in the last X days
 * @param {string} userId - User ID
 * @param {Object} database - Database instance
 * @param {number} days - Number of days to look back
 * @returns {Promise<boolean>} True if user has tipped recently
 */
async function checkRecentTipperQualifier(userId, database, days = 7) {
  try {
    const transactions = await database.getUserTransactions(userId, 100);
    if (!transactions || transactions.length === 0) return false;
    
    const cutoffTime = Date.now() / 1000 - (days * 24 * 60 * 60);
    
    // Check if user has sent any tips in the time period
    const recentTips = transactions.filter(tx => {
      const isSender = tx.sender_id === userId || tx.from_user_id === userId;
      const timestamp = tx.timestamp || tx.created_at || 0;
      return isSender && timestamp >= cutoffTime;
    });
    
    return recentTips.length > 0;
  } catch (error) {
    console.error('Error checking recent tipper:', error);
    return false;
  }
}

/**
 * Check if user is most generous this week
 * @param {string} userId - User ID
 * @param {Object} database - Database instance
 * @param {number} topN - Top N most generous users (default 10)
 * @returns {Promise<boolean>} True if user is in top generous tippers
 */
async function checkMostGenerousQualifier(userId, database, topN = 10) {
  try {
    const transactions = await database.getUserTransactions(userId, 100);
    if (!transactions || transactions.length === 0) return false;
    
    // Get transactions from this week
    const weekStart = Date.now() / 1000 - (7 * 24 * 60 * 60);
    
    // Calculate total tipped by this user this week
    let userTotal = 0;
    transactions.forEach(tx => {
      const isSender = tx.sender_id === userId || tx.from_user_id === userId;
      const timestamp = tx.timestamp || tx.created_at || 0;
      if (isSender && timestamp >= weekStart) {
        userTotal += parseFloat(tx.amount) || 0;
      }
    });
    
    if (userTotal === 0) return false;
    
    // TODO: In production, compare with other users' totals
    // For now, return true if user has tipped at least 1 SOL this week
    return userTotal >= 1.0;
  } catch (error) {
    console.error('Error checking most generous:', error);
    return false;
  }
}

/**
 * Check if user has tipped a minimum amount in period
 * @param {string} userId - User ID
 * @param {Object} database - Database instance
 * @param {number} minAmount - Minimum amount tipped
 * @param {number} days - Days to look back
 * @returns {Promise<boolean>} True if user meets minimum
 */
async function checkMinimumTippedQualifier(userId, database, minAmount = 0.1, days = 30) {
  try {
    const transactions = await database.getUserTransactions(userId, 100);
    if (!transactions || transactions.length === 0) return false;
    
    const cutoffTime = Date.now() / 1000 - (days * 24 * 60 * 60);
    
    let totalTipped = 0;
    transactions.forEach(tx => {
      const isSender = tx.sender_id === userId || tx.from_user_id === userId;
      const timestamp = tx.timestamp || tx.created_at || 0;
      if (isSender && timestamp >= cutoffTime) {
        totalTipped += parseFloat(tx.amount) || 0;
      }
    });
    
    return totalTipped >= minAmount;
  } catch (error) {
    console.error('Error checking minimum tipped:', error);
    return false;
  }
}

/**
 * Qualify users for airdrop
 * @param {string} airdropId - Airdrop ID
 * @param {Array} users - Array of users to check
 * @param {Object} context - Context with guild, channel, database
 * @returns {Promise<Array>} Qualified user IDs
 */
async function qualifyUsers(airdropId, users, context) {
  const config = airdropQualifiers.get(airdropId);
  if (!config) {
    throw new Error('Airdrop qualifier not found');
  }

  const qualifiedUsers = [];
  const { guild, channel, database } = context;

  for (const user of users) {
    let qualified = true;

    // Check each qualifier
    for (const qualifier of config.qualifiers) {
      const { type, params = {} } = qualifier;

      try {
        const member = await guild.members.fetch(user.id);

        switch (type) {
          case 'role':
            if (!checkRoleQualifier(member, params.required_roles)) {
              qualified = false;
            }
            break;

          case 'activity': {
            const messages = await channel.messages.fetch({ limit: 100 });
            if (!checkActivityQualifier(user.id, Array.from(messages.values()), params.min_messages || 5)) {
              qualified = false;
            }
            break;
          }

          case 'tenure':
            if (!checkTenureQualifier(member, params.min_days || 7)) {
              qualified = false;
            }
            break;

          case 'wallet_balance':
            if (!await checkWalletQualifier(user.id, database, params.min_balance || 0)) {
              qualified = false;
            }
            break;

          case 'recent_tipper':
            if (!await checkRecentTipperQualifier(user.id, database, params.days || 7)) {
              qualified = false;
            }
            break;

          case 'most_generous':
            if (!await checkMostGenerousQualifier(user.id, database, params.top_n || 10)) {
              qualified = false;
            }
            break;

          case 'minimum_tipped':
            if (!await checkMinimumTippedQualifier(user.id, database, params.min_amount || 0.1, params.days || 30)) {
              qualified = false;
            }
            break;

          case 'random':
            // Random qualifier - use probability
            if (Math.random() > (params.probability || 0.5)) {
              qualified = false;
            }
            break;

          default:
            // Unknown qualifier - skip
            break;
        }

        if (!qualified) break;
      } catch (error) {
        console.error(`Error qualifying user ${user.id}:`, error);
        qualified = false;
        break;
      }
    }

    if (qualified) {
      qualifiedUsers.push(user);
      config.qualified_users.add(user.id);
    }
  }

  return qualifiedUsers;
}

/**
 * Auto-distribute airdrop to qualified users
 * @param {string} airdropId - Airdrop ID
 * @param {Array} qualifiedUsers - Qualified users
 * @param {Object} database - Database instance
 * @returns {Promise<Object>} Distribution results
 */
async function autoDistributeAirdrop(airdropId, qualifiedUsers, database) {
  const config = airdropQualifiers.get(airdropId);
  if (!config) {
    throw new Error('Airdrop qualifier not found');
  }

  if (!config.auto_distribute) {
    throw new Error('Auto-distribution not enabled for this airdrop');
  }

  const amountPerUser = config.total_amount / qualifiedUsers.length;
  const results = {
    total_distributed: 0,
    successful: [],
    failed: []
  };

  for (const user of qualifiedUsers) {
    try {
      // Credit user's balance
      await database.creditBalance(user.id, amountPerUser, 'SOL');
      
      config.distributed.set(user.id, {
        amount: amountPerUser,
        timestamp: Date.now()
      });

      results.successful.push({
        userId: user.id,
        username: user.username,
        amount: amountPerUser
      });
      results.total_distributed += amountPerUser;
    } catch (error) {
      console.error(`Error distributing to ${user.id}:`, error);
      results.failed.push({
        userId: user.id,
        username: user.username,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Get airdrop qualifier status
 * @param {string} airdropId - Airdrop ID
 * @returns {Object} Status information
 */
function getQualifierStatus(airdropId) {
  const config = airdropQualifiers.get(airdropId);
  if (!config) {
    throw new Error('Airdrop qualifier not found');
  }

  return {
    airdrop_id: config.airdrop_id,
    total_amount: config.total_amount,
    qualified_count: config.qualified_users.size,
    distributed_count: config.distributed.size,
    total_distributed: Array.from(config.distributed.values()).reduce((sum, d) => sum + d.amount, 0),
    auto_distribute: config.auto_distribute,
    premium_tier: config.premium_tier
  };
}

/**
 * Validate premium tier limits
 * @param {string} userId - User ID
 * @param {string} tier - Premium tier
 * @param {number} recipientCount - Number of recipients
 * @returns {Object} Validation result
 */
function validatePremiumLimits(userId, tier, recipientCount) {
  const tierConfig = PREMIUM_TIERS[tier];
  if (!tierConfig) {
    return {
      valid: false,
      error: 'Invalid premium tier'
    };
  }

  if (recipientCount > tierConfig.max_recipients_per_airdrop) {
    return {
      valid: false,
      error: `Recipient count exceeds tier limit (${tierConfig.max_recipients_per_airdrop})`
    };
  }

  return {
    valid: true,
    tier: tierConfig
  };
}

module.exports = {
  createQualifiedAirdrop,
  qualifyUsers,
  autoDistributeAirdrop,
  getQualifierStatus,
  validatePremiumLimits,
  PREMIUM_TIERS,
  airdropQualifiers
};
