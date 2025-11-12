/**
 * Rate Limiting Middleware for Telegram Bot
 * Prevents abuse and spam
 * Author: 4eckd
 */

const logger = require('../../src/utils/logger');

// In-memory rate limiter (use Redis in production)
const rateLimitStore = new Map();

// Rate limit configuration
const RATE_LIMITS = {
  default: {
    windowMs: 60000, // 1 minute
    maxRequests: 10
  },
  tip: {
    windowMs: 60000, // 1 minute
    maxRequests: 5
  },
  register: {
    windowMs: 900000, // 15 minutes
    maxRequests: 3
  }
};

/**
 * Get rate limit key
 */
function getRateLimitKey(userId, command = 'default') {
  return `${userId}:${command}`;
}

/**
 * Check if user is rate limited
 */
function isRateLimited(userId, command = 'default') {
  const key = getRateLimitKey(userId, command);
  const limit = RATE_LIMITS[command] || RATE_LIMITS.default;

  const now = Date.now();
  const userRequests = rateLimitStore.get(key) || [];

  // Remove expired requests
  const validRequests = userRequests.filter(
    timestamp => now - timestamp < limit.windowMs
  );

  if (validRequests.length >= limit.maxRequests) {
    return true;
  }

  // Add current request
  validRequests.push(now);
  rateLimitStore.set(key, validRequests);

  return false;
}

/**
 * Rate limiting middleware
 */
async function rateLimitMiddleware(ctx, next) {
  const userId = ctx.from.id.toString();
  const command = ctx.message?.text?.split(' ')[0].replace('/', '');

  if (isRateLimited(userId, command)) {
    await ctx.reply(
      '⚠️ *Rate Limit Exceeded*\n\n' +
      'You are sending commands too quickly. Please wait a moment and try again.',
      { parse_mode: 'Markdown' }
    );

    logger.warn(`Rate limit exceeded for user ${userId}, command: ${command}`);
    return;
  }

  await next();
}

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  const maxWindowMs = Math.max(...Object.values(RATE_LIMITS).map(l => l.windowMs));

  for (const [key, timestamps] of rateLimitStore.entries()) {
    const validTimestamps = timestamps.filter(
      timestamp => now - timestamp < maxWindowMs
    );

    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validTimestamps);
    }
  }
}, 60000); // Clean every minute

module.exports = rateLimitMiddleware;
