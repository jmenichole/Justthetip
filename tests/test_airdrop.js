const { Client, GatewayIntentBits } = require('discord.js');
const db = require('./db/database');

// Test airdrop functionality
function testAirdropSystem() {
    console.log('🧪 TESTING AIRDROP SYSTEM\n');
    
    const testUserId = '1153034319271559328'; // Your Discord ID
    const testRecipientId = '999999999999999999'; // Mock recipient
    
    // Check initial balances
    console.log('📊 INITIAL BALANCES:');
    console.log(`Your SOL: ${db.getBalance(testUserId, 'SOL')}`);
    console.log(`Your USDC: ${db.getBalance(testUserId, 'USDC')}`);
    console.log(`Your LTC: ${db.getBalance(testUserId, 'LTC')}`);
    
    // Simulate airdrop creation
    console.log('\n🎁 CREATING TEST AIRDROP:');
    const airdropAmount = 1.5;
    const airdropCoin = 'SOL';
    const currentBalance = db.getBalance(testUserId, airdropCoin);
    
    if (currentBalance >= airdropAmount) {
        // Deduct from creator's balance
        db.updateBalance(testUserId, airdropCoin, currentBalance - airdropAmount);
        console.log(`✅ Airdrop of ${airdropAmount} ${airdropCoin} created!`);
        console.log(`Your remaining ${airdropCoin}: ${db.getBalance(testUserId, airdropCoin)}`);
        
        // Add to history
        db.addHistory(testUserId, {
            type: 'airdrop',
            coin: airdropCoin,
            amount: airdropAmount,
            date: new Date()
        });
        
        console.log('\n📝 Transaction recorded in history');
    } else {
        console.log(`❌ Insufficient ${airdropCoin} balance for airdrop`);
    }
    
    // Show history
    console.log('\n📋 TRANSACTION HISTORY:');
    const history = db.getHistory(testUserId);
    history.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.type.toUpperCase()}: ${entry.amount} ${entry.coin} (${entry.date})`);
    });
}

// Run the test
testAirdropSystem();
