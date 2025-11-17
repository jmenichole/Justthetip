# Triviadrop & Random User Selection Features

## New Features Added

### 1. Triviadrop 🎯
Trivia-based airdrops where users answer questions to win prizes.

**Command:**
```
/triviadrop <total_amount> [rounds] [topic] [winners_per_round]
```

**Features:**
- Multiple rounds of trivia questions
- Topics: Crypto, General Knowledge, Science, Random
- Automatic winner selection from correct answers
- Auto-distribution of prizes to winners
- Leaderboard tracking
- Real-time question/answer collection

**Example:**
```
/triviadrop 10 3 crypto 2
```
Creates a 3-round crypto trivia game with $10 total prize pool, 2 winners per round.

**How it Works:**
1. Creator starts triviadrop with total prize pool
2. Bot announces game and starts first round after 5 seconds
3. Question displayed with 4 options (A, B, C, D)
4. Users have 30 seconds to answer by typing letter
5. Bot selects random winners from correct answers
6. Winners automatically receive their share of prize
7. Process repeats for all rounds
8. Final leaderboard shown at end

### 2. Random User Selection for Tips
Natural language commands to tip random users based on various criteria.

**Supported Commands:**
```
tip X active <amount>         - Tip X most active users
tip X lucky <amount>          - Tip X random lucky users
tip X gay <amount>            - Tip X random users (fun criterion)
tip X poor <amount>           - Tip X random users (fun criterion)
tip X rich <amount>           - Tip X random users (fun criterion)
tip X smart <amount>          - Tip X random users (fun criterion)
tip X cool <amount>           - Tip X random users (fun criterion)
tip X last Y messages <amount> - Tip X users from last Y messages
```

**Features:**
- Automatic user selection based on criteria
- Activity-based selection (recent message count)
- Random selection from server members
- Fun engagement criterions
- Message history-based selection
- Shows selected users before execution

**Examples:**
```
tip 5 active 0.5      - Tip 5 most active users $0.50 each
tip 3 lucky 1.0       - Tip 3 random lucky users $1.00 each
tip 2 last 50 messages 0.25  - Tip 2 users from last 50 messages $0.25 each
```

### 3. Airdrop Qualifier Gatekeeper (Premium Feature)
Advanced airdrop control with qualification criteria and auto-distribution.

**Premium Tiers:**
- **Basic ($9.99/month)**: 10 airdrops/month, 50 recipients, basic qualifiers
- **Pro ($29.99/month)**: 50 airdrops/month, 200 recipients, advanced qualifiers
- **Enterprise ($99.99/month)**: Unlimited airdrops, 1000 recipients, all qualifiers

**Qualifiers:**
- **Role**: Require specific Discord roles
- **Activity**: Minimum message count
- **Tenure**: Minimum days in server
- **Wallet Balance**: Require wallet with minimum balance
- **Random**: Probability-based selection

**Features:**
- Automatic qualification checking
- Auto-distribution to qualified users
- Premium tier validation
- Detailed distribution tracking
- Failed distribution handling

**How it Works:**
1. Creator sets up airdrop with qualifiers
2. Bot checks each user against criteria
3. Qualified users automatically receive distribution
4. Failed distributions tracked and reported
5. Full audit trail maintained

## Technical Implementation

### Services Created:

#### triviadropService.js
- `createTriviadrop()` - Initialize trivia game
- `startNextRound()` - Begin new round
- `submitAnswer()` - Record user answer
- `endRound()` - Process round completion, select winners
- `getTriviadropStatus()` - Get current status
- `getAllWinners()` - Get all winners from completed game
- `getLeaderboard()` - Get sorted participant rankings

#### randomUserService.js
- `selectActiveUsers()` - Select by activity
- `selectLuckyUsers()` - Random selection
- `selectFromLastMessages()` - Select from recent messages
- `parseRandomTipCommand()` - Parse natural language commands
- `selectRandomUsers()` - Main selection dispatcher

#### airdropQualifierService.js
- `createQualifiedAirdrop()` - Setup qualified airdrop
- `qualifyUsers()` - Check users against criteria
- `autoDistributeAirdrop()` - Distribute to qualified users
- `getQualifierStatus()` - Get distribution status
- `validatePremiumLimits()` - Check tier limits

### Command Handlers:

#### triviadropHandler.js
- Handles `/triviadrop` command
- Manages round timing and progression
- Collects answers from users
- Processes winner payments
- Shows results and leaderboard

### Integration:
- Added to `IMPROVED_SLASH_COMMANDS.js`
- Integrated into `bot_smart_contract.js`
- Natural language support in `naturalLanguageHandler.js`
- Rate limiting configured (2 per 10 minutes)

## Usage Examples

### Triviadrop:
```
User: /triviadrop 10 3 crypto 2

Bot: 🎯 Triviadrop Started!
     TestUser started a trivia game!
     💰 Total Prize Pool: $10.00 USD in SOL
     🎲 Topic: crypto
     🔢 Rounds: 3
     🏆 Winners per Round: 2
     💎 Prize per Winner: $1.6667 USD

     Get ready! Round 1 starts in 5 seconds...

[After 5 seconds]

Bot: ❓ Round 1/3
     Question: What is the maximum supply of Bitcoin?
     
     Options:
     A. 21 million
     B. 100 million
     C. 1 billion
     D. Unlimited
     
     ⏱️ You have 30 seconds to answer!
     Type the letter (A, B, C, or D) of your answer.

Users: A, A, B, A, C...

[After 30 seconds]

Bot: 🎯 Round 1 Results
     Question: What is the maximum supply of Bitcoin?
     Correct Answer: 21 million
     
     📊 Participants: 15
     🏆 Winners:
     • @User1 - $1.6667 USD
     • @User5 - $1.6667 USD
     
     ⏳ Next round starting in 5 seconds...
```

### Random Tips:
```
User: tip 5 active 0.5

Bot: 🎲 Random Tip Selection
     Criterion: active
     Selected: 5 users
     Amount per user: $0.50
     Total: $2.50
     
     Selected Users:
     • Alice
     • Bob
     • Charlie
     • Dave
     • Eve
     
     To complete this tip, use:
     `/tip @Alice 0.5`
     `/tip @Bob 0.5`
     [etc...]
```

### Qualified Airdrop:
```javascript
// Create qualified airdrop with role requirement
const airdrop = createQualifiedAirdrop({
  airdrop_id: 'airdrop_123',
  creator_id: 'user123',
  total_amount: 100,
  qualifiers: [
    {
      type: 'role',
      params: { required_roles: ['premium_member_role_id'] }
    },
    {
      type: 'activity',
      params: { min_messages: 10 }
    }
  ],
  auto_distribute: true,
  premium_tier: 'pro'
});

// Bot automatically:
// 1. Checks all users for premium_member role
// 2. Checks activity (10+ messages)
// 3. Distributes to qualified users
// 4. Reports results
```

## Benefits

### For Users:
- **Engagement**: Fun trivia games for rewards
- **Discovery**: Random tips help discover active community members
- **Inclusivity**: Fun criterions make tipping more engaging
- **Fair Selection**: Random selection prevents favoritism

### For Community Managers:
- **Premium Control**: Advanced qualification criteria
- **Automation**: Auto-distribution saves time
- **Analytics**: Track distribution and engagement
- **Monetization**: Premium tiers generate revenue

### For Bot Operators:
- **Engagement**: More interactive features
- **Revenue**: Premium tier subscriptions
- **Growth**: Unique features attract users
- **Flexibility**: Multiple selection methods

## Security & Safety

- All random selections are truly random (Math.random())
- Criteria like "gay", "poor", etc. are purely for fun - no actual evaluation
- Premium tier limits prevent abuse
- Auto-distribution includes error handling
- Full audit trails maintained
- DM notifications for winners
- Transaction verification before distribution

## Future Enhancements

- Custom trivia question uploads
- Trivia question API integration
- More qualification criteria
- Scheduled airdrops
- Recurring trivia games
- Tournament modes
- Team-based trivia
- Custom scoring systems
- Integration with external trivia databases
