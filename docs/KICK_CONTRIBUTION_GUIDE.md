# Kick Integration Contribution Guide

**Feature Branch:** `claude/justhetip-kick-bot-integration-011CV1NoFUHu8RviMqLTKqQK`
**Created:** 2025-11-11
**Version:** 1.0.0

---

## 📋 Overview

This guide is specifically for contributors working on the **Kick bot integration** for JustTheTip. It provides detailed instructions on how to contribute effectively while maintaining code quality and security standards.

### What We're Building

- **Kick Bot API Integration:** Enable JustTheTip to operate as a Kick chatbot
- **Tipping Functionality:** Allow Kick users to tip streamers with crypto
- **Channel & Group Management:** Support Kick channels and chat rooms
- **Passkey Wallet Integration:** Modern passwordless authentication

---

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

1. **Development Environment**
   - Node.js 18+ installed
   - PostgreSQL database (or SQLite for local development)
   - Git configured with your GitHub account
   - Code editor (VS Code recommended)

2. **Accounts Required**
   - Kick.com developer account ([dev.kick.com](https://dev.kick.com))
   - Solana RPC endpoint (Helius recommended)
   - Discord Developer account (for testing)

3. **Knowledge Prerequisites**
   - JavaScript/Node.js fundamentals
   - Async/await and Promises
   - REST API design
   - WebSocket basics
   - Basic Solana knowledge (helpful but not required)

### Environment Setup

1. **Clone the Repository**

```bash
git clone https://github.com/jmenichole/Justthetip.git
cd Justthetip
```

2. **Checkout the Kick Integration Branch**

```bash
git checkout claude/justhetip-kick-bot-integration-011CV1NoFUHu8RviMqLTKqQK
```

3. **Install Dependencies**

```bash
npm install
```

4. **Configure Environment Variables**

Copy `.env.example` to `.env` and add:

```bash
# Existing variables (see .env.example for full list)
DISCORD_BOT_TOKEN=your_token
SOLANA_RPC_URL=your_rpc_url
DATABASE_URL=your_database_url

# NEW: Kick Integration Variables
KICK_CLIENT_ID=your_kick_client_id
KICK_CLIENT_SECRET=your_kick_client_secret
KICK_REDIRECT_URI=http://localhost:3000/kick/oauth/callback
KICK_WEBHOOK_SECRET=your_webhook_secret

# NEW: Passkey Variables
PASSKEY_RP_NAME="JustTheTip"
PASSKEY_RP_ID=localhost
PASSKEY_ORIGIN=http://localhost:3000

# NEW: Encryption
TOKEN_ENCRYPTION_KEY=your_32_byte_encryption_key_here
```

5. **Run Database Migrations**

```bash
npm run migrate:kick
```

6. **Verify Setup**

```bash
npm run verify-env
npm test
```

---

## 📁 Project Structure for Kick Integration

```
Justthetip/
├── src/
│   ├── kick/                      # NEW: Kick integration modules
│   │   ├── kickClient.js          # Main Kick API client
│   │   ├── kickAuth.js            # OAuth 2.1 authentication
│   │   ├── kickChat.js            # Chat WebSocket handler
│   │   ├── kickWebhooks.js        # Webhook event handlers
│   │   ├── kickCommands.js        # Chat command handlers
│   │   └── kickChannelManager.js  # Channel management
│   │
│   ├── passkey/                   # NEW: Passkey modules
│   │   ├── passkeyService.js      # WebAuthn/FIDO2 service
│   │   ├── passkeyAuth.js         # Passkey authentication
│   │   ├── passkeyRegistration.js # Passkey registration flow
│   │   └── passkeyChallenge.js    # Challenge generation
│   │
│   ├── integrations/              # NEW: Integration bridges
│   │   ├── kickSolanaAdapter.js   # Kick + Solana integration
│   │   └── kickDiscordBridge.js   # Kick + Discord bridge
│   │
│   ├── commands/                  # Existing command handlers
│   │   ├── kickTipCommand.js      # NEW: Kick tip command
│   │   └── kickWalletCommands.js  # NEW: Kick wallet commands
│   │
│   └── utils/                     # Utility modules
│       ├── kickRateLimiter.js     # NEW: Kick rate limiting
│       ├── kickEmbedBuilders.js   # NEW: Kick message formatting
│       └── kickLogger.js          # NEW: Kick event logging
│
├── api/
│   ├── routes/
│   │   ├── kickRoutes.js          # NEW: Kick API endpoints
│   │   └── passkeyRoutes.js       # NEW: Passkey endpoints
│   │
│   └── public/
│       ├── kick-sign.html         # NEW: Kick wallet registration UI
│       └── passkey-register.html  # NEW: Passkey registration UI
│
├── db/
│   ├── migrations/
│   │   └── 003_kick_tables.sql    # NEW: Kick database schema
│   │
│   └── seeds/
│       └── kick_test_data.sql     # NEW: Test data
│
├── tests/
│   ├── kick/                      # NEW: Kick integration tests
│   │   ├── kickClient.test.js
│   │   ├── kickCommands.test.js
│   │   └── kickAuth.test.js
│   │
│   └── passkey/                   # NEW: Passkey tests
│       ├── passkeyService.test.js
│       └── walletDerivation.test.js
│
├── docs/
│   ├── KICK_BOT_INTEGRATION_PLAN.md         # Architecture plan
│   ├── PASSKEY_WALLET_INTEGRATION_PLAN.md   # Passkey plan
│   └── KICK_CONTRIBUTION_GUIDE.md           # This document
│
└── scripts/
    ├── kick-setup.js              # NEW: Kick setup script
    └── test-kick-integration.js   # NEW: Integration test script
```

---

## 🛠️ Development Workflow

### 1. Pick a Task

Check the [GitHub Projects board](https://github.com/jmenichole/Justthetip/projects) or issues labeled `kick-integration` for available tasks.

Example tasks:
- Implement OAuth 2.1 authentication flow
- Create Kick chat WebSocket client
- Build tip command handler
- Add passkey registration endpoint
- Write integration tests

### 2. Create a Feature Branch

```bash
# From the main Kick integration branch
git checkout claude/justhetip-kick-bot-integration-011CV1NoFUHu8RviMqLTKqQK

# Create your feature branch
git checkout -b kick/feature-name

# Example:
git checkout -b kick/oauth-authentication
```

### 3. Write Code

Follow these principles:

#### Code Style

- **Follow existing patterns:** Review similar modules before starting
- **Use Prettier:** Code will be auto-formatted on commit
- **Pass ESLint:** No linting errors allowed
- **Add JSDoc comments:** Document public APIs

Example:

```javascript
/**
 * Sends a tip to a Kick user via chat command
 *
 * @param {Object} params - Tip parameters
 * @param {string} params.senderId - Sender's Kick user ID
 * @param {string} params.recipientUsername - Recipient's username
 * @param {number} params.amount - Tip amount
 * @param {string} params.token - Token symbol (SOL, USDC, BONK)
 * @param {string} params.channelId - Kick channel ID
 * @returns {Promise<Object>} Transaction result
 * @throws {Error} If sender is not registered or insufficient balance
 */
async function sendKickTip({ senderId, recipientUsername, amount, token, channelId }) {
  // Implementation
}
```

#### Error Handling

Always use try-catch with detailed error messages:

```javascript
try {
  const result = await kickClient.sendMessage(channelId, message);
  return result;
} catch (error) {
  console.error('Failed to send Kick message:', error);
  throw new Error(`Kick message failed: ${error.message}`);
}
```

#### Rate Limiting

Respect Kick API rate limits:

```javascript
const { checkKickRateLimit } = require('../utils/kickRateLimiter');

async function handleCommand(user, command) {
  // Check rate limit before processing
  const allowed = await checkKickRateLimit(user.id, command);
  if (!allowed) {
    throw new Error('Rate limit exceeded. Please wait before using this command again.');
  }

  // Process command
}
```

#### Security

- **Never log sensitive data:** No tokens, secrets, or private keys in logs
- **Validate all inputs:** Use validators for user inputs
- **Sanitize messages:** Prevent injection attacks
- **Encrypt tokens:** Use TOKEN_ENCRYPTION_KEY for OAuth tokens

```javascript
const { validateAmount, validateUsername } = require('../validators/kickValidators');

async function handleTip(sender, recipientUsername, amount) {
  // Validate inputs
  if (!validateUsername(recipientUsername)) {
    throw new Error('Invalid username format');
  }

  if (!validateAmount(amount)) {
    throw new Error('Invalid amount. Must be positive number.');
  }

  // Process tip
}
```

### 4. Write Tests

**Every new feature MUST have tests.**

#### Unit Tests

```javascript
// tests/kick/kickCommands.test.js
const { handleKickTipCommand } = require('../../src/kick/kickCommands');

describe('Kick Tip Command', () => {
  test('should send tip to registered user', async () => {
    const mockDb = {
      getKickUser: jest.fn().mockResolvedValue({
        kick_user_id: 'user123',
        wallet_address: 'wallet123'
      })
    };

    const result = await handleKickTipCommand({
      db: mockDb,
      senderId: 'sender123',
      recipientUsername: 'recipient',
      amount: 1.5,
      token: 'SOL'
    });

    expect(result.success).toBe(true);
    expect(mockDb.getKickUser).toHaveBeenCalledWith('sender123');
  });

  test('should create pending tip for unregistered user', async () => {
    const mockDb = {
      getKickUser: jest.fn().mockResolvedValueOnce({ /* sender */ })
        .mockResolvedValueOnce(null), // recipient not found
      createPendingKickTip: jest.fn().mockResolvedValue({ id: 1 })
    };

    const result = await handleKickTipCommand({
      db: mockDb,
      senderId: 'sender123',
      recipientUsername: 'unregistered',
      amount: 1.5,
      token: 'SOL'
    });

    expect(result.pending).toBe(true);
    expect(mockDb.createPendingKickTip).toHaveBeenCalled();
  });
});
```

#### Integration Tests

```javascript
// tests/kick/integration/oauth.integration.test.js
const request = require('supertest');
const app = require('../../../api/server');

describe('Kick OAuth Integration', () => {
  test('should start OAuth flow', async () => {
    const response = await request(app)
      .get('/api/kick/oauth/authorize')
      .query({ user_id: 'test123' });

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('id.kick.com/oauth/authorize');
  });

  test('should exchange code for tokens', async () => {
    const response = await request(app)
      .post('/api/kick/oauth/callback')
      .send({
        code: 'test_code',
        state: 'test_state'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('access_token');
  });
});
```

### 5. Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/kick/kickCommands.test.js

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch
```

### 6. Lint and Format

```bash
# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Format with Prettier (runs automatically on commit)
npx prettier --write .
```

### 7. Commit Changes

Use conventional commit messages:

```bash
git add .
git commit -m "feat(kick): implement OAuth 2.1 authentication flow

- Add kickAuth.js module with PKCE support
- Implement token refresh mechanism
- Add encrypted token storage
- Include unit tests for auth flow

Closes #123"
```

Commit message format:
- `feat(kick):` - New Kick feature
- `fix(kick):` - Bug fix
- `test(kick):` - Test additions
- `docs(kick):` - Documentation
- `refactor(kick):` - Code refactoring
- `perf(kick):` - Performance improvement

### 8. Push and Create Pull Request

```bash
# Push your feature branch
git push origin kick/feature-name

# Create pull request on GitHub
# Include:
# - Clear description of changes
# - Link to related issue
# - Screenshots (if UI changes)
# - Testing performed
# - Breaking changes (if any)
```

---

## 📝 Code Review Process

### What Reviewers Look For

1. **Functionality**
   - Does the code work as intended?
   - Are edge cases handled?
   - Is error handling comprehensive?

2. **Code Quality**
   - Follows existing patterns and conventions
   - Clear and readable
   - Well-documented with JSDoc
   - No code duplication

3. **Security**
   - Input validation
   - No sensitive data in logs
   - Proper authentication/authorization
   - SQL injection prevention
   - Rate limiting implemented

4. **Performance**
   - No unnecessary database queries
   - Efficient algorithms
   - Proper caching where appropriate
   - No memory leaks

5. **Tests**
   - Adequate test coverage (aim for 80%+)
   - Tests cover edge cases
   - Integration tests for critical paths

### Responding to Feedback

- Be open to suggestions
- Ask questions if something is unclear
- Make requested changes promptly
- Mark resolved comments as resolved
- Thank reviewers for their time

---

## 🧪 Testing Guidelines

### Test Coverage Requirements

- **Unit Tests:** 80%+ coverage for business logic
- **Integration Tests:** Critical user flows
- **End-to-End Tests:** Happy path scenarios

### What to Test

#### Kick Integration

✅ **Do Test:**
- OAuth authentication flow
- Token refresh mechanism
- Chat command parsing
- Tip transaction logic
- Wallet derivation from passkey
- Rate limiting
- Error handling
- Input validation

❌ **Don't Test:**
- Kick API itself (assume it works)
- Third-party libraries
- Database queries (use mocks)

### Testing Best Practices

1. **Use mocks for external services**

```javascript
jest.mock('../../src/kick/kickClient', () => ({
  sendMessage: jest.fn().mockResolvedValue({ success: true }),
  getChannel: jest.fn().mockResolvedValue({ id: 'channel123' })
}));
```

2. **Test error scenarios**

```javascript
test('should handle network errors gracefully', async () => {
  kickClient.sendMessage.mockRejectedValue(new Error('Network error'));

  await expect(handleCommand()).rejects.toThrow('Network error');
});
```

3. **Use descriptive test names**

```javascript
// ❌ Bad
test('tip works', () => { /* ... */ });

// ✅ Good
test('should successfully send tip to registered user with sufficient balance', () => { /* ... */ });
```

4. **Follow AAA pattern (Arrange, Act, Assert)**

```javascript
test('should create pending tip for unregistered user', async () => {
  // Arrange
  const sender = { id: '123', wallet: 'wallet123' };
  const recipient = { username: 'unregistered' };
  const amount = 1.5;

  // Act
  const result = await sendTip(sender, recipient, amount);

  // Assert
  expect(result.status).toBe('pending');
  expect(result.expiresAt).toBeDefined();
});
```

---

## 🔒 Security Guidelines

### Sensitive Data Handling

**NEVER commit:**
- API keys or secrets
- Private keys or mnemonics
- OAuth tokens
- Passwords
- PII (personally identifiable information)

**Use environment variables for:**
- API credentials
- Database URLs
- Encryption keys
- Service endpoints

### Input Validation

Always validate user inputs:

```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/kick/tip',
  body('amount').isFloat({ min: 0.000001 }),
  body('recipient').isAlphanumeric(),
  body('token').isIn(['SOL', 'USDC', 'BONK']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Process tip
  }
);
```

### Rate Limiting

Implement rate limiting for all user-facing endpoints:

```javascript
const rateLimit = require('express-rate-limit');

const kickCommandLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many requests, please try again later.'
});

app.post('/api/kick/command', kickCommandLimiter, handleCommand);
```

### SQL Injection Prevention

Use parameterized queries:

```javascript
// ❌ NEVER do this
const query = `SELECT * FROM users WHERE username = '${username}'`;

// ✅ Always do this
const query = 'SELECT * FROM users WHERE username = $1';
const result = await db.query(query, [username]);
```

---

## 📊 Performance Guidelines

### Database Optimization

1. **Use indexes on frequently queried fields**

```sql
CREATE INDEX idx_kick_users_kick_user_id ON kick_users(kick_user_id);
CREATE INDEX idx_kick_tips_channel_id ON kick_tips(channel_id);
CREATE INDEX idx_kick_tips_created_at ON kick_tips(created_at);
```

2. **Use connection pooling**

```javascript
const pool = new Pool({
  min: 10,
  max: 50,
  idleTimeoutMillis: 30000
});
```

3. **Avoid N+1 queries**

```javascript
// ❌ Bad (N+1 queries)
const users = await db.query('SELECT * FROM kick_users');
for (const user of users) {
  const tips = await db.query('SELECT * FROM kick_tips WHERE sender_id = $1', [user.id]);
}

// ✅ Good (single query with JOIN)
const query = `
  SELECT u.*, t.*
  FROM kick_users u
  LEFT JOIN kick_tips t ON u.kick_user_id = t.sender_kick_user_id
`;
const result = await db.query(query);
```

### Caching Strategy

Use caching for frequently accessed data:

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function getKickChannel(channelId) {
  // Check cache first
  const cached = cache.get(`channel:${channelId}`);
  if (cached) return cached;

  // Fetch from API
  const channel = await kickClient.getChannel(channelId);

  // Store in cache
  cache.set(`channel:${channelId}`, channel);

  return channel;
}
```

---

## 🐛 Debugging Tips

### Logging

Use the logger module for consistent logging:

```javascript
const logger = require('../../src/utils/logger');

// Different log levels
logger.info('Processing tip command', { userId, amount, token });
logger.warn('Rate limit approaching', { userId, remaining: 2 });
logger.error('Tip transaction failed', { error: error.message, stack: error.stack });
logger.debug('WebSocket message received', { message });
```

### Debug Environment

Enable debug mode:

```bash
# In .env
DEBUG=kick:*,passkey:*
NODE_ENV=development
LOG_LEVEL=debug
```

### Common Issues

**Issue: OAuth redirect not working**
```
Solution: Check KICK_REDIRECT_URI matches exactly in Kick Developer Portal
```

**Issue: Passkey registration fails**
```
Solution: Ensure HTTPS (or localhost) and correct PASSKEY_RP_ID
```

**Issue: WebSocket disconnects frequently**
```
Solution: Implement reconnection logic with exponential backoff
```

**Issue: Rate limit errors**
```
Solution: Implement proper rate limiting and backoff strategy
```

---

## 📚 Resources

### Documentation

- [Kick Dev API Documentation](https://docs.kick.com)
- [WebAuthn Guide](https://webauthn.guide/)
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [JustTheTip Developer Guide](../DEVELOPER_GUIDE.md)

### Libraries

- [@simplewebauthn/server](https://simplewebauthn.dev/) - WebAuthn implementation
- [ws](https://github.com/websockets/ws) - WebSocket client
- [axios](https://axios-http.com/) - HTTP client
- [rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible) - Rate limiting

### Tools

- [Postman](https://www.postman.com/) - API testing
- [Redis Commander](http://joeferner.github.io/redis-commander/) - Redis GUI
- [pgAdmin](https://www.pgadmin.org/) - PostgreSQL GUI
- [WebAuthn Debugger](https://webauthn.io/) - Test passkey flows

---

## 🤝 Getting Help

### Communication Channels

- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** Questions and discussions
- **Discord:** Real-time help (link in main README)

### Asking Questions

When asking for help:

1. **Provide context:** What are you trying to do?
2. **Show what you tried:** Code snippets, error messages
3. **Specify environment:** Node version, OS, etc.
4. **Include logs:** Relevant error logs (sanitize sensitive data)

Example:

```
**Issue:** OAuth callback fails with 400 error

**What I'm trying to do:**
Implement Kick OAuth authentication flow

**Code:**
[paste relevant code]

**Error:**
[paste error message and stack trace]

**Environment:**
- Node.js: 18.17.0
- OS: macOS 13.4
- Branch: kick/oauth-authentication

**What I tried:**
- Verified KICK_REDIRECT_URI matches Developer Portal
- Checked that code verifier is stored correctly
- Confirmed client ID and secret are correct
```

---

## 🎉 Recognition

Contributors to the Kick integration will be:

- Listed in `CONTRIBUTORS.md`
- Credited in release notes
- Eligible for bounties (if applicable)
- Recognized in community channels

Thank you for contributing to JustTheTip's Kick integration! 🚀

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-11
**Maintainer:** Claude Code
