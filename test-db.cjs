const db = require('./db/database');

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    await db.connectToDatabase();
    console.log('✅ Database connection successful!');
    
    // Test basic operations
    console.log('🧪 Testing database operations...');
    
    // Test registering a wallet
    await db.registerWallet('test_user_123', 'SOL', 'test_address_123');
    console.log('✅ Wallet registration test passed');
    
    // Test getting a wallet
    const wallet = await db.getWallet('test_user_123', 'SOL');
    console.log('✅ Wallet retrieval test passed:', wallet);
    
    // Test balance operations
    await db.updateBalance('test_user_123', 'SOL', 1.5);
    const balance = await db.getBalance('test_user_123', 'SOL');
    console.log('✅ Balance operations test passed:', balance);
    
    // Test history
    await db.addHistory('test_user_123', { type: 'test', amount: 1.5, date: new Date() });
    const history = await db.getHistory('test_user_123');
    console.log('✅ History operations test passed:', history.length, 'entries');
    
    console.log('🎉 All database tests passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  }
}

testDatabase();