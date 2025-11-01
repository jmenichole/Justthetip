# Contributing to JustTheTip

Thank you for your interest in contributing to JustTheTip! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Testnet Setup](#testnet-setup)
- [Code Style](#code-style)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Security](#security)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- Git
- A Discord account and test server
- Access to Solana devnet/testnet

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Justthetip.git
   cd Justthetip
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/jmenichole/Justthetip.git
   ```

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
# Discord Configuration
BOT_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
GUILD_ID=your_discord_guild_id_here

# Solana Configuration (Use Devnet for Development)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOL_RPC_URL=https://api.devnet.solana.com

# Database (Use local MongoDB for development)
MONGODB_URI=mongodb://localhost:27017/justthetip_dev

# Admin Configuration
SUPER_ADMIN_USER_IDS=your_discord_user_id
NODE_ENV=development
```

### 3. Setup Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Navigate to "Bot" section and create a bot
4. Copy the bot token to your `.env` file
5. Enable required intents:
   - Server Members Intent
   - Message Content Intent
6. Generate an invite URL with these permissions:
   - Send Messages
   - Use Slash Commands
   - Read Message History
7. Invite the bot to your test server

### 4. Deploy Slash Commands

```bash
node register-commands.js
```

### 5. Start the Bot

For development with the smart contract version:
```bash
npm run start:smart-contract
```

For development with the legacy version:
```bash
npm run start:bot
```

## Testnet Setup

### Solana Devnet Setup

1. **Install Solana CLI** (optional but recommended):
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

2. **Create a Devnet Wallet**:
   ```bash
   solana-keygen new --outfile ~/devnet-wallet.json
   ```

3. **Configure Solana CLI for Devnet**:
   ```bash
   solana config set --url https://api.devnet.solana.com
   ```

4. **Request Devnet SOL Airdrop**:
   ```bash
   solana airdrop 2
   ```
   Or use the [Solana Faucet](https://faucet.solana.com/)

5. **Get Your Public Key**:
   ```bash
   solana address
   ```

### Testing Smart Contracts

When testing smart contract functionality:

- Always use Devnet RPC URL: `https://api.devnet.solana.com`
- Use devnet wallets with airdropped SOL
- Never use mainnet private keys in development
- Test all transaction flows before submitting PRs

## Code Style

### JavaScript/Node.js Style Guidelines

We use ESLint and Prettier for code formatting:

```bash
# Run linter
npm run lint

# Format code (if configured)
npm run format
```

### General Guidelines

1. **Use meaningful variable names**
   ```javascript
   // Good
   const senderWalletAddress = '...';
   
   // Bad
   const addr = '...';
   ```

2. **Add JSDoc comments for functions**
   ```javascript
   /**
    * Create a SOL transfer instruction
    * @param {string} senderAddress - Sender's public key
    * @param {string} recipientAddress - Recipient's public key
    * @param {number} amount - Amount in SOL
    * @returns {Transaction|null} Unsigned transaction or null on error
    */
   createTipInstruction(senderAddress, recipientAddress, amount) {
     // Implementation
   }
   ```

3. **Handle errors gracefully**
   ```javascript
   try {
     // Operation
   } catch (error) {
     console.error('Descriptive error message:', error.message);
     return null; // or throw with context
   }
   ```

4. **Use async/await over callbacks**
   ```javascript
   // Good
   const balance = await sdk.getBalance(address);
   
   // Avoid
   sdk.getBalance(address, (error, balance) => { });
   ```

5. **Keep functions small and focused**
   - Each function should do one thing well
   - Aim for functions under 50 lines
   - Extract complex logic into helper functions

### File Organization

```
justthetip/
├── api/              # Express API routes
├── bot.js            # Legacy bot implementation
├── bot_smart_contract.js  # Smart contract bot
├── chains/           # Blockchain helpers (Solana, etc.)
├── contracts/        # Smart contract SDK
│   ├── sdk.js        # Main SDK
│   ├── example.js    # Usage examples
│   └── README.md     # SDK documentation
├── db/               # Database logic
├── src/
│   ├── commands/     # Discord command handlers
│   ├── utils/        # Utility functions
│   └── validators/   # Input validation
└── tests/            # Test files
```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-transaction-history` - New features
- `fix/balance-calculation-bug` - Bug fixes
- `docs/update-readme` - Documentation updates
- `refactor/simplify-sdk` - Code refactoring

### Commit Messages

Write clear, descriptive commit messages:

```
Add rate limiting for smart contract commands

- Implement rate limiter using rate-limiter-flexible
- Add per-user limits for tip commands
- Add tests for rate limiting functionality
- Update documentation

Fixes #123
```

Format:
1. Short summary (50 chars or less)
2. Blank line
3. Detailed description
4. Reference issues with "Fixes #123" or "Relates to #456"

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/sdk.test.js

# Run tests in watch mode
npm test -- --watch
```

### Writing Tests

Create tests for new functionality:

```javascript
// tests/sdk.test.js
const { JustTheTipSDK } = require('../contracts/sdk');

describe('JustTheTipSDK', () => {
  let sdk;
  
  beforeEach(() => {
    sdk = new JustTheTipSDK('https://api.devnet.solana.com');
  });
  
  test('createTipInstruction returns valid transaction', () => {
    const sender = 'ValidSolanaAddress1...';
    const recipient = 'ValidSolanaAddress2...';
    const amount = 0.1;
    
    const transaction = sdk.createTipInstruction(sender, recipient, amount);
    
    expect(transaction).not.toBeNull();
    expect(transaction.instructions.length).toBeGreaterThan(0);
  });
});
```

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] Bot starts without errors
- [ ] Slash commands register successfully
- [ ] Commands respond correctly
- [ ] Error messages are user-friendly
- [ ] No sensitive data is logged
- [ ] Works on Devnet
- [ ] Code passes linting

## Submitting Changes

### Pull Request Process

1. **Update your fork**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request**:
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Select your feature branch
   - Fill out the PR template

### PR Title Format

```
[Feature] Add transaction history command
[Fix] Resolve balance calculation rounding error
[Docs] Update setup instructions
[Refactor] Simplify SDK error handling
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactoring

## Testing Done
- [ ] Tested on devnet
- [ ] Added unit tests
- [ ] Manual testing completed
- [ ] Linting passes

## Related Issues
Fixes #123

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No sensitive data exposed
- [ ] Tests pass
```

## Security

### Security Practices

1. **Never commit sensitive data**:
   - Private keys
   - API keys
   - Passwords
   - Database credentials

2. **Use environment variables** for all secrets

3. **Validate all user inputs**:
   ```javascript
   if (!sdk.validateAddress(address)) {
     return 'Invalid Solana address';
   }
   ```

4. **Never log sensitive information**:
   ```javascript
   // Bad
   console.log('Private key:', privateKey);
   
   // Good
   console.log('Processing transaction for address:', publicAddress);
   ```

### Reporting Security Issues

**Do not open public issues for security vulnerabilities.**

Instead, email security concerns to the maintainers or open a private security advisory on GitHub.

## Questions?

- Open a discussion on GitHub
- Check existing issues and documentation
- Ask in the community Discord

## License

By contributing to JustTheTip, you agree that your contributions will be licensed under the project's [Custom License](LICENSE) (MIT-based with commercial sale restrictions).

---

Thank you for contributing to JustTheTip! 🚀
