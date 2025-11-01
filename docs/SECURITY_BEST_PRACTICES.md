# Security Best Practices & Rate Limiting

## Overview

This document outlines security best practices and rate limiting strategies for the JustTheTip Discord bot to prevent abuse and ensure safe operation.

## Table of Contents

- [Security Principles](#security-principles)
- [Rate Limiting](#rate-limiting)
- [Input Validation](#input-validation)
- [Sensitive Data Protection](#sensitive-data-protection)
- [Transaction Security](#transaction-security)
- [Monitoring & Alerting](#monitoring--alerting)

## Security Principles

### Defense in Depth

Implement multiple layers of security:

1. **Input Validation**: Validate all user inputs before processing
2. **Rate Limiting**: Prevent abuse through request throttling
3. **Access Control**: Restrict admin commands to authorized users
4. **Audit Logging**: Log all security-relevant events
5. **Error Handling**: Never expose sensitive information in errors

### Least Privilege

```javascript
// Good: Minimal permissions
const botPermissions = [
  'SendMessages',
  'UseApplicationCommands',
  'ReadMessageHistory'
];

// Bad: Excessive permissions
const badPermissions = [
  'Administrator'  // Never use this!
];
```

## Rate Limiting

### Per-User Rate Limits

Implement rate limiting for all transaction-related commands:

```javascript
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limiter configurations
const rateLimiters = {
  // Tip command: 10 tips per minute per user
  tip: new RateLimiterMemory({
    points: 10,
    duration: 60, // seconds
    blockDuration: 60, // block for 1 minute if exceeded
  }),

  // Balance check: 20 per minute per user
  balance: new RateLimiterMemory({
    points: 20,
    duration: 60,
  }),

  // Wallet registration: 3 per hour per user
  register: new RateLimiterMemory({
    points: 3,
    duration: 3600,
    blockDuration: 3600,
  }),

  // Withdrawal: 5 per hour per user
  withdraw: new RateLimiterMemory({
    points: 5,
    duration: 3600,
    blockDuration: 7200, // block for 2 hours
  }),
};

// Apply rate limiting to commands
async function handleTipCommand(interaction) {
  const userId = interaction.user.id;

  try {
    // Consume 1 point
    await rateLimiters.tip.consume(userId);
    
    // Process tip command
    await processTip(interaction);
  } catch (rateLimitError) {
    // Rate limit exceeded
    const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000);
    await interaction.reply({
      content: `⏰ Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      ephemeral: true
    });
  }
}
```

### Global Rate Limits

Protect against server-wide abuse:

```javascript
// Global rate limiter: 1000 commands per minute across all users
const globalLimiter = new RateLimiterMemory({
  points: 1000,
  duration: 60,
});

// Apply to all commands
client.on('interactionCreate', async (interaction) => {
  try {
    await globalLimiter.consume('global');
    // Process command
  } catch (error) {
    await interaction.reply({
      content: '🚫 Server is experiencing high load. Please try again.',
      ephemeral: true
    });
  }
});
```

### IP-Based Rate Limiting (API)

For API endpoints:

```javascript
const rateLimit = require('express-rate-limit');

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to API routes
app.use('/api/', apiLimiter);
```

## Input Validation

### Solana Address Validation

```javascript
const { PublicKey } = require('@solana/web3.js');

/**
 * Validate Solana address format
 */
function validateSolanaAddress(address) {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address must be a string' };
  }

  // Check length
  if (address.length < 32 || address.length > 44) {
    return { valid: false, error: 'Invalid address length' };
  }

  // Check if valid base58
  try {
    new PublicKey(address);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid Solana address format' };
  }
}

// Usage in command handler
const validation = validateSolanaAddress(userInput);
if (!validation.valid) {
  return interaction.reply({
    content: `❌ ${validation.error}`,
    ephemeral: true
  });
}
```

### Amount Validation

```javascript
/**
 * Validate transaction amount
 */
function validateAmount(amount, currency = 'SOL') {
  // Must be a number
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, error: 'Amount must be a number' };
  }

  // Must be positive
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be positive' };
  }

  // Check minimum amounts
  const minimums = {
    SOL: 0.001,   // Minimum 0.001 SOL
    USDC: 0.01,   // Minimum $0.01
  };

  if (amount < (minimums[currency] || 0)) {
    return { 
      valid: false, 
      error: `Minimum amount is ${minimums[currency]} ${currency}` 
    };
  }

  // Check maximum amounts (prevent typos)
  const maximums = {
    SOL: 1000,    // Maximum 1000 SOL per transaction
    USDC: 10000,  // Maximum $10,000 per transaction
  };

  if (amount > (maximums[currency] || Infinity)) {
    return { 
      valid: false, 
      error: `Maximum amount is ${maximums[currency]} ${currency}` 
    };
  }

  return { valid: true };
}
```

### User Input Sanitization

```javascript
/**
 * Sanitize user text input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 200);       // Limit length
}
```

## Sensitive Data Protection

### Environment Variables

```javascript
// ✅ Good: Use environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

// ❌ Bad: Hardcoded secrets
const BAD_TOKEN = 'MTk4NjIyNDgzNDc...'; // Never do this!
```

### Secrets Management

For production:

```javascript
// AWS Secrets Manager example
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  try {
    const data = await secretsManager.getSecretValue({ 
      SecretId: secretName 
    }).promise();
    
    return JSON.parse(data.SecretString);
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw error;
  }
}

// Usage
const secrets = await getSecret('justthetip/production');
const botToken = secrets.BOT_TOKEN;
```

### Logging Security

```javascript
// ✅ Good: Safe logging
logger.info('Transaction generated', {
  userId: interaction.user.id,
  amount: amount,
  recipient: recipientAddress,
});

// ❌ Bad: Logging sensitive data
logger.info('User data', {
  privateKey: userPrivateKey,  // NEVER log private keys!
  password: userPassword,      // NEVER log passwords!
});
```

## Transaction Security

### Transaction Validation

```javascript
/**
 * Validate transaction before generation
 */
async function validateTransaction(sender, recipient, amount) {
  // Check sender has sufficient balance
  const balance = await sdk.getBalance(sender);
  const fee = 0.000005; // Solana transaction fee
  
  if (balance < amount + fee) {
    return { 
      valid: false, 
      error: `Insufficient balance. Need ${amount + fee} SOL, have ${balance} SOL` 
    };
  }

  // Check sender and recipient are different
  if (sender === recipient) {
    return { 
      valid: false, 
      error: 'Cannot send to yourself' 
    };
  }

  // Check recipient is registered
  const recipientRegistered = await db.isWalletRegistered(recipient);
  if (!recipientRegistered) {
    return { 
      valid: false, 
      error: 'Recipient must register a wallet first' 
    };
  }

  return { valid: true };
}
```

### Transaction Limits

```javascript
// Daily transaction volume limits per user
const DAILY_LIMIT = {
  SOL: 100,      // Max 100 SOL per day
  USDC: 10000,   // Max $10,000 per day
};

async function checkDailyLimit(userId, amount, currency) {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily:${userId}:${currency}:${today}`;
  
  const currentVolume = await redis.get(key) || 0;
  const newVolume = parseFloat(currentVolume) + amount;
  
  if (newVolume > DAILY_LIMIT[currency]) {
    throw new Error(`Daily limit exceeded (${DAILY_LIMIT[currency]} ${currency})`);
  }
  
  // Update volume
  await redis.set(key, newVolume, 'EX', 86400); // Expire in 24 hours
  
  return true;
}
```

## Monitoring & Alerting

### Suspicious Activity Detection

```javascript
const suspiciousPatterns = {
  // Rapid repeated transactions to same address
  async detectSpam(userId) {
    const recentTxs = await db.getRecentTransactions(userId, 5);
    const uniqueRecipients = new Set(recentTxs.map(tx => tx.recipient));
    
    if (uniqueRecipients.size === 1 && recentTxs.length >= 5) {
      await alertAdmin({
        type: 'SPAM_DETECTED',
        userId,
        pattern: 'Repeated tips to same address',
      });
      return true;
    }
    return false;
  },

  // Large sudden transaction
  async detectLargeTransaction(userId, amount, currency) {
    const avgAmount = await db.getAverageTransactionAmount(userId);
    
    if (amount > avgAmount * 10) {
      await alertAdmin({
        type: 'LARGE_TRANSACTION',
        userId,
        amount,
        currency,
        message: 'Transaction 10x larger than user average',
      });
    }
  },

  // New user with large transaction
  async detectNewUserRisk(userId, amount) {
    const userAge = await db.getUserAccountAge(userId);
    const daysSinceJoin = (Date.now() - userAge) / (1000 * 60 * 60 * 24);
    
    if (daysSinceJoin < 7 && amount > 1) {
      await alertAdmin({
        type: 'NEW_USER_LARGE_TX',
        userId,
        accountAge: daysSinceJoin,
        amount,
      });
    }
  },
};
```

### Alert System

```javascript
async function alertAdmin(alert) {
  // Log to file
  logger.warn('Security Alert', alert);
  
  // Send to admin channel
  const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
  await adminChannel.send({
    embeds: [{
      title: '🚨 Security Alert',
      description: alert.message || alert.type,
      fields: Object.entries(alert).map(([key, value]) => ({
        name: key,
        value: String(value),
        inline: true,
      })),
      color: 0xFF0000,
      timestamp: new Date(),
    }],
  });
  
  // Send to monitoring service (e.g., Sentry)
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(`Security Alert: ${alert.type}`, {
      level: 'warning',
      extra: alert,
    });
  }
}
```

## Admin Command Security

### Role-Based Access Control

```javascript
// Admin user IDs from environment
const SUPER_ADMINS = process.env.SUPER_ADMIN_USER_IDS?.split(',') || [];
const ADMINS = process.env.ADMIN_USER_IDS?.split(',') || [];

function isSuperAdmin(userId) {
  return SUPER_ADMINS.includes(userId);
}

function isAdmin(userId) {
  return ADMINS.includes(userId) || isSuperAdmin(userId);
}

// Protect admin commands
async function handleAdminCommand(interaction) {
  if (!isAdmin(interaction.user.id)) {
    await interaction.reply({
      content: '❌ Unauthorized. This command is restricted to administrators.',
      ephemeral: true,
    });
    
    // Log unauthorized access attempt
    logger.warn('Unauthorized admin command attempt', {
      userId: interaction.user.id,
      command: interaction.commandName,
    });
    
    return;
  }
  
  // Process admin command
  await processAdminCommand(interaction);
}
```

## Security Checklist

### Development

- [ ] All user inputs validated
- [ ] Rate limiting implemented on all commands
- [ ] No private keys stored in code
- [ ] Environment variables used for secrets
- [ ] Error messages don't expose sensitive info
- [ ] SQL/NoSQL injection prevention
- [ ] XSS prevention in web interfaces

### Deployment

- [ ] HTTPS/TLS enabled for all connections
- [ ] Secrets stored in secure vault (AWS Secrets Manager, etc.)
- [ ] Regular security audits scheduled
- [ ] Monitoring and alerting configured
- [ ] Backup and disaster recovery plan
- [ ] Access logs enabled and reviewed

### Operations

- [ ] Regular dependency updates
- [ ] Security patches applied promptly
- [ ] Admin access logs reviewed
- [ ] Suspicious activity monitoring
- [ ] Incident response plan documented
- [ ] Regular penetration testing

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Discord Bot Security](https://discord.com/developers/docs/topics/security)
- [Solana Security Best Practices](https://docs.solana.com/developing/programming-model/security)

---

*For security issues, please review [CONTRIBUTING.md](../CONTRIBUTING.md) for responsible disclosure guidelines.*
