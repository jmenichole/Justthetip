const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const axios = require('axios');

// Real Solana Devnet Faucet
class SolanaFaucet {
    constructor() {
        this.connection = new Connection(clusterApiUrl('devnet'));
        this.faucetUrl = 'https://faucet.solana.com/api/faucet/airdrop';
    }

    async requestAirdrop(walletAddress, amount = 1) {
        try {
            console.log(`🚰 Requesting ${amount} SOL from Solana devnet faucet...`);
            
            // Method 1: Direct connection airdrop
            try {
                const publicKey = new PublicKey(walletAddress);
                const signature = await this.connection.requestAirdrop(
                    publicKey,
                    amount * 1000000000 // Convert SOL to lamports
                );
                
                await this.connection.confirmTransaction(signature);
                console.log(`✅ Airdrop successful! Transaction: ${signature}`);
                
                const balance = await this.connection.getBalance(publicKey);
                console.log(`💰 New balance: ${balance / 1000000000} SOL`);
                
                return {
                    success: true,
                    signature,
                    balance: balance / 1000000000
                };
            } catch (directError) {
                console.log('Direct airdrop failed, trying HTTP faucet...');
                
                // Method 2: HTTP Faucet API
                const response = await axios.post(this.faucetUrl, {
                    pubkey: walletAddress,
                    amount: amount * 1000000000
                });
                
                if (response.data.signature) {
                    console.log(`✅ HTTP Faucet successful! Transaction: ${response.data.signature}`);
                    return {
                        success: true,
                        signature: response.data.signature,
                        balance: null
                    };
                }
            }
        } catch (error) {
            console.error(`❌ Faucet failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async checkBalance(walletAddress) {
        try {
            const publicKey = new PublicKey(walletAddress);
            const balance = await this.connection.getBalance(publicKey);
            return balance / 1000000000;
        } catch (error) {
            console.error(`Error checking balance: ${error.message}`);
            return 0;
        }
    }
}

// Test the faucet
async function testFaucet() {
    const faucet = new SolanaFaucet();
    const testWallet = 'H8m2gN2GEPSbk4u6PoWa8JYkEZRJWH45DyWjbAm76uCX'; // Your wallet
    
    console.log('🧪 Testing Real Solana Devnet Faucet\n');
    
    // Check current balance
    const currentBalance = await faucet.checkBalance(testWallet);
    console.log(`📊 Current balance: ${currentBalance} SOL`);
    
    // Request airdrop
    const result = await faucet.requestAirdrop(testWallet, 2);
    
    if (result.success) {
        console.log('\n🎉 Faucet test successful!');
        console.log(`Transaction: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`);
        
        // Check new balance
        setTimeout(async () => {
            const newBalance = await faucet.checkBalance(testWallet);
            console.log(`💰 Updated balance: ${newBalance} SOL`);
        }, 3000);
    } else {
        console.log('\n❌ Faucet test failed:', result.error);
    }
}

module.exports = { SolanaFaucet };

// Run test if called directly
if (require.main === module) {
    testFaucet();
}
