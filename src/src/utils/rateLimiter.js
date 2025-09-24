const { RateLimiterMemory } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
  points: 5, // Number of points
  duration: 60, // Per 60 seconds
  blockDuration: 60 // Block for 60 seconds if consumed more than points
});

module.exports = rateLimiter;
