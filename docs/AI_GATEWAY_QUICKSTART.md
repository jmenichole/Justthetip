# AI Gateway Quick Start Guide

This guide helps you quickly integrate Vercel AI Gateway features into the JustTheTip Discord bot.

## Prerequisites

1. **Vercel AI Gateway API Key**
   - Sign up at https://vercel.com
   - Navigate to your project settings
   - Go to AI Gateway section
   - Create an API key
   - Add to `.env`: `AI_GATEWAY_API_KEY=your_key_here`

2. **Install AI SDK Dependencies**
   ```bash
   npm install ai @ai-sdk/openai
   ```

## Quick Implementation: FAQ Bot (5 minutes)

### Step 1: Create AI Helper Utility

Create `/src/utils/aiHelper.js`:

```javascript
const { generateText } = require('ai');
const { openai } = require('@ai-sdk/openai');

class AIHelper {
    constructor() {
        this.apiKey = process.env.AI_GATEWAY_API_KEY;
        if (!this.apiKey) {
            console.warn('⚠️  AI_GATEWAY_API_KEY not set - AI features disabled');
        }
    }

    isEnabled() {
        return Boolean(this.apiKey);
    }

    async generateResponse(prompt, options = {}) {
        if (!this.isEnabled()) {
            throw new Error('AI Gateway not configured');
        }

        try {
            const result = await generateText({
                model: openai(options.model || 'gpt-4-turbo'),
                apiKey: this.apiKey,
                prompt: prompt,
                maxTokens: options.maxTokens || 500,
                temperature: options.temperature || 0.7
            });

            return result.text;
        } catch (error) {
            console.error('AI Gateway error:', error);
            throw error;
        }
    }
}

module.exports = new AIHelper();
```

### Step 2: Add FAQ Command

Add to your Discord bot commands (e.g., `/src/commands/ask.js`):

```javascript
const { SlashCommandBuilder } = require('discord.js');
const aiHelper = require('../utils/aiHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask the AI assistant a question about the bot')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Your question')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!aiHelper.isEnabled()) {
            return interaction.reply({
                content: '❌ AI assistant is not configured.',
                ephemeral: true
            });
        }

        const question = interaction.options.getString('question');
        await interaction.deferReply();

        try {
            const botContext = `You are a helpful assistant for JustTheTip, a Discord bot for Solana (SOL) tipping.

Key Features:
- /tip @user <amount> - Tip SOL to another user
- /airdrop @user <amount> - Mass distribution of SOL
- /wallet - Check balance and wallet address
- /register-wallet - Connect external Solana wallet

The bot creates wallets automatically, uses AES-256-GCM encryption, and supports Phantom, Solflare, and other Solana wallets.

User Question: ${question}

Provide a helpful, concise answer (under 300 words). If asked about features we don't have, explain what we do offer.`;

            const answer = await aiHelper.generateResponse(botContext, {
                maxTokens: 400
            });

            await interaction.editReply({
                embeds: [{
                    title: '🤖 AI Assistant',
                    description: answer,
                    color: 0x3498db,
                    footer: { text: 'Powered by Vercel AI Gateway' }
                }]
            });

        } catch (error) {
            console.error('Ask command error:', error);
            await interaction.editReply({
                content: '❌ Sorry, I encountered an error. Please try again.',
                ephemeral: true
            });
        }
    }
};
```

### Step 3: Register the Command

In your main bot file (`bot_smart_contract.js`):

```javascript
// Import the new command
const askCommand = require('./src/commands/ask');

// Add to your commands collection
client.commands.set(askCommand.data.name, askCommand);

// Handle interactions (if not already done)
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: 'There was an error executing this command!',
            ephemeral: true
        });
    }
});
```

### Step 4: Deploy Command to Discord

```bash
npm run register-commands
# or
node register-commands.js
```

### Step 5: Test

1. Start your bot: `npm run start:bot`
2. In Discord, type: `/ask How do I tip someone?`
3. See the AI-powered response!

## Quick Implementation: Natural Language Tips (10 minutes)

### Step 1: Add Natural Language Command

Create `/src/commands/say-tip.js`:

```javascript
const { SlashCommandBuilder } = require('discord.js');
const aiHelper = require('../utils/aiHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say-tip')
        .setDescription('Tip using natural language')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('E.g., "Send 5 SOL to @alice for her great work"')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!aiHelper.isEnabled()) {
            return interaction.reply({
                content: '❌ Natural language parsing requires AI Gateway configuration.',
                ephemeral: true
            });
        }

        const naturalLanguage = interaction.options.getString('message');
        await interaction.deferReply();

        try {
            // Parse the natural language input
            const parsePrompt = `Parse this tip request into JSON format.

Extract:
- amount: number (in SOL)
- recipient: Discord user mention or ID (keep the @mention format)
- message: optional note/reason

Input: "${naturalLanguage}"

Return ONLY valid JSON:
{
  "amount": 5,
  "recipient": "@username",
  "message": "reason for tip"
}

If you cannot parse the request, return:
{
  "error": "explanation of what's unclear"
}`;

            const jsonResponse = await aiHelper.generateResponse(parsePrompt, {
                model: 'gpt-4-turbo',
                maxTokens: 200,
                temperature: 0.3
            });

            // Parse AI response
            const parsed = JSON.parse(jsonResponse);

            if (parsed.error) {
                return await interaction.editReply({
                    content: `❌ Could not understand: ${parsed.error}\n\nTry: "Send 5 SOL to @user for great work"`,
                    ephemeral: true
                });
            }

            // Show confirmation
            await interaction.editReply({
                embeds: [{
                    title: '✅ Transaction Parsed',
                    fields: [
                        { name: 'Amount', value: `${parsed.amount} SOL`, inline: true },
                        { name: 'Recipient', value: parsed.recipient, inline: true },
                        { name: 'Message', value: parsed.message || 'None', inline: false }
                    ],
                    description: 'Use `/tip` command to execute this transaction.',
                    color: 0x2ecc71
                }]
            });

            // In a full implementation, you would:
            // 1. Validate the recipient exists
            // 2. Check sender's balance
            // 3. Add confirmation buttons
            // 4. Execute the transaction

        } catch (error) {
            console.error('Say-tip command error:', error);
            await interaction.editReply({
                content: '❌ Failed to parse. Use standard `/tip` command instead.',
                ephemeral: true
            });
        }
    }
};
```

### Step 2: Register and Test

```bash
node register-commands.js
npm run start:bot
```

In Discord: `/say-tip message: Send 5 SOL to @friend for helping me`

## Monitoring and Cost Management

### Add Usage Tracking

Create `/src/utils/aiUsageTracker.js`:

```javascript
const fs = require('fs');
const path = require('path');

class AIUsageTracker {
    constructor() {
        this.logPath = path.join(__dirname, '../../logs/ai-usage.json');
        this.ensureLogFile();
    }

    ensureLogFile() {
        const dir = path.dirname(this.logPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.logPath)) {
            fs.writeFileSync(this.logPath, JSON.stringify([], null, 2));
        }
    }

    log(entry) {
        try {
            const logs = JSON.parse(fs.readFileSync(this.logPath, 'utf8'));
            logs.push({
                timestamp: new Date().toISOString(),
                ...entry
            });
            
            // Keep only last 1000 entries
            if (logs.length > 1000) {
                logs.shift();
            }
            
            fs.writeFileSync(this.logPath, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('Failed to log AI usage:', error);
        }
    }

    async trackRequest(type, model, tokensUsed, userId) {
        this.log({
            type,
            model,
            tokensUsed,
            userId
        });
    }

    getUsageStats(days = 7) {
        try {
            const logs = JSON.parse(fs.readFileSync(this.logPath, 'utf8'));
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);

            const recentLogs = logs.filter(log => 
                new Date(log.timestamp) > cutoff
            );

            return {
                totalRequests: recentLogs.length,
                byType: this.groupBy(recentLogs, 'type'),
                byModel: this.groupBy(recentLogs, 'model'),
                totalTokens: recentLogs.reduce((sum, log) => 
                    sum + (log.tokensUsed || 0), 0
                ),
                uniqueUsers: new Set(recentLogs.map(log => log.userId)).size
            };
        } catch (error) {
            console.error('Failed to get usage stats:', error);
            return null;
        }
    }

    groupBy(array, key) {
        return array.reduce((result, item) => {
            const value = item[key];
            result[value] = (result[value] || 0) + 1;
            return result;
        }, {});
    }
}

module.exports = new AIUsageTracker();
```

### Add Stats Command

```javascript
// /src/commands/ai-stats.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const aiUsageTracker = require('../utils/aiUsageTracker');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai-stats')
        .setDescription('View AI usage statistics (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const stats = aiUsageTracker.getUsageStats(7);

        if (!stats) {
            return await interaction.editReply({
                content: '❌ Failed to retrieve statistics.'
            });
        }

        const embed = {
            title: '📊 AI Gateway Usage (Last 7 Days)',
            fields: [
                {
                    name: 'Total Requests',
                    value: stats.totalRequests.toString(),
                    inline: true
                },
                {
                    name: 'Unique Users',
                    value: stats.uniqueUsers.toString(),
                    inline: true
                },
                {
                    name: 'Total Tokens',
                    value: stats.totalTokens.toLocaleString(),
                    inline: true
                },
                {
                    name: 'Requests by Type',
                    value: Object.entries(stats.byType)
                        .map(([type, count]) => `${type}: ${count}`)
                        .join('\n') || 'None',
                    inline: false
                }
            ],
            color: 0x9b59b6,
            footer: {
                text: 'Powered by Vercel AI Gateway'
            }
        };

        await interaction.editReply({ embeds: [embed] });
    }
};
```

## Best Practices

### 1. Error Handling

Always handle AI failures gracefully:

```javascript
try {
    const response = await aiHelper.generateResponse(prompt);
    // Use response
} catch (error) {
    console.error('AI error:', error);
    // Fallback to standard behavior
    return "I'm having trouble right now. Try using /help instead.";
}
```

### 2. Rate Limiting

Prevent abuse with rate limiting:

```javascript
const rateLimits = new Map();

function checkRateLimit(userId, maxPerHour = 10) {
    const now = Date.now();
    const userLimit = rateLimits.get(userId) || { count: 0, resetTime: now + 3600000 };
    
    if (now > userLimit.resetTime) {
        rateLimits.set(userId, { count: 1, resetTime: now + 3600000 });
        return true;
    }
    
    if (userLimit.count >= maxPerHour) {
        return false;
    }
    
    userLimit.count++;
    return true;
}
```

### 3. Caching Common Responses

Cache frequently asked questions:

```javascript
const responseCache = new Map();

async function getCachedResponse(question) {
    const cacheKey = question.toLowerCase().trim();
    
    if (responseCache.has(cacheKey)) {
        const cached = responseCache.get(cacheKey);
        // Cache for 1 hour
        if (Date.now() - cached.timestamp < 3600000) {
            return cached.response;
        }
    }
    
    const response = await aiHelper.generateResponse(question);
    responseCache.set(cacheKey, {
        response,
        timestamp: Date.now()
    });
    
    return response;
}
```

### 4. Cost Optimization

Use appropriate models for different tasks:

```javascript
// Cheap and fast for simple tasks
const simpleResponse = await aiHelper.generateResponse(prompt, {
    model: 'gpt-3.5-turbo',  // Cheaper
    maxTokens: 150
});

// More powerful for complex tasks
const complexResponse = await aiHelper.generateResponse(prompt, {
    model: 'gpt-4-turbo',  // More expensive but more capable
    maxTokens: 500
});
```

## Testing

### Test AI Helper

```javascript
// test/aiHelper.test.js
const aiHelper = require('../src/utils/aiHelper');

describe('AI Helper', () => {
    test('should be enabled with API key', () => {
        expect(aiHelper.isEnabled()).toBe(process.env.AI_GATEWAY_API_KEY ? true : false);
    });

    test('should generate response', async () => {
        if (!aiHelper.isEnabled()) {
            console.log('Skipping - AI Gateway not configured');
            return;
        }

        const response = await aiHelper.generateResponse('Say hello');
        expect(response).toBeTruthy();
        expect(typeof response).toBe('string');
    }, 10000); // 10s timeout for AI call
});
```

## Next Steps

1. **Implement More Use Cases**
   - See `/docs/AI_GATEWAY_USE_CASES.md` for ideas
   - Start with high-value features like FAQ bot

2. **Monitor Usage**
   - Check Vercel dashboard for costs
   - Review logs for patterns
   - Optimize based on usage

3. **Gather Feedback**
   - Ask users what features they want
   - Test with beta users first
   - Iterate based on real usage

4. **Scale Gradually**
   - Start with one feature
   - Monitor performance and costs
   - Add features incrementally

## Troubleshooting

### "AI Gateway not configured"
- Check `.env` has `AI_GATEWAY_API_KEY`
- Verify key is correct in Vercel dashboard
- Restart bot after adding key

### High Costs
- Use GPT-3.5 for simple tasks
- Implement caching
- Add rate limiting
- Monitor usage with `/ai-stats`

### Slow Responses
- Reduce `maxTokens`
- Use `deferReply()` in Discord
- Consider streaming responses
- Use faster models for simple tasks

### Inaccurate Responses
- Improve prompts with more context
- Use higher temperature for creativity
- Use lower temperature for consistency
- Add validation of AI outputs

## Resources

- [Vercel AI Gateway Docs](https://vercel.com/docs/ai-gateway)
- [Vercel AI SDK](https://ai-sdk.dev/)
- [Discord.js Guide](https://discordjs.guide/)
- [Full Use Cases](./AI_GATEWAY_USE_CASES.md)
- [Code Examples](../examples/aiGatewayExamples.js)

---

**Need Help?** Check the full documentation or open an issue on GitHub.
