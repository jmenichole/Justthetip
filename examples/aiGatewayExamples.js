/**
 * AI Gateway Integration Examples for JustTheTip Bot
 * 
 * This file demonstrates practical implementations of AI Gateway use cases
 * for the JustTheTip Discord Solana tipping bot.
 * 
 * Prerequisites:
 * - npm install ai @ai-sdk/openai
 * - Set AI_GATEWAY_API_KEY in environment variables
 */

// Note: In production, install these packages:
// npm install ai @ai-sdk/openai

/**
 * Example 1: Intelligent FAQ Bot
 * Provides context-aware responses to user questions about the bot
 */
class AIFaqBot {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.botContext = {
            features: [
                'Solana (SOL) tipping between Discord users',
                'Automatic wallet creation for new users',
                'Airdrop functionality for mass distributions',
                'NFT minting and verification',
                'Transaction history tracking',
                'Wallet balance checking',
                'External wallet connections'
            ],
            commands: {
                '/tip': 'Tip SOL to another user',
                '/airdrop': 'Send SOL to multiple users at once',
                '/wallet': 'Check wallet balance and address',
                '/register-wallet': 'Connect external wallet',
                '/register-magic': 'Create embedded wallet via email'
            },
            security: [
                'AES-256-GCM encryption for private keys',
                'On-demand wallet creation',
                'Signature verification for transactions',
                'Rate limiting and fraud detection'
            ]
        };
    }

    async answerQuestion(question, userContext = {}) {
        try {
            // In production, use the actual AI SDK:
            // const { generateText } = require('ai');
            // const { openai } = require('@ai-sdk/openai');
            
            const prompt = `You are a helpful assistant for the JustTheTip Solana tipping bot on Discord.

Bot Features: ${JSON.stringify(this.botContext.features)}
Available Commands: ${JSON.stringify(this.botContext.commands)}
Security Features: ${JSON.stringify(this.botContext.security)}

User Context: ${JSON.stringify(userContext)}

User Question: ${question}

Provide a clear, concise, and helpful response. If the question is about a feature the bot doesn't have, politely explain and suggest alternatives. Keep responses under 300 words.`;

            // Example response structure (replace with actual AI call)
            console.log('AI Prompt:', prompt);
            
            // Simulated response for example purposes
            // In production, replace with actual AI Gateway call:
            /*
            const result = await generateText({
                model: openai('gpt-4-turbo'),
                apiKey: this.apiKey,
                prompt: prompt,
                maxTokens: 500,
                temperature: 0.7
            });
            
            return result.text;
            */
            
            return "This is a simulated response. In production, this would call the AI Gateway.";
        } catch (error) {
            console.error('FAQ Bot error:', error);
            throw new Error('Failed to generate response');
        }
    }
}

/**
 * Example 2: Natural Language Transaction Parser
 * Converts natural language to structured transaction data
 */
class NaturalLanguageTransactionParser {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async parseTransaction(naturalLanguageInput) {
        try {
            const prompt = `Parse this natural language transaction request into structured JSON.

Extract:
- intent: "tip" | "airdrop" | "send"
- amount: number (in SOL)
- recipients: array of recipient identifiers (usernames, IDs, or @mentions)
- message: optional message/note
- splitEqually: boolean (if amount should be split among recipients)

User Input: "${naturalLanguageInput}"

Return ONLY valid JSON, no other text. Example format:
{
  "intent": "tip",
  "amount": 5,
  "recipients": ["@user123"],
  "message": "great work",
  "splitEqually": false
}`;

            console.log('Transaction Parser Prompt:', prompt);
            
            // Simulated response for example
            // In production, replace with actual AI call:
            /*
            const result = await generateText({
                model: openai('gpt-4-turbo'),
                apiKey: this.apiKey,
                prompt: prompt,
                maxTokens: 200,
                temperature: 0.3 // Lower temperature for more consistent parsing
            });
            
            return JSON.parse(result.text);
            */
            
            // Example parsed output
            return {
                intent: "tip",
                amount: 5,
                recipients: ["@alice"],
                message: "for your amazing work",
                splitEqually: false
            };
        } catch (error) {
            console.error('Transaction parser error:', error);
            throw new Error('Failed to parse transaction');
        }
    }

    validateTransaction(parsedTransaction) {
        const errors = [];
        
        if (!parsedTransaction.intent || !['tip', 'airdrop', 'send'].includes(parsedTransaction.intent)) {
            errors.push('Invalid or missing intent');
        }
        
        if (!parsedTransaction.amount || parsedTransaction.amount <= 0) {
            errors.push('Invalid or missing amount');
        }
        
        if (!parsedTransaction.recipients || parsedTransaction.recipients.length === 0) {
            errors.push('No recipients specified');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

/**
 * Example 3: Transaction Insights Generator
 * Generates human-readable insights from transaction data
 */
class TransactionInsightsGenerator {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async generateUserInsights(userId, transactionHistory) {
        try {
            const stats = this.calculateStats(transactionHistory);
            
            const prompt = `Generate engaging, personalized insights for a user based on their tipping activity.

User Statistics:
- Total tipped: ${stats.totalTipped} SOL
- Total received: ${stats.totalReceived} SOL
- Number of tips sent: ${stats.tipsSent}
- Number of tips received: ${stats.tipsReceived}
- Most tipped user: ${stats.mostTippedUser}
- Largest tip sent: ${stats.largestTip} SOL
- Average tip amount: ${stats.averageTip} SOL
- Active days: ${stats.activeDays}
- Tipping streak: ${stats.currentStreak} days

Generate 2-3 interesting, positive insights about their tipping behavior. Be encouraging and highlight their positive contributions to the community. Keep it concise (under 200 words).`;

            console.log('Insights Generator Prompt:', prompt);
            
            // In production, call AI Gateway
            /*
            const result = await generateText({
                model: openai('gpt-4-turbo'),
                apiKey: this.apiKey,
                prompt: prompt,
                maxTokens: 300,
                temperature: 0.8 // Higher temperature for more creative insights
            });
            
            return result.text;
            */
            
            return "Simulated insights: You've been incredibly generous this month!";
        } catch (error) {
            console.error('Insights generator error:', error);
            throw new Error('Failed to generate insights');
        }
    }

    calculateStats(transactions) {
        // Calculate statistics from transaction history
        let totalTipped = 0;
        let totalReceived = 0;
        let tipsSent = 0;
        let tipsReceived = 0;
        let largestTip = 0;
        const userTips = {};
        const activeDaysSet = new Set();
        
        transactions.forEach(tx => {
            if (tx.type === 'sent') {
                totalTipped += tx.amount;
                tipsSent++;
                largestTip = Math.max(largestTip, tx.amount);
                userTips[tx.recipient] = (userTips[tx.recipient] || 0) + 1;
            } else if (tx.type === 'received') {
                totalReceived += tx.amount;
                tipsReceived++;
            }
            
            const date = new Date(tx.timestamp).toDateString();
            activeDaysSet.add(date);
        });
        
        const mostTippedUser = Object.keys(userTips).reduce((a, b) => 
            userTips[a] > userTips[b] ? a : b, 'N/A'
        );
        
        return {
            totalTipped: totalTipped.toFixed(2),
            totalReceived: totalReceived.toFixed(2),
            tipsSent,
            tipsReceived,
            mostTippedUser,
            largestTip: largestTip.toFixed(2),
            averageTip: tipsSent > 0 ? (totalTipped / tipsSent).toFixed(2) : 0,
            activeDays: activeDaysSet.size,
            currentStreak: this.calculateStreak(Array.from(activeDaysSet).sort())
        };
    }

    calculateStreak(sortedDates) {
        if (sortedDates.length === 0) return 0;
        
        let streak = 1;
        for (let i = sortedDates.length - 1; i > 0; i--) {
            const date1 = new Date(sortedDates[i]);
            const date2 = new Date(sortedDates[i - 1]);
            const diffDays = Math.floor((date1 - date2) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }
}

/**
 * Example 4: Content Moderation
 * Analyzes messages for inappropriate content, scams, or security risks
 */
class ContentModerator {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.knownScamPatterns = [
            'send me your seed phrase',
            'private key',
            'wallet recovery',
            'urgent: your account',
            'congratulations you won',
            'claim your free crypto'
        ];
    }

    async moderateMessage(message, context = {}) {
        try {
            // Quick pre-check for obvious scam patterns
            const quickCheck = this.quickModerationCheck(message);
            if (quickCheck.flagged) {
                return quickCheck;
            }
            
            const prompt = `Analyze this message for potential security risks, scams, or inappropriate content.

Message: "${message}"
Context: ${JSON.stringify(context)}

Check for:
1. Phishing attempts or social engineering
2. Requests for private keys, seed phrases, or passwords
3. Scam patterns (fake giveaways, impersonation)
4. Malicious links or wallet addresses
5. Inappropriate or offensive content
6. Spam or bot-like behavior

Return JSON with:
{
  "safe": boolean,
  "confidence": number (0-1),
  "reasons": array of strings,
  "severity": "low" | "medium" | "high" | "critical",
  "recommendedAction": "allow" | "flag" | "block"
}`;

            console.log('Content Moderation Prompt:', prompt);
            
            // In production, call AI Gateway
            /*
            const result = await generateText({
                model: openai('gpt-4-turbo'),
                apiKey: this.apiKey,
                prompt: prompt,
                maxTokens: 300,
                temperature: 0.1 // Very low temperature for consistent moderation
            });
            
            return JSON.parse(result.text);
            */
            
            return {
                safe: true,
                confidence: 0.95,
                reasons: [],
                severity: "low",
                recommendedAction: "allow"
            };
        } catch (error) {
            console.error('Content moderation error:', error);
            // Fail safely - when in doubt, flag for manual review
            return {
                safe: false,
                confidence: 0.5,
                reasons: ['Moderation service error'],
                severity: "medium",
                recommendedAction: "flag"
            };
        }
    }

    quickModerationCheck(message) {
        const lowerMessage = message.toLowerCase();
        
        for (const pattern of this.knownScamPatterns) {
            if (lowerMessage.includes(pattern)) {
                return {
                    safe: false,
                    confidence: 0.99,
                    reasons: [`Contains known scam pattern: "${pattern}"`],
                    severity: "critical",
                    recommendedAction: "block"
                };
            }
        }
        
        return { flagged: false };
    }
}

/**
 * Example 5: Multilingual Support
 * Translates bot responses and detects user language preferences
 */
class MultilingualSupport {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.supportedLanguages = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese (Simplified)',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ar': 'Arabic'
        };
    }

    async detectLanguage(text) {
        try {
            const prompt = `Detect the language of this text. Return only the ISO 639-1 language code (e.g., 'en', 'es', 'fr').

Text: "${text}"

Return only the 2-letter language code, nothing else.`;

            console.log('Language Detection Prompt:', prompt);
            
            // In production, call AI Gateway
            /*
            const result = await generateText({
                model: openai('gpt-3.5-turbo'), // Cheaper model is fine for this
                apiKey: this.apiKey,
                prompt: prompt,
                maxTokens: 10,
                temperature: 0.1
            });
            
            return result.text.trim().toLowerCase();
            */
            
            return 'en'; // Default to English
        } catch (error) {
            console.error('Language detection error:', error);
            return 'en';
        }
    }

    async translate(text, targetLanguage, context = '') {
        try {
            if (targetLanguage === 'en') {
                return text; // No translation needed
            }
            
            const prompt = `Translate the following text to ${this.supportedLanguages[targetLanguage] || targetLanguage}.

Context: This is a message from a Discord Solana tipping bot. ${context}

Text to translate: "${text}"

Return only the translated text, maintaining the original tone and meaning. Keep technical terms like "SOL", "wallet", "Discord" unchanged.`;

            console.log('Translation Prompt:', prompt);
            
            // In production, call AI Gateway
            /*
            const result = await generateText({
                model: openai('gpt-4-turbo'),
                apiKey: this.apiKey,
                prompt: prompt,
                maxTokens: 500,
                temperature: 0.3
            });
            
            return result.text;
            */
            
            return text; // Return original if translation fails
        } catch (error) {
            console.error('Translation error:', error);
            return text;
        }
    }
}

/**
 * Example 6: Smart Recommendations
 * Provides personalized recommendations for wallet security and usage
 */
class SmartRecommendations {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async generateRecommendations(userProfile, transactionHistory) {
        try {
            const riskFactors = this.analyzeRiskFactors(userProfile, transactionHistory);
            
            const prompt = `Generate 2-3 personalized security and usage recommendations for a Discord bot user.

User Profile:
- Account age: ${userProfile.accountAge} days
- Total transaction volume: ${riskFactors.totalVolume} SOL
- Largest single transaction: ${riskFactors.largestTransaction} SOL
- Transaction frequency: ${riskFactors.transactionFrequency} per day
- Wallet type: ${userProfile.walletType}
- Two-factor authentication: ${userProfile.has2FA ? 'Enabled' : 'Not enabled'}

Risk Factors:
${riskFactors.risks.map(r => `- ${r}`).join('\n')}

Generate actionable, friendly recommendations to improve their security and experience. Be specific and practical. Keep it under 250 words.`;

            console.log('Recommendations Prompt:', prompt);
            
            // In production, call AI Gateway
            /*
            const result = await generateText({
                model: openai('gpt-4-turbo'),
                apiKey: this.apiKey,
                prompt: prompt,
                maxTokens: 400,
                temperature: 0.7
            });
            
            return result.text;
            */
            
            return "Simulated recommendations based on your usage patterns.";
        } catch (error) {
            console.error('Recommendations error:', error);
            throw new Error('Failed to generate recommendations');
        }
    }

    analyzeRiskFactors(userProfile, transactions) {
        let totalVolume = 0;
        let largestTransaction = 0;
        const risks = [];
        
        transactions.forEach(tx => {
            totalVolume += tx.amount;
            largestTransaction = Math.max(largestTransaction, tx.amount);
        });
        
        const transactionFrequency = transactions.length / Math.max(userProfile.accountAge, 1);
        
        if (totalVolume > 100 && !userProfile.has2FA) {
            risks.push('High transaction volume without 2FA enabled');
        }
        
        if (largestTransaction > 50 && userProfile.walletType === 'custodial') {
            risks.push('Large transactions using custodial wallet');
        }
        
        if (transactionFrequency > 10) {
            risks.push('High frequency trading patterns detected');
        }
        
        return {
            totalVolume: totalVolume.toFixed(2),
            largestTransaction: largestTransaction.toFixed(2),
            transactionFrequency: transactionFrequency.toFixed(2),
            risks
        };
    }
}

/**
 * Example Usage in Discord Bot Commands
 */

// Example: Implementing /ask command
async function handleAskCommand(interaction, aiApiKey) {
    const question = interaction.options.getString('question');
    const faqBot = new AIFaqBot(aiApiKey);
    
    await interaction.deferReply();
    
    try {
        const userContext = {
            userId: interaction.user.id,
            username: interaction.user.username,
            memberSince: interaction.member?.joinedTimestamp
        };
        
        const answer = await faqBot.answerQuestion(question, userContext);
        
        await interaction.editReply({
            embeds: [{
                title: '🤖 AI Assistant',
                description: answer,
                color: 0x3498db,
                footer: {
                    text: 'Powered by Vercel AI Gateway'
                }
            }]
        });
    } catch (error) {
        await interaction.editReply({
            content: '❌ Sorry, I encountered an error processing your question. Please try again.',
            ephemeral: true
        });
    }
}

// Example: Natural language tip command
async function handleNaturalTipCommand(interaction, aiApiKey) {
    const naturalLanguage = interaction.options.getString('message');
    const parser = new NaturalLanguageTransactionParser(aiApiKey);
    
    await interaction.deferReply();
    
    try {
        const parsed = await parser.parseTransaction(naturalLanguage);
        const validation = parser.validateTransaction(parsed);
        
        if (!validation.valid) {
            return await interaction.editReply({
                content: `❌ Could not understand your request:\n${validation.errors.join('\n')}`,
                ephemeral: true
            });
        }
        
        // Show confirmation before executing
        await interaction.editReply({
            embeds: [{
                title: '✅ Transaction Parsed',
                fields: [
                    { name: 'Action', value: parsed.intent.toUpperCase(), inline: true },
                    { name: 'Amount', value: `${parsed.amount} SOL`, inline: true },
                    { name: 'Recipients', value: parsed.recipients.join(', '), inline: false },
                    { name: 'Message', value: parsed.message || 'None', inline: false }
                ],
                color: 0x2ecc71,
                footer: {
                    text: 'React with ✅ to confirm or ❌ to cancel'
                }
            }]
        });
        
        // Add reaction handlers for confirmation...
    } catch (error) {
        await interaction.editReply({
            content: '❌ Failed to parse transaction. Please try again or use standard commands.',
            ephemeral: true
        });
    }
}

// Example: Generate user insights
async function handleInsightsCommand(interaction, aiApiKey) {
    const insightsGenerator = new TransactionInsightsGenerator(aiApiKey);
    
    await interaction.deferReply();
    
    try {
        // Fetch user's transaction history from database
        const transactionHistory = []; // Get from database
        
        const insights = await insightsGenerator.generateUserInsights(
            interaction.user.id,
            transactionHistory
        );
        
        await interaction.editReply({
            embeds: [{
                title: '📊 Your Tipping Insights',
                description: insights,
                color: 0xe74c3c,
                footer: {
                    text: `Generated for ${interaction.user.username}`
                }
            }]
        });
    } catch (error) {
        await interaction.editReply({
            content: '❌ Failed to generate insights. Please try again later.',
            ephemeral: true
        });
    }
}

// Export all classes and example functions
module.exports = {
    AIFaqBot,
    NaturalLanguageTransactionParser,
    TransactionInsightsGenerator,
    ContentModerator,
    MultilingualSupport,
    SmartRecommendations,
    // Example command handlers
    handleAskCommand,
    handleNaturalTipCommand,
    handleInsightsCommand
};

/**
 * INSTALLATION INSTRUCTIONS:
 * 
 * 1. Install required dependencies:
 *    npm install ai @ai-sdk/openai
 * 
 * 2. Set environment variable:
 *    AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key
 * 
 * 3. Import in your Discord bot:
 *    const { AIFaqBot, NaturalLanguageTransactionParser } = require('./examples/aiGatewayExamples');
 * 
 * 4. Use in your commands:
 *    const faqBot = new AIFaqBot(process.env.AI_GATEWAY_API_KEY);
 *    const answer = await faqBot.answerQuestion("How do I tip someone?");
 * 
 * 5. Uncomment the actual AI SDK calls in production (marked with comments)
 */
