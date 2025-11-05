/**
 * JustTheTip - Rate Limiter Utility
 * Centralized rate limiting to prevent abuse
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

class RateLimiter {
  constructor() {
    this.limits = {};
  }

  /**
   * Check if a user is rate limited for a command
   * @param {string} userId - Discord user ID
   * @param {string} command - Command name
   * @param {number} max - Maximum requests in time window (default: 5)
   * @param {number} windowMs - Time window in milliseconds (default: 60000 = 1 minute)
   * @returns {boolean} True if user is rate limited
   */
  isRateLimited(userId, command, max = 5, windowMs = 60000) {
    const now = Date.now();
    const key = `${userId}:${command}`;
    
    if (!this.limits[key] || now - this.limits[key].timestamp > windowMs) {
      this.limits[key] = { count: 1, timestamp: now };
      return false;
    }
    
    if (this.limits[key].count >= max) {
      return true;
    }
    
    this.limits[key].count++;
    return false;
  }

  /**
   * Reset rate limit for a user/command
   * @param {string} userId - Discord user ID
   * @param {string} command - Command name
   */
  reset(userId, command) {
    const key = `${userId}:${command}`;
    delete this.limits[key];
  }

  /**
   * Clear all rate limits (useful for testing)
   */
  clearAll() {
    this.limits = {};
  }

  /**
   * Clean up expired entries to prevent memory leaks
   * Call this periodically (e.g., every hour)
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    for (const [key, value] of Object.entries(this.limits)) {
      if (now - value.timestamp > maxAge) {
        delete this.limits[key];
      }
    }
  }
}

// Export singleton instance
module.exports = new RateLimiter();
