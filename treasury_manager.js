const { Connection, PublicKey, Transaction, SystemProgram, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
require('dotenv').config();

class TreasuryManager {
    constructor() {
        this.connection = new Connection(process.env.SOL_RPC_URL);
        this.hotWalletAddress = process.env.HOT_WALLET_ADDRESS;
        this.treasuryAddress = process.env.TREASURY_WALLET;
        
        // Load treasury keypair
        const treasuryConfig = JSON.parse(fs.readFileSync('./.security/treasury.json', 'utf8'));
        this.treasuryKeypair = Keypair.fromSecretKey(Uint8Array.from(treasuryConfig.privateKey));
        
        // Load hot wallet keypair
        const hotWalletSecret = Uint8Array.from(JSON.parse(process.env.SOL_PRIVATE_KEY));
        this.hotWalletKeypair = Keypair.fromSecretKey(hotWalletSecret);
        
        this.maxHotWalletBalance = 1.0; // SOL
        this.minHotWalletBalance = 0.1; // SOL
    }

    async getBalances() {
        const hotBalance = await this.getBalance(this.hotWalletAddress);
        const treasuryBalance = await this.getBalance(this.treasuryAddress);
        
        return {
            hotWallet: {
                address: this.hotWalletAddress,
                balance: hotBalance
            },
            treasury: {
                address: this.treasuryAddress,
                balance: treasuryBalance
            },
            total: hotBalance + treasuryBalance
        };
    }

    async getBalance(address) {
        try {
            const publicKey = new PublicKey(address);
            const balance = await this.connection.getBalance(publicKey);
            return balance / LAMPORTS_PER_SOL;
        } catch (error) {
            console.error(`Error getting balance for ${address}:`, error);
            return 0;
        }
    }

    async transferToTreasury(amount) {
        try {
            console.log(`🏦 Transferring ${amount} SOL to treasury...`);
            
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: this.hotWalletKeypair.publicKey,
                    toPubkey: this.treasuryKeypair.publicKey,
                    lamports: amount * LAMPORTS_PER_SOL
                })
            );

            const signature = await this.connection.sendTransaction(transaction, [this.hotWalletKeypair]);
            await this.connection.confirmTransaction(signature);
            
            console.log(`✅ Transfer successful: ${signature}`);
            return signature;
        } catch (error) {
            console.error(`❌ Transfer failed: ${error.message}`);
            throw error;
        }
    }

    async transferFromTreasury(amount) {
        try {
            console.log(`💰 Transferring ${amount} SOL from treasury to hot wallet...`);
            
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: this.treasuryKeypair.publicKey,
                    toPubkey: this.hotWalletKeypair.publicKey,
                    lamports: amount * LAMPORTS_PER_SOL
                })
            );

            const signature = await this.connection.sendTransaction(transaction, [this.treasuryKeypair]);
            await this.connection.confirmTransaction(signature);
            
            console.log(`✅ Transfer successful: ${signature}`);
            return signature;
        } catch (error) {
            console.error(`❌ Transfer failed: ${error.message}`);
            throw error;
        }
    }

    async autoRebalance() {
        const balances = await this.getBalances();
        const hotBalance = balances.hotWallet.balance;
        
        console.log(`🔄 Auto-rebalancing...`);
        console.log(`Hot wallet: ${hotBalance} SOL`);
        console.log(`Treasury: ${balances.treasury.balance} SOL`);
        
        if (hotBalance > this.maxHotWalletBalance) {
            const excessAmount = hotBalance - this.minHotWalletBalance;
            console.log(`⬆️ Moving ${excessAmount} SOL to treasury (excess funds)`);
            return await this.transferToTreasury(excessAmount);
        }
        
        if (hotBalance < this.minHotWalletBalance && balances.treasury.balance > 0) {
            const neededAmount = this.minHotWalletBalance - hotBalance + 0.05; // Add buffer
            const transferAmount = Math.min(neededAmount, balances.treasury.balance);
            console.log(`⬇️ Moving ${transferAmount} SOL from treasury (low hot wallet)`);
            return await this.transferFromTreasury(transferAmount);
        }
        
        console.log(`✅ Balances are optimal`);
        return null;
    }

    async getSecurityReport() {
        const balances = await this.getBalances();
        
        return {
            timestamp: new Date().toISOString(),
            balances,
            security: {
                hotWalletExposure: (balances.hotWallet.balance / balances.total * 100).toFixed(1) + '%',
                treasuryProtection: (balances.treasury.balance / balances.total * 100).toFixed(1) + '%',
                riskLevel: balances.hotWallet.balance > this.maxHotWalletBalance ? 'HIGH' : 'LOW'
            },
            recommendations: this.getRecommendations(balances)
        };
    }

    getRecommendations(balances) {
        const recommendations = [];
        
        if (balances.hotWallet.balance > this.maxHotWalletBalance) {
            recommendations.push('Move excess funds to treasury');
        }
        
        if (balances.hotWallet.balance < this.minHotWalletBalance) {
            recommendations.push('Replenish hot wallet from treasury');
        }
        
        if (balances.treasury.balance === 0) {
            recommendations.push('Set up treasury cold storage');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Treasury management is optimal');
        }
        
        return recommendations;
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const treasury = new TreasuryManager();
    
    try {
        switch (command) {
            case 'balances':
                const balances = await treasury.getBalances();
                console.log('💰 WALLET BALANCES:');
                console.log(`Hot Wallet: ${balances.hotWallet.balance} SOL`);
                console.log(`Treasury: ${balances.treasury.balance} SOL`);
                console.log(`Total: ${balances.total} SOL`);
                break;
                
            case 'report':
                const report = await treasury.getSecurityReport();
                console.log('📊 SECURITY REPORT:');
                console.log(JSON.stringify(report, null, 2));
                break;
                
            case 'rebalance':
                await treasury.autoRebalance();
                break;
                
            case 'to-treasury':
                const amount = parseFloat(args[1]);
                if (isNaN(amount)) {
                    console.log('Usage: node treasury_manager.js to-treasury <amount>');
                    break;
                }
                await treasury.transferToTreasury(amount);
                break;
                
            case 'from-treasury':
                const amount2 = parseFloat(args[1]);
                if (isNaN(amount2)) {
                    console.log('Usage: node treasury_manager.js from-treasury <amount>');
                    break;
                }
                await treasury.transferFromTreasury(amount2);
                break;
                
            default:
                console.log('🏦 TREASURY MANAGER COMMANDS:');
                console.log('node treasury_manager.js balances     - Show wallet balances');
                console.log('node treasury_manager.js report       - Security report');
                console.log('node treasury_manager.js rebalance    - Auto-rebalance wallets');
                console.log('node treasury_manager.js to-treasury <amount>    - Move SOL to treasury');
                console.log('node treasury_manager.js from-treasury <amount>  - Move SOL from treasury');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = { TreasuryManager };
