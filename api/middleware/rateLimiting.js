const rateLimit = require('express-rate-limit');

// Wallet registration rate limiter to prevent abuse
const walletRegistrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many registration attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    walletRegistrationLimiter
};
