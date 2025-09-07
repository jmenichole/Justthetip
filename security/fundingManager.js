const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

class FundingManager {
    constructor(connection) {
        this.connection = connection;
        this.minOperationalBalance = 0.1; // Minimum SOL to keep in hot wallet
        this.maxHotWalletBalance = 1.0;    // Maximum SOL in hot wallet
        this.lowBalanceThreshold = 0.05;   // Alert threshold
        
        // Treasury addresses (cold storage)
        this.treasuryWallet = process.env.TREASURY_WALLET;
        this.hotWallet = process.env.HOT_WALLET_ADDRESS;
        
        this.balanceAlerts = [];
    }

    async checkBalances() {
        try {
            const hotBalance = await this.getWalletBalance(this.hotWallet);
            const treasuryBalance = this.treasuryWallet ? 
                await this.getWalletBalance(this.treasuryWallet) : 0;

            const status = {
                hotWallet: {
                    address: this.hotWallet,
                    balance: hotBalance,
                    status: this.getBalanceStatus(hotBalance)
                },
                treasury: {
                    address: this.treasuryWallet,
                    balance: treasuryBalance,
                    status: 'cold_storage'
                },
                alerts: this.generateAlerts(hotBalance, treasuryBalance)
            };

            return status;
        } catch (error) {
            throw new Error(`Balance check failed: ${error.message}`);
        }
    }

    async getWalletBalance(address) {
        if (!address) return 0;
        
        try {
            const publicKey = new PublicKey(address);
            const balance = await this.connection.getBalance(publicKey);
            return balance / LAMPORTS_PER_SOL;
        } catch (error) {
            console.error(`Error getting balance for ${address}:`, error);
            return 0;
        }
    }

    getBalanceStatus(balance) {
        if (balance < this.lowBalanceThreshold) return 'critical';
        if (balance < this.minOperationalBalance) return 'low';
        if (balance > this.maxHotWalletBalance) return 'high';
        return 'normal';
    }

    generateAlerts(hotBalance, treasuryBalance) {
        const alerts = [];
        
        if (hotBalance < this.lowBalanceThreshold) {
            alerts.push({
                level: 'critical',
                message: `Hot wallet balance critically low: ${hotBalance} SOL`,
                action: 'immediate_funding_required'
            });
        }
        
        if (hotBalance < this.minOperationalBalance) {
            alerts.push({
                level: 'warning',
                message: `Hot wallet balance low: ${hotBalance} SOL`,
                action: 'consider_funding'
            });
        }
        
        if (hotBalance > this.maxHotWalletBalance) {
            alerts.push({
                level: 'info',
                message: `Hot wallet balance high: ${hotBalance} SOL`,
                action: 'consider_moving_to_treasury'
            });
        }

        if (!this.treasuryWallet) {
            alerts.push({
                level: 'warning',
                message: 'No treasury wallet configured',
                action: 'setup_cold_storage'
            });
        }

        return alerts;
    }

    async calculateMaxDailyExposure() {
        // Calculate maximum potential daily exposure based on current limits
        const riskManager = require('./riskManager');
        const rm = new riskManager.RiskManager();
        
        return {
            maxDailyTips: rm.limits.dailyTipLimit * rm.limits.maxDailyUsers,
            maxDailyWithdraws: rm.limits.dailyWithdrawLimit * rm.limits.maxDailyUsers,
            maxDailyAirdrops: rm.limits.dailyAirdropLimit * rm.limits.maxDailyUsers,
            
            totalMaxExposure: function() {
                return this.maxDailyTips + this.maxDailyWithdraws + this.maxDailyAirdrops;
            }
        };
    }

    async shouldProcessTransaction(amount, type) {
        const balanceStatus = await this.checkBalances();
        const hotBalance = balanceStatus.hotWallet.balance;
        
        // Block transactions if balance too low
        if (hotBalance < this.minOperationalBalance) {
            return {
                allow: false,
                reason: 'Insufficient operational funds'
            };
        }
        
        // Block large withdrawals if balance would drop too low
        if (type === 'withdraw' && (hotBalance - amount) < this.minOperationalBalance) {
            return {
                allow: false,
                reason: 'Transaction would compromise operational balance'
            };
        }
        
        return { allow: true };
    }

    generateFundingReport() {
        return {
            timestamp: new Date().toISOString(),
            recommendations: this.getFundingRecommendations(),
            riskAssessment: this.assessCurrentRisk(),
            operationalStatus: this.getOperationalStatus()
        };
    }

    getFundingRecommendations() {
        // Implementation for funding recommendations
        return [
            'Maintain minimum operational balance of 0.1 SOL',
            'Set up automated treasury transfers for balances > 1 SOL',
            'Monitor daily transaction patterns for funding needs'
        ];
    }

    assessCurrentRisk() {
        return {
            level: 'medium',
            factors: [
                'Hot wallet exposure limited to operational needs',
                'Cold storage not fully configured',
                'Transaction limits provide protection'
            ]
        };
    }

    getOperationalStatus() {
        return {
            status: 'operational',
            uptime: '99.9%',
            lastIncident: null
        };
    }
}

module.exports = { FundingManager };
