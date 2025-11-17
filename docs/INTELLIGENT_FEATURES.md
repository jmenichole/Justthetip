# Intelligent FAQ Bot & Natural Language Features

## Overview

JustTheTip now includes intelligent FAQ bot, natural language transaction processing, automated help, and automated report generation. These features make the bot more accessible and user-friendly by allowing natural conversation alongside traditional slash commands.

## Features

### 1. Intelligent FAQ Bot

The FAQ bot provides contextual answers to user questions using keyword-based search across a comprehensive knowledge base.

#### Usage

**Slash Command:**
```
/faq query:how do I create a wallet
/faq category:gettingStarted
/faq
```

**Natural Language (DM or mention):**
- "How do I tip someone?"
- "Is JustTheTip safe?"
- "What are the fees?"
- "How do I create a wallet?"

#### FAQ Categories

- **Getting Started**: Setup, wallet creation, first steps
- **Tipping & Transactions**: How to tip, airdrops, fees, troubleshooting
- **Wallet Management**: Balance checks, withdrawals, transaction history
- **Troubleshooting**: Common issues and solutions
- **Advanced Features**: Smart contracts, API integration, developer tools

#### Features

- Intelligent keyword matching
- Relevance scoring
- Related questions suggestions
- Random helpful tips
- Context-aware responses

### 2. Natural Language Transaction Processing

Process transactions using natural language instead of slash commands.

#### Supported Patterns

**Tipping:**
- "send 0.5 SOL to @user"
- "tip @user 1.5"
- "give $5 to @charlie"
- "transfer 2 dollars to @dave"

**Balance Checks:**
- "what's my balance?"
- "check my wallet"
- "how much SOL do I have?"
- "show my funds"

**Transaction History:**
- "show my transactions"
- "view logs for this week"
- "what did I send today?"
- "transaction history for this month"

**Airdrops:**
- "airdrop 0.1 to everyone"
- "everyone gets 0.5 SOL"
- "give everyone $2"

**Help Requests:**
- "help me with tipping"
- "how do I create a wallet?"
- "what is an airdrop?"

#### How It Works

1. User sends a natural language message via DM or mentions the bot
2. Bot analyzes the message to determine intent
3. Bot processes the request and provides appropriate response
4. For transactions, bot provides slash command confirmation for security

### 3. Automated Report Generation

Generate detailed transaction reports with statistics and analytics.

#### Usage

**Slash Command:**
```
/report period:this_week type:personal
/report period:this_month
/report
```

**Natural Language:**
- "generate my weekly report"
- "show stats for this month"
- "what are my transactions this week?"

#### Report Types

**Personal Reports:**
- Total transactions (sent/received)
- Financial summary (SOL sent/received, net change)
- Largest tip highlights
- Top interactions (most tipped user, top supporter)
- Available for all users

**Community Reports (Admin only):**
- Total community activity
- Active tippers count
- Total volume
- Average tip size
- Coming soon

#### Time Periods

- Today
- Yesterday
- This Week
- Last Week
- This Month
- Last Month

#### Report Contents

**Overview:**
- Total transaction count
- Sent vs. received breakdown

**Financial Summary:**
- Total SOL sent
- Total SOL received
- Net change

**Highlights:**
- Largest single tip
- Date of largest tip

**Top Interactions:**
- Most tipped user with total amount
- Top supporter with total amount

### 4. Automated Contextual Help

The bot provides context-aware help based on user actions and common issues.

#### Features

- **Intent Detection**: Automatically detects what users are trying to do
- **Smart Suggestions**: Provides relevant commands based on context
- **Error Guidance**: Helpful error messages with next steps
- **Random Tips**: Periodic helpful tips throughout interactions

#### Intent Types

- `faq`: User asking questions
- `balance_check`: Checking wallet balance
- `transaction`: Attempting to send tips
- `history`: Requesting transaction logs
- `airdrop`: Creating airdrops
- `report`: Generating reports
- `general`: General help needed

## Architecture

### Services

#### FAQ Service (`src/services/faqService.js`)

- **Knowledge Base**: JSON-based FAQ storage with categories
- **Search Algorithm**: Keyword matching with relevance scoring
- **Intent Analysis**: Determines user intent from queries
- **Category Browsing**: Organized FAQ navigation

#### Natural Language Service (`src/services/naturalLanguageService.js`)

- **Transaction Parser**: Extracts amount, currency, and recipient
- **Balance Parser**: Detects balance check requests
- **History Parser**: Processes transaction history requests
- **Airdrop Parser**: Identifies airdrop intents
- **Help Parser**: Recognizes help requests
- **Response Generator**: Creates human-friendly responses

#### Report Service (`src/services/reportService.js`)

- **Date Calculations**: Computes report periods
- **Transaction Filtering**: Filters by date range
- **Statistics Calculator**: Computes transaction stats
- **Report Generator**: Creates formatted report embeds
- **Automated Scheduling**: Schedule reports (future feature)

### Command Handlers

#### FAQ Handler (`src/commands/handlers/faqHandler.js`)

Processes `/faq` command with query and category options.

#### Report Handler (`src/commands/handlers/reportHandler.js`)

Processes `/report` command with period and type options.

#### Natural Language Handler (`src/commands/handlers/naturalLanguageHandler.js`)

Processes natural language messages from DMs and mentions.

## Testing

Comprehensive test coverage with 76 tests across all new features:

- **FAQ Service Tests**: 17 tests covering search, categorization, intent analysis
- **Natural Language Service Tests**: 38 tests covering all parsers and generators
- **Report Service Tests**: 21 tests covering date calculations, filtering, statistics

Run tests:
```bash
npm test -- --testPathPattern="faqService|naturalLanguageService|reportService"
```

## Security Considerations

1. **Transaction Verification**: Natural language transactions show confirmation message
2. **Slash Command Fallback**: Users must use slash commands for actual transactions
3. **Permission Checks**: Community reports restricted to admins/moderators
4. **Rate Limiting**: All commands subject to rate limits
5. **Input Validation**: All user inputs validated and sanitized

## Best Practices

### For Users

1. Use slash commands for critical transactions
2. Verify transaction details before confirming
3. Ask questions naturally - the bot understands
4. Generate reports regularly to track activity
5. Check FAQs before asking support

### For Developers

1. Keep FAQ knowledge base updated
2. Monitor natural language patterns for improvements
3. Add new intents as needed
4. Expand report metrics over time
5. Test thoroughly before deploying

## Future Enhancements

- **Machine Learning**: Improve intent detection with ML
- **Multi-language Support**: FAQs in multiple languages
- **Advanced Analytics**: More detailed reports and visualizations
- **Automated Insights**: Proactive helpful messages
- **Voice Commands**: Voice-based interactions (future)
- **Custom Reports**: User-defined report templates
- **Report Scheduling**: Automated periodic reports

## Examples

### Example 1: Getting Help

**User:** "How do I get started?"

**Bot:** Returns FAQ answer with:
- Step-by-step getting started guide
- Related questions
- Random helpful tip

### Example 2: Checking Balance

**User:** "what's my balance?"

**Bot:** Returns embed with:
- Current SOL balance
- Wallet address
- Helpful tip

### Example 3: Requesting Report

**User:** "/report period:this_week"

**Bot:** Returns report with:
- Transaction overview
- Financial summary
- Top interactions
- Highlights

### Example 4: Natural Language Tip

**User:** "send 0.5 SOL to @friend"

**Bot:** "I understood: Tip 0.5 SOL to @friend. To complete: `/tip @friend 0.5`"

## API Reference

### FAQ Service

```javascript
const { searchFAQ, getAllCategories, getFAQsByCategory, analyzeIntent } = require('./src/services/faqService');

// Search FAQs
const results = searchFAQ('how to tip');

// Get categories
const categories = getAllCategories();

// Get category FAQs
const categoryFAQs = getFAQsByCategory('gettingStarted');

// Analyze intent
const intent = analyzeIntent('what is my balance?');
```

### Natural Language Service

```javascript
const { processNaturalLanguage, parseTransactionIntent } = require('./src/services/naturalLanguageService');

// Process message
const intent = processNaturalLanguage('send 0.5 SOL to @user');

// Parse transaction
const tx = parseTransactionIntent('tip @user 1.5');
```

### Report Service

```javascript
const { generateUserReport, calculateDateRange } = require('./src/services/reportService');

// Generate report
const report = await generateUserReport(userId, transactions, 'this_week');

// Calculate date range
const range = calculateDateRange('this_month');
```

## Support

For issues or questions about these features:
- Use `/support` command
- Check the FAQ with `/faq`
- Ask naturally - the bot will help!
- Visit: https://github.com/jmenichole/Justthetip/issues

## License

Copyright (c) 2025 JustTheTip Bot. All rights reserved.
Licensed under the JustTheTip Custom License (Based on MIT).
