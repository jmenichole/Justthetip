/**
 * JustTheTip - Airdrop Preferences Service
 * Save and reuse airdrop configurations after 5+ airdrops
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * SPDX-License-Identifier: MIT
 */

/**
 * Airdrop preference presets
 */
const DEFAULT_PRESETS = {
  quickDrop: {
    name: 'Quick Drop',
    description: 'Fast 30-second airdrop for active members',
    settings: {
      expires_in: '30s',
      require_server: true,
      qualifiers: [
        { type: 'activity', params: { min_messages: 5 } }
      ]
    }
  },
  communityReward: {
    name: 'Community Reward',
    description: 'Reward active contributors',
    settings: {
      expires_in: '2m',
      require_server: true,
      qualifiers: [
        { type: 'activity', params: { min_messages: 10 } },
        { type: 'tenure', params: { min_days: 7 } }
      ]
    }
  },
  generousTippers: {
    name: 'Generous Tippers',
    description: 'Reward users who tip others',
    settings: {
      expires_in: '1m',
      require_server: false,
      qualifiers: [
        { type: 'recent_tipper', params: { days: 7 } },
        { type: 'minimum_tipped', params: { min_amount: 0.5, days: 30 } }
      ]
    }
  }
};

/**
 * Airdrop statistics tracker
 */
const airdropStats = new Map(); // userId -> { count, total_amount, settings_history }

/**
 * Track airdrop creation
 * @param {string} userId - Creator's user ID
 * @param {Object} settings - Airdrop settings
 * @returns {Object} Updated stats
 */
function trackAirdropCreation(userId, settings) {
  let stats = airdropStats.get(userId);
  
  if (!stats) {
    stats = {
      count: 0,
      total_amount: 0,
      settings_history: [],
      favorite_settings: null,
      unlocked_presets: false
    };
  }
  
  stats.count++;
  stats.total_amount += settings.total_amount || 0;
  stats.settings_history.push({
    ...settings,
    timestamp: Date.now()
  });
  
  // Keep only last 10 for analysis
  if (stats.settings_history.length > 10) {
    stats.settings_history.shift();
  }
  
  // Unlock presets after 5 airdrops
  if (stats.count >= 5 && !stats.unlocked_presets) {
    stats.unlocked_presets = true;
    stats.favorite_settings = analyzeFavoriteSettings(stats.settings_history);
  }
  
  airdropStats.set(userId, stats);
  return stats;
}

/**
 * Analyze user's favorite settings from history
 * @param {Array} history - Settings history
 * @returns {Object} Most common settings
 */
function analyzeFavoriteSettings(history) {
  if (!history || history.length === 0) return null;
  
  // Count frequencies
  const timers = {};
  const amounts = [];
  let requireServerCount = 0;
  
  history.forEach(settings => {
    // Track timer preferences
    const timer = settings.expires_in || '30s';
    timers[timer] = (timers[timer] || 0) + 1;
    
    // Track amounts
    if (settings.amount_per_user) {
      amounts.push(settings.amount_per_user);
    }
    
    // Track server requirement
    if (settings.require_server) {
      requireServerCount++;
    }
  });
  
  // Find most common timer
  const favoriteTimer = Object.entries(timers)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  // Calculate average amount
  const avgAmount = amounts.length > 0
    ? amounts.reduce((a, b) => a + b, 0) / amounts.length
    : 5;
  
  // Determine if usually requires server
  const usuallyRequiresServer = requireServerCount > history.length / 2;
  
  return {
    expires_in: favoriteTimer,
    amount_per_user: Math.round(avgAmount * 100) / 100,
    require_server: usuallyRequiresServer,
    based_on: history.length
  };
}

/**
 * Get user's airdrop stats and preferences
 * @param {string} userId - User ID
 * @returns {Object} Stats and preferences
 */
function getUserAirdropPreferences(userId) {
  const stats = airdropStats.get(userId);
  
  if (!stats) {
    return {
      count: 0,
      unlocked: false,
      message: 'Create 5 airdrops to unlock saved preferences!'
    };
  }
  
  return {
    count: stats.count,
    total_amount: stats.total_amount,
    unlocked: stats.unlocked_presets,
    favorite_settings: stats.favorite_settings,
    presets: stats.unlocked_presets ? DEFAULT_PRESETS : null,
    message: stats.unlocked_presets
      ? 'Preferences unlocked! You can now use quick presets.'
      : `${5 - stats.count} more airdrops to unlock preferences.`
  };
}

/**
 * Apply preset to airdrop settings
 * @param {string} presetName - Preset name
 * @param {Object} baseSettings - Base settings to merge with
 * @returns {Object} Merged settings
 */
function applyPreset(presetName, baseSettings = {}) {
  const preset = DEFAULT_PRESETS[presetName];
  if (!preset) return baseSettings;
  
  return {
    ...baseSettings,
    ...preset.settings
  };
}

/**
 * Save custom preset
 * @param {string} userId - User ID
 * @param {string} name - Preset name
 * @param {Object} settings - Settings to save
 * @returns {boolean} Success
 */
function saveCustomPreset(userId, name, settings) {
  const stats = airdropStats.get(userId);
  
  if (!stats || !stats.unlocked_presets) {
    return false;
  }
  
  if (!stats.custom_presets) {
    stats.custom_presets = {};
  }
  
  stats.custom_presets[name] = {
    name,
    description: 'Custom preset',
    settings,
    created_at: Date.now()
  };
  
  airdropStats.set(userId, stats);
  return true;
}

/**
 * Get all available presets for user
 * @param {string} userId - User ID
 * @returns {Object} Available presets
 */
function getAvailablePresets(userId) {
  const stats = airdropStats.get(userId);
  
  if (!stats || !stats.unlocked_presets) {
    return {};
  }
  
  return {
    ...DEFAULT_PRESETS,
    ...(stats.custom_presets || {})
  };
}

/**
 * Auto-qualification role system
 */
const AUTO_QUALIFY_ROLES = {
  verified_tipper: {
    name: 'Verified Tipper',
    description: 'Automatically qualifies for all airdrops',
    emoji: '✅',
    requirements: {
      min_tips_sent: 10,
      min_total_tipped: 5, // SOL
      account_age_days: 7
    },
    benefits: [
      'Auto-qualify for all airdrops',
      'Skip manual qualification checks',
      'Priority in airdrop distribution',
      'Special role badge in server'
    ],
    color: 0x10b981 // Green
  },
  generous_supporter: {
    name: 'Generous Supporter',
    description: 'Top tier - always qualifies',
    emoji: '💎',
    requirements: {
      min_tips_sent: 50,
      min_total_tipped: 25, // SOL
      account_age_days: 30
    },
    benefits: [
      'All Verified Tipper benefits',
      'Auto-qualify for premium airdrops',
      'Exclusive access to special drops',
      'Custom role color',
      'Featured in leaderboard'
    ],
    color: 0x9333ea // Purple
  },
  community_champion: {
    name: 'Community Champion',
    description: 'Server legends',
    emoji: '👑',
    requirements: {
      min_tips_sent: 100,
      min_total_tipped: 50, // SOL
      account_age_days: 90,
      min_airdrops_created: 5
    },
    benefits: [
      'All Generous Supporter benefits',
      'Create unlimited airdrops',
      'Access to all premium features (free)',
      'Custom vanity tag',
      'Bot contributor badge'
    ],
    color: 0xf59e0b // Gold
  }
};

/**
 * Check if user qualifies for auto-qualification role
 * @param {string} userId - User ID
 * @param {Object} database - Database instance
 * @returns {Promise<Object>} Qualification status
 */
async function checkAutoQualifyRole(userId, database) {
  try {
    // Get user stats
    const transactions = await database.getUserTransactions(userId, 200);
    const userWallet = await database.getUserWallet(userId);
    const airdropStats = getUserAirdropPreferences(userId);
    
    if (!userWallet) {
      return { qualified: false, role: null };
    }
    
    // Calculate stats
    const tipsSent = transactions.filter(tx => 
      (tx.sender_id === userId || tx.from_user_id === userId)
    );
    
    const totalTipped = tipsSent.reduce((sum, tx) => 
      sum + (parseFloat(tx.amount) || 0), 0
    );
    
    const accountAgeDays = (Date.now() - (userWallet.created_at || Date.now())) / (1000 * 60 * 60 * 24);
    
    // Check for highest qualifying role
    const userStats = {
      tips_sent: tipsSent.length,
      total_tipped: totalTipped,
      account_age_days: accountAgeDays,
      airdrops_created: airdropStats.count || 0
    };
    
    // Check Community Champion first (highest tier)
    if (checkRoleRequirements(userStats, AUTO_QUALIFY_ROLES.community_champion.requirements)) {
      return { 
        qualified: true, 
        role: 'community_champion',
        roleData: AUTO_QUALIFY_ROLES.community_champion
      };
    }
    
    // Check Generous Supporter
    if (checkRoleRequirements(userStats, AUTO_QUALIFY_ROLES.generous_supporter.requirements)) {
      return { 
        qualified: true, 
        role: 'generous_supporter',
        roleData: AUTO_QUALIFY_ROLES.generous_supporter
      };
    }
    
    // Check Verified Tipper
    if (checkRoleRequirements(userStats, AUTO_QUALIFY_ROLES.verified_tipper.requirements)) {
      return { 
        qualified: true, 
        role: 'verified_tipper',
        roleData: AUTO_QUALIFY_ROLES.verified_tipper
      };
    }
    
    return { qualified: false, role: null };
    
  } catch (error) {
    console.error('Error checking auto-qualify role:', error);
    return { qualified: false, role: null };
  }
}

/**
 * Check if user stats meet role requirements
 * @param {Object} userStats - User statistics
 * @param {Object} requirements - Role requirements
 * @returns {boolean} Meets requirements
 */
function checkRoleRequirements(userStats, requirements) {
  return (
    userStats.tips_sent >= (requirements.min_tips_sent || 0) &&
    userStats.total_tipped >= (requirements.min_total_tipped || 0) &&
    userStats.account_age_days >= (requirements.account_age_days || 0) &&
    userStats.airdrops_created >= (requirements.min_airdrops_created || 0)
  );
}

/**
 * Get progress toward next role
 * @param {string} userId - User ID
 * @param {Object} database - Database instance
 * @returns {Promise<Object>} Progress information
 */
async function getRoleProgress(userId, database) {
  const currentRole = await checkAutoQualifyRole(userId, database);
  
  // Get user stats for progress calculation
  const transactions = await database.getUserTransactions(userId, 200);
  const userWallet = await database.getUserWallet(userId);
  const airdropStats = getUserAirdropPreferences(userId);
  
  const tipsSent = transactions.filter(tx => 
    (tx.sender_id === userId || tx.from_user_id === userId)
  );
  
  const totalTipped = tipsSent.reduce((sum, tx) => 
    sum + (parseFloat(tx.amount) || 0), 0
  );
  
  const accountAgeDays = userWallet 
    ? (Date.now() - (userWallet.created_at || Date.now())) / (1000 * 60 * 60 * 24)
    : 0;
  
  const userStats = {
    tips_sent: tipsSent.length,
    total_tipped: totalTipped,
    account_age_days: accountAgeDays,
    airdrops_created: airdropStats.count || 0
  };
  
  // Determine next role
  let nextRole, nextRequirements;
  
  if (!currentRole.qualified) {
    nextRole = 'verified_tipper';
    nextRequirements = AUTO_QUALIFY_ROLES.verified_tipper.requirements;
  } else if (currentRole.role === 'verified_tipper') {
    nextRole = 'generous_supporter';
    nextRequirements = AUTO_QUALIFY_ROLES.generous_supporter.requirements;
  } else if (currentRole.role === 'generous_supporter') {
    nextRole = 'community_champion';
    nextRequirements = AUTO_QUALIFY_ROLES.community_champion.requirements;
  } else {
    return {
      current_role: currentRole.role,
      next_role: null,
      progress: 100,
      message: '👑 You\'ve reached the highest role!'
    };
  }
  
  // Calculate progress
  const progress = {
    tips_sent: {
      current: userStats.tips_sent,
      required: nextRequirements.min_tips_sent,
      percentage: Math.min(100, (userStats.tips_sent / nextRequirements.min_tips_sent) * 100)
    },
    total_tipped: {
      current: userStats.total_tipped.toFixed(2),
      required: nextRequirements.min_total_tipped,
      percentage: Math.min(100, (userStats.total_tipped / nextRequirements.min_total_tipped) * 100)
    },
    account_age: {
      current: Math.floor(userStats.account_age_days),
      required: nextRequirements.account_age_days,
      percentage: Math.min(100, (userStats.account_age_days / nextRequirements.account_age_days) * 100)
    }
  };
  
  if (nextRequirements.min_airdrops_created) {
    progress.airdrops_created = {
      current: userStats.airdrops_created,
      required: nextRequirements.min_airdrops_created,
      percentage: Math.min(100, (userStats.airdrops_created / nextRequirements.min_airdrops_created) * 100)
    };
  }
  
  return {
    current_role: currentRole.role || 'none',
    next_role: nextRole,
    progress,
    overall_progress: Object.values(progress).reduce((sum, p) => sum + p.percentage, 0) / Object.values(progress).length
  };
}

module.exports = {
  trackAirdropCreation,
  getUserAirdropPreferences,
  applyPreset,
  saveCustomPreset,
  getAvailablePresets,
  DEFAULT_PRESETS,
  AUTO_QUALIFY_ROLES,
  checkAutoQualifyRole,
  getRoleProgress
};
