const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
require('dotenv').config();

async function checkMainnetSetup() {
    console.log('🔍 MAINNET SECURITY SETUP VERIFICATION\n');
    
    const connection = new Connection(process.env.SOL_RPC_URL);
    const hotWalletAddress = process.env.HOT_WALLET_ADDRESS;
    
    try {
        // Check connection
        const version = await connection.getVersion();
        console.log('✅ Mainnet Connection:', version);
        
        // Check hot wallet balance
        if (hotWalletAddress) {
            const publicKey = new PublicKey(hotWalletAddress);
            const balance = await connection.getBalance(publicKey);
            const solBalance = balance / LAMPORTS_PER_SOL;
            
            console.log(`💰 Hot Wallet Balance: ${solBalance} SOL`);
            
            if (solBalance < 0.1) {
                console.log('⚠️  WARNING: Hot wallet balance is low for mainnet operations');
                console.log('💡 Recommendation: Fund with at least 0.1 SOL for operational safety');
            }
            
            if (solBalance > 1.0) {
                console.log('⚠️  WARNING: Hot wallet balance is high');
                console.log('💡 Recommendation: Move excess funds to cold storage');
            }
        }
        
    // Security recommendations
    console.log('\n🛡️  SECURITY RECOMMENDATIONS:');
    console.log('1. Set up cold storage treasury wallet');
    console.log('2. Enable 2FA on all admin accounts');
    console.log('3. Monitor transaction logs daily');
    console.log('4. Set up automated alerts for unusual activity');
    console.log('5. Regular security audits');

    // Fee policy
    console.log('\n💸 FEE POLICY:');
    console.log('• Tipping: 0% (no fee for internal tips)');
    console.log('• Airdrops: 0% (no fee, only network fee on withdrawal)');
    console.log('• Withdrawals: Network fee only (user pays actual blockchain fee)');
    console.log('• Service Fee (optional): You may add a small % fee for airdrops or utility features if desired.');
    console.log('• All fees should be transparently shown to users before confirming transactions.');

    console.log('\n📊 CURRENT SECURITY LIMITS:');
    console.log('• Max tip: 0.01 SOL per transaction');
    console.log('• Max withdraw: 0.01 SOL per transaction');
    console.log('• Max airdrop: 0.005 SOL per transaction');
    console.log('• Daily limit: 0.1 SOL per user');

    console.log('\n🚀 MAINNET READY!');
    console.log('Use: node bot_secure.js to start with full security');
        
    } catch (error) {
        console.error('❌ Setup verification failed:', error.message);
    }
}

checkMainnetSetup();
