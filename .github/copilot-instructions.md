# JustTheTip Discord Crypto Tipping Bot

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Build (ALWAYS run these first)
- `npm install` -- takes 42 seconds. NEVER CANCEL. Always successful.
- `mkdir -p logs` -- create required logs directory for winston logger

### Development Commands That Work
- **Web Application (Vite + React):**
  - `cd justthetip---external-wallet-helper && npm install` -- takes 2 seconds
  - `cd justthetip---external-wallet-helper && npm run dev` -- starts in 2 seconds. NEVER CANCEL. Runs on http://localhost:5174/justthetipbot/
- **Key Generation (Always Working):**
  - `node solana-mnemonic-to-json.js` -- takes 0.4 seconds. Outputs Solana key array for .env
  - `node generate-btc-testnet-key.js` -- takes 0.3 seconds. Outputs WIF and address for .env
- **Testing:**
  - `npm test test/core.test.js` -- takes 1 second. Tests core utilities only.
  - `npm test` -- takes 1 second but FAILS due to missing dependencies. DO NOT USE for full test suite.
- **Code Quality:**
  - `npm run lint` -- takes 1 second. Will show warnings and errors in code.
  - `npm audit` -- takes 0.7 seconds. Always reports 0 vulnerabilities.

### Commands That Do NOT Work (Document These Issues)
- **BROKEN: Main Bot Files:**
  - `node bot.js` -- FAILS with syntax error. File is incomplete (ends at line 338).
  - `node bot_secure.js` -- FAILS with missing ./chains/solana module.
- **BROKEN: Full Test Suite:**
  - `npm test` without specific file -- FAILS due to missing 'ethers' dependency and incorrect import paths.

## Core Project Structure

### Key Directories
- `src/` -- Core bot logic: commands/, utils/, validators/
- `chains/` -- Blockchain service integrations (partially broken)
- `db/` -- MongoDB database layer
- `security/` -- Risk management and wallet security
- `test/` -- Jest test files (some work, some broken)
- `justthetip---external-wallet-helper/` -- **FULLY WORKING** Vite+React web app

### Working Modules
- `src/validators/inputValidation.js` -- Validates SOL addresses and amounts
- `src/utils/logger.js` -- Winston logger (requires logs/ directory)
- `db/database.js` -- MongoDB connection (requires MONGODB_URI in .env)

### Configuration Files
- `.env.example` -- Template for environment variables
- `package.json` -- Node.js dependencies and scripts
- `tsconfig.json` -- TypeScript config for web app components

## Environment Setup

### Required .env Variables
```env
BOT_TOKEN=your_discord_bot_token
MONGODB_URI=your_mongodb_connection_string
```

### Generated Keys (use the working scripts)
```env
SOL_PRIVATE_KEY=[64,byte,array,from,solana-mnemonic-to-json.js]
BTC_WIF=output_from_generate-btc-testnet-key.js
```

## Validation Scenarios

### ALWAYS Test These After Changes
1. **Web App Validation:**
   - Run `cd justthetip---external-wallet-helper && npm run dev`
   - Navigate to http://localhost:5174/justthetipbot/
   - Verify page loads showing "JustTheTip" branding and "How It Works" sections
   - Test that "ADD BOT TO SERVER" buttons are visible

2. **Core Utilities Validation:**
   - Run `npm test test/core.test.js` 
   - Verify both input validation and logger tests pass

3. **Key Generation Validation:**
   - Run both key generation scripts
   - Verify they output properly formatted keys without errors

### Manual Testing Requirements
- **NEVER** try to run the main bot files (bot.js, bot_secure.js) as they are broken
- **ALWAYS** test web app functionality after making changes
- **ALWAYS** run core utility tests before committing changes

## Common Tasks

### Adding Dependencies
- Use `npm install <package>` -- always completes in under 60 seconds
- For web app: `cd justthetip---external-wallet-helper && npm install <package>`

### Debugging Broken Components
- bot.js: File ends abruptly, incomplete Discord bot implementation
- bot_secure.js: Missing chain service dependencies 
- Full test suite: Missing 'ethers' dependency for chains/ethereumService.js

### Working with Tests
- Only `test/core.test.js` works reliably
- `test/commandHandler.test.js` fails due to missing dependencies
- Add new tests to test/core.test.js or create similar isolated test files

## Build Times and Timeouts

### Always Use These Timeout Values
- `npm install` -- SET TIMEOUT: 60 seconds (actual: 42s)
- `npm test test/core.test.js` -- SET TIMEOUT: 30 seconds (actual: 1s)
- `npm run lint` -- SET TIMEOUT: 30 seconds (actual: 1s)
- Web app startup -- SET TIMEOUT: 30 seconds (actual: 2s)
- Key generation scripts -- SET TIMEOUT: 10 seconds (actual: 0.3s)

### Commands to NEVER CANCEL
- Any `npm install` command
- Web app dev server startup
- Working tests (they complete quickly)

## Critical Warnings

### File Status
- **bot.js**: INCOMPLETE - syntax error at end, do not attempt to run
- **bot_secure.js**: BROKEN IMPORTS - missing chain dependencies  
- **Web app**: FULLY FUNCTIONAL - always works, use for UI demonstrations
- **Tests**: MIXED - core tests work, integration tests fail

### Dependencies
- Main project: All npm dependencies install successfully
- Web app: Minimal dependencies, always installs cleanly
- Missing: 'ethers' package needed for some chain services

### Security
- All private keys are generated locally using working scripts
- No secrets are committed to repository
- Environment variables required for full functionality

## Troubleshooting

### If npm install fails
- Never experienced in testing, but if it occurs, check network connectivity

### If web app won't start
- Ensure you're in justthetip---external-wallet-helper/ directory
- Check that port 5174 is available
- Run `npm install` in that directory first

### If tests fail
- Only run `npm test test/core.test.js` for reliable testing
- Full test suite requires additional dependencies not currently installed

### If bot files error
- This is expected behavior - document in your changes but do not attempt to fix
- Use web app for demonstrating functionality instead