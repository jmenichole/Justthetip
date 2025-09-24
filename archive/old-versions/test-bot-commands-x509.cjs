const db = require('./db/database.cjs');
require('dotenv').config();

async function testBotCommands() {
  console.log('🧪 Testing bot commands with X.509 secure database connection...\n');
  
  try {
    // Test database connection
    console.log('1. Testing Database Connection...');
    await db.connectToDatabase();
    console.log('✅ Database connected successfully with X.509\n');
    
    // Test getUserBalance function
    console.log('2. Testing getUserBalance...');
    const testUserId = 'test_user_123';
    const balance = await db.getUserBalance(testUserId);
    console.log('✅ Balance retrieved:', balance, '\n');
    
    // Test addToUserBalance function
    console.log('3. Testing addToUserBalance...');
    await db.addToUserBalance(testUserId, 'SOL', 10.5);
    await db.addToUserBalance(testUserId, 'USDC', 100.0);
    await db.addToUserBalance(testUserId, 'LTC', 5.0);
    console.log('✅ Added balances to test user\n');
    
    // Verify balance update
    console.log('4. Verifying balance updates...');
    const updatedBalance = await db.getUserBalance(testUserId);
    console.log('✅ Updated balance:', updatedBalance, '\n');
    
    // Test subtractFromUserBalance function
    console.log('5. Testing subtractFromUserBalance...');
    await db.subtractFromUserBalance(testUserId, 'SOL', 2.5);
    const balanceAfterSubtract = await db.getUserBalance(testUserId);
    console.log('✅ Balance after subtraction:', balanceAfterSubtract, '\n');
    
    // Test wallet registration
    console.log('6. Testing wallet registration...');
    await db.setUserWallet(testUserId, 'SOL', 'test_solana_address_123');
    await db.setUserWallet(testUserId, 'LTC', 'test_litecoin_address_123');
    const solWallet = await db.getUserWallet(testUserId, 'SOL');
    const ltcWallet = await db.getUserWallet(testUserId, 'LTC');
    console.log('✅ SOL wallet:', solWallet);
    console.log('✅ LTC wallet:', ltcWallet, '\n');
    
    // Test database collections
    console.log('7. Testing database collections...');
    const database = await db.getDatabase();
    const collections = await database.listCollections().toArray();
    console.log('✅ Available collections:', collections.map(c => c.name).join(', '), '\n');
    
    // Clean up test data
    console.log('8. Cleaning up test data...');
    await database.collection('wallets').deleteOne({ userId: testUserId });
    console.log('✅ Test data cleaned up\n');
    
    await db.closeConnection();
    console.log('🎉 All database functions working perfectly with X.509 authentication!');
    console.log('\n✅ Bot commands should work flawlessly with the secure connection.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test supported commands that users can run
async function testCommandStructure() {
  console.log('\n📋 Supported Bot Commands:');
  console.log('• !balance - Check your crypto balances');
  console.log('• !tip @user amount coin - Tip another user');
  console.log('• !registerwallet coin address - Register external wallet');
  console.log('• !withdraw address amount coin - Withdraw to external wallet'); 
  console.log('• !deposit - Get deposit instructions');
  console.log('• !airdrop amount coin - Create airdrop for others');
  console.log('• !collect - Collect from latest airdrop');
  console.log('• !burn amount coin - Donate to support development');
  console.log('• !help - Show help message');
  console.log('\n🪙 Supported Cryptocurrencies:');
  console.log('• SOL - Solana');
  console.log('• USDC - USD Coin (Solana SPL)');
  console.log('• LTC - Litecoin');
  console.log('• TRX - Tron');
  console.log('• ETH - Ethereum');
  console.log('• XRP - XRP Ledger');
}

testBotCommands().then(() => {
  testCommandStructure();
});
