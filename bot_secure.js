const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Import security modules
const { RiskManager } = require('./security/riskManager');
const { WalletSecurity } = require('./security/walletSecurity');
const { FundingManager } = require('./security/fundingManager');

// Import existing modules
const { getSolBalance, sendSol } = require('./chains/solana');
const { getLtcBalance, sendLtc } = require('./chains/litecoin');
const { getBtcBalance, sendBtc } = require('./chains/bitcoin');
const { getBchBalance, sendBch } = require('./chains/bitcoincash');
const db = require('./db/database');

// Initialize security systems
const riskManager = new RiskManager();
const walletSecurity = new WalletSecurity();
const { Connection } = require('@solana/web3.js');
const connection = new Connection(process.env.SOL_RPC_URL || 'https://mainnet.helius-rpc.com');
const fundingManager = new FundingManager(connection);

// Security configuration
const SECURITY_CONFIG = {
    enableRiskManagement: process.env.ENABLE_RISK_MANAGEMENT === 'true',
    enableTransactionLogging: process.env.ENABLE_TRANSACTION_LOGGING === 'true',
    securityLevel: process.env.SECURITY_LEVEL || 'development',
    adminUserIds: (process.env.ADMIN_USER_IDS || '').split(','),
    emergencyShutdown: process.env.EMERGENCY_SHUTDOWN === 'true'
};

// In-memory airdrop state
const airdrops = {};

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('ready', async () => {
    console.log(`🟢 Logged in as ${client.user.tag}`);
    console.log(`🔒 Security Level: ${SECURITY_CONFIG.securityLevel}`);
    console.log(`🛡️ Risk Management: ${SECURITY_CONFIG.enableRiskManagement ? 'Enabled' : 'Disabled'}`);
    
    // Check funding status
    try {
        const fundingStatus = await fundingManager.checkBalances();
        console.log(`💰 Hot Wallet: ${fundingStatus.hotWallet.balance} SOL (${fundingStatus.hotWallet.status})`);
        
        if (fundingStatus.alerts.length > 0) {
            console.log('⚠️ Funding Alerts:');
            fundingStatus.alerts.forEach(alert => {
                console.log(`  - ${alert.level.toUpperCase()}: ${alert.message}`);
            });
        }
    } catch (error) {
        console.error('❌ Funding check failed:', error.message);
    }
});

// Security middleware
async function securityCheck(userId, action, amount, coinType = 'SOL') {
    if (SECURITY_CONFIG.emergencyShutdown) {
        return { allowed: false, reason: 'Emergency shutdown active' };
    }
    
    if (!SECURITY_CONFIG.enableRiskManagement) {
        return { allowed: true };
    }
    
    // Risk management check
    const riskCheck = riskManager.shouldBlock(userId, action, amount);
    if (riskCheck.block) {
        return { allowed: false, reason: riskCheck.reasons.join(', ') };
    }
    
    // Funding check for outgoing transactions
    if (['withdraw', 'tip'].includes(action)) {
        const fundingCheck = await fundingManager.shouldProcessTransaction(amount, action);
        if (!fundingCheck.allow) {
            return { allowed: false, reason: fundingCheck.reason };
        }
    }
    
    return { allowed: true };
}

// Log security events
function logSecurityEvent(userId, action, details) {
    if (SECURITY_CONFIG.enableTransactionLogging) {
        console.log(`🔒 Security Log: User ${userId} attempted ${action} - ${JSON.stringify(details)}`);
    }
}

client.on('messageCreate', async msg => {
    if (msg.author.bot) return;

    const [cmd, ...args] = msg.content.trim().split(/\s+/);

    // Admin commands
    if (cmd === '!admin' && SECURITY_CONFIG.adminUserIds.includes(msg.author.id)) {
        if (args[0] === 'status') {
            const fundingStatus = await fundingManager.checkBalances();
            const dailyReport = riskManager.getDailyReport();
            
            msg.reply({
                content: `**🔒 Security Status Report**\n` +
                    `**Hot Wallet:** ${fundingStatus.hotWallet.balance} SOL (${fundingStatus.hotWallet.status})\n` +
                    `**Daily Stats:** ${dailyReport.activeUsers} users, ${dailyReport.totalTips.toFixed(4)} SOL tipped\n` +
                    `**Risk Level:** ${fundingStatus.alerts.length > 0 ? 'Medium' : 'Low'}\n` +
                    `**Emergency Mode:** ${SECURITY_CONFIG.emergencyShutdown ? 'ON' : 'OFF'}`,
                ephemeral: true
            });
            return;
        }
        
        if (args[0] === 'emergency' && args[1] === 'shutdown') {
            SECURITY_CONFIG.emergencyShutdown = true;
            msg.reply('🚨 Emergency shutdown activated. All transactions blocked.');
            return;
        }
        
        if (args[0] === 'emergency' && args[1] === 'resume') {
            SECURITY_CONFIG.emergencyShutdown = false;
            msg.reply('✅ Emergency shutdown deactivated. Normal operations resumed.');
            return;
        }
    }

    if (cmd === '!help') {
        msg.reply(
            '**JustTheTip Bot Commands (Mainnet):**\n' +
            '`!balance` - Show your crypto balances\n' +
            '`!tip @user amount coin` - Tip a user (Max: 0.01 SOL)\n' +
            '`!registerwallet coin address` - Register your wallet address\n' +
            '`!withdraw address amount coin` - Withdraw to external wallet (Max: 0.01 SOL)\n' +
            '`!deposit` - Get deposit instructions\n' +
            '`!airdrop amount coin` - Create an airdrop (Max: 0.005 SOL)\n' +
            '`!collect` - Collect from available airdrops\n' +
            '`!limits` - Show your current transaction limits\n' +
            '`!help` - Show this help message\n\n' +
            '⚠️ **Mainnet Mode**: Real money transactions with security limits'
        );
        return;
    }

    if (cmd === '!limits') {
        const userId = msg.author.id;
        const userActivity = riskManager.userActivity.get(userId);
        const dailyUsed = userActivity ? userActivity.daily : { tips: 0, withdraws: 0, airdrops: 0 };
        
        msg.reply({
            content: `**🛡️ Your Security Limits (Daily)**\n` +
                `**Tips:** ${dailyUsed.tips?.toFixed(4) || 0} / ${riskManager.limits.dailyTipLimit} SOL\n` +
                `**Withdrawals:** ${dailyUsed.withdraws?.toFixed(4) || 0} / ${riskManager.limits.dailyWithdrawLimit} SOL\n` +
                `**Airdrops:** ${dailyUsed.airdrops?.toFixed(4) || 0} / ${riskManager.limits.dailyAirdropLimit} SOL\n\n` +
                `**Maximum Single Transaction:**\n` +
                `• Tip: ${riskManager.limits.maxTipAmount} SOL\n` +
                `• Withdraw: ${riskManager.limits.maxWithdrawAmount} SOL\n` +
                `• Airdrop: ${riskManager.limits.maxAirdropAmount} SOL`,
            ephemeral: true
        });
        return;
    }

    if (cmd === '!balance') {
        const userId = msg.author.id;
        const sol = db.getBalance(userId, 'SOL');
        const usdc = db.getBalance(userId, 'USDC');
        const ltc = db.getBalance(userId, 'LTC');
        const btc = db.getBalance(userId, 'BTC');
        const bch = db.getBalance(userId, 'BCH');
        
        try {
            await msg.author.send(
                `💰 **Your Mainnet Balances:**\n` +
                `• Solana: ${sol} SOL\n` +
                `• USDC: ${usdc} USDC\n` +
                `• Litecoin: ${ltc} LTC\n` +
                `• Bitcoin: ${btc} BTC\n` +
                `• Bitcoin Cash: ${bch} BCH\n\n` +
                `⚠️ **Real money values** - Trade responsibly!`
            );
            msg.reply('📨 Balance sent via DM for security');
        } catch {
            msg.reply('❌ I could not send you a DM. Please check your privacy settings.');
        }
        return;
    }

    if (cmd === '!tip') {
        if (args.length !== 3) {
            msg.reply('❌ Usage: `!tip @user amount coin` (Max: 0.01 SOL per transaction)');
            return;
        }
        
        const [mention, amountStr, coin] = args;
        const coinU = coin.toUpperCase();
        const amount = parseFloat(amountStr);
        const userId = msg.author.id;
        
        // Validate amount
        if (isNaN(amount) || amount <= 0) {
            msg.reply('❌ Invalid amount');
            return;
        }
        
        // Security check
        const secCheck = await securityCheck(userId, 'tip', amount, coinU);
        if (!secCheck.allowed) {
            msg.reply(`🛡️ Transaction blocked: ${secCheck.reason}`);
            logSecurityEvent(userId, 'tip_blocked', { amount, coin: coinU, reason: secCheck.reason });
            return;
        }
        
        // Address validation
        if (!walletSecurity.validateAddress(mention.replace(/[<@!>]/g, ''))) {
            // Continue with user mention validation...
        }
        
        // Process tip (existing logic with security logging)
        try {
            // ... existing tip logic ...
            riskManager.recordTransaction(userId, 'tip', amount, true);
            logSecurityEvent(userId, 'tip_success', { amount, coin: coinU });
        } catch (error) {
            riskManager.recordTransaction(userId, 'tip', amount, false);
            logSecurityEvent(userId, 'tip_failed', { amount, coin: coinU, error: error.message });
            msg.reply(`❌ Transaction failed: ${error.message}`);
        }
        return;
    }

    // Continue with other commands...
    // (Similar security integration for withdraw, airdrop, etc.)
});

// Handle slash commands with security
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const userId = interaction.user.id;
    
    if (interaction.commandName === 'help') {
        await interaction.reply({
            content: '**JustTheTip Bot Commands (Mainnet Secured):**\n' +
                '`/balance` - Show your crypto balances\n' +
                '`/tip @user amount coin` - Tip a user (Max: 0.01 SOL)\n' +
                '`/limits` - Show your transaction limits\n' +
                '`/help` - Show this help message\n\n' +
                '🔒 **Security**: Real money transactions with fraud protection',
            ephemeral: true
        });
    }

    if (interaction.commandName === 'balance') {
        const sol = db.getBalance(userId, 'SOL');
        const ltc = db.getBalance(userId, 'LTC');
        
        await interaction.reply({
            content: `💰 **Your Balances:**\n• Solana: ${sol} SOL\n• Litecoin: ${ltc} LTC\n\n⚠️ Mainnet values`,
            ephemeral: true
        });
    }
});

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('🚨 Unhandled promise rejection:', error);
    logSecurityEvent('system', 'unhandled_error', { error: error.message });
});

client.login(process.env.BOT_TOKEN);
