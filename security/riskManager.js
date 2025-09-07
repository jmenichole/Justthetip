const fs = require('fs');
const path = require('path');

class RiskManager {
    constructor() {
        this.limits = {
            // Daily limits per user (in SOL)
            dailyTipLimit: 0.1,
            dailyWithdrawLimit: 0.05,
            dailyAirdropLimit: 0.02,
            
            // Maximum single transaction limits
            maxTipAmount: 0.01,
            maxWithdrawAmount: 0.01,
            maxAirdropAmount: 0.005,
            
            // Minimum balances
            minBalanceForTip: 0.001,
            minBalanceForWithdraw: 0.002,
            
            // Rate limiting (cooldowns in minutes)
            tipCooldown: 5,
            withdrawCooldown: 60,
            airdropCooldown: 120,
            
            // Security thresholds
            maxDailyUsers: 50,
            suspiciousActivityThreshold: 10
        };
        
        this.userActivity = new Map();
        this.dailyStats = {
            date: new Date().toDateString(),
            totalTips: 0,
            totalWithdraws: 0,
            totalAirdrops: 0,
            activeUsers: new Set()
        };
    }

    checkTransactionLimits(userId, type, amount) {
        const today = new Date().toDateString();
        
        // Reset daily stats if new day
        if (this.dailyStats.date !== today) {
            this.resetDailyStats();
        }
        
        // Get user activity
        if (!this.userActivity.has(userId)) {
            this.userActivity.set(userId, {
                daily: { date: today, tips: 0, withdraws: 0, airdrops: 0 },
                lastActivity: { tip: 0, withdraw: 0, airdrop: 0 },
                riskScore: 0
            });
        }
        
        const user = this.userActivity.get(userId);
        
        // Reset user daily if new day
        if (user.daily.date !== today) {
            user.daily = { date: today, tips: 0, withdraws: 0, airdrops: 0 };
        }
        
        const checks = {
            valid: true,
            reasons: []
        };
        
        // Amount limits
        const maxAmount = this.limits[`max${type.charAt(0).toUpperCase() + type.slice(1)}Amount`];
        if (amount > maxAmount) {
            checks.valid = false;
            checks.reasons.push(`Amount exceeds maximum ${type} limit of ${maxAmount} SOL`);
        }
        
        // Daily limits
        const dailyLimit = this.limits[`daily${type.charAt(0).toUpperCase() + type.slice(1)}Limit`];
        const currentDaily = user.daily[type + 's'] || 0;
        if (currentDaily + amount > dailyLimit) {
            checks.valid = false;
            checks.reasons.push(`Daily ${type} limit exceeded (${dailyLimit} SOL)`);
        }
        
        // Cooldown checks
        const cooldownKey = `${type}Cooldown`;
        const lastActivity = user.lastActivity[type];
        const cooldownMs = this.limits[cooldownKey] * 60 * 1000;
        if (Date.now() - lastActivity < cooldownMs) {
            checks.valid = false;
            checks.reasons.push(`${type} cooldown active (${this.limits[cooldownKey]} minutes)`);
        }
        
        return checks;
    }

    recordTransaction(userId, type, amount, success = true) {
        const user = this.userActivity.get(userId);
        if (user && success) {
            user.daily[type + 's'] += amount;
            user.lastActivity[type] = Date.now();
            
            // Update daily stats
            this.dailyStats[`total${type.charAt(0).toUpperCase() + type.slice(1)}s`] += amount;
            this.dailyStats.activeUsers.add(userId);
            
            // Log for monitoring
            this.logTransaction(userId, type, amount);
        }
    }

    calculateRiskScore(userId) {
        const user = this.userActivity.get(userId);
        if (!user) return 0;
        
        let score = 0;
        
        // High frequency activity
        const totalDaily = user.daily.tips + user.daily.withdraws + user.daily.airdrops;
        if (totalDaily > 5) score += 3;
        
        // Large amounts
        if (user.daily.withdraws > 0.02) score += 2;
        if (user.daily.tips > 0.05) score += 1;
        
        // Rapid succession
        const now = Date.now();
        const recentActivity = Object.values(user.lastActivity)
            .filter(time => now - time < 300000); // 5 minutes
        if (recentActivity.length > 2) score += 2;
        
        user.riskScore = score;
        return score;
    }

    shouldBlock(userId, type, amount) {
        const limits = this.checkTransactionLimits(userId, type, amount);
        if (!limits.valid) return { block: true, reasons: limits.reasons };
        
        const riskScore = this.calculateRiskScore(userId);
        if (riskScore > this.limits.suspiciousActivityThreshold) {
            return { 
                block: true, 
                reasons: [`High risk score: ${riskScore}. Manual review required.`] 
            };
        }
        
        return { block: false, reasons: [] };
    }

    logTransaction(userId, type, amount) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            userId,
            type,
            amount,
            riskScore: this.calculateRiskScore(userId)
        };
        
        const logPath = path.join(__dirname, '../logs/transactions.log');
        try {
            fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('Logging error:', error);
        }
    }

    resetDailyStats() {
        this.dailyStats = {
            date: new Date().toDateString(),
            totalTips: 0,
            totalWithdraws: 0,
            totalAirdrops: 0,
            activeUsers: new Set()
        };
    }

    getDailyReport() {
        return {
            ...this.dailyStats,
            activeUsers: this.dailyStats.activeUsers.size,
            highRiskUsers: Array.from(this.userActivity.entries())
                .filter(([_, user]) => user.riskScore > 5)
                .map(([userId, user]) => ({ userId, riskScore: user.riskScore }))
        };
    }
}

module.exports = { RiskManager };
