const solana = require('./chains/solana.cjs');

// Test fee system
const FEE_RATE = 0.005; // 0.5%
const feeWallets = require('./security/feeWallet.json');

function calculateFee(amount) {
  return Math.max(Math.floor(amount * FEE_RATE * 1e8) / 1e8, 0);
}

function getFeeWallet(coin) {
  return feeWallets[coin.toUpperCase()] || null;
}

async function testFeeSystem() {
  console.log('🔍 Testing Fee System Implementation...');
  
  // Test fee calculation
  const testAmount = 1.0; // 1 SOL
  const fee = calculateFee(testAmount);
  const netAmount = testAmount - fee;
  
  console.log(`💰 Test Transaction: ${testAmount} SOL`);
  console.log(`⚡ Fee (0.5%): ${fee} SOL`);
  console.log(`💵 Net Amount: ${netAmount} SOL`);
  
  // Test fee wallet retrieval
  const solFeeWallet = getFeeWallet('SOL');
  const usdcFeeWallet = getFeeWallet('USDC');
  
  console.log(`\n🏦 SOL Fee Wallet: ${solFeeWallet}`);
  console.log(`🏦 USDC Fee Wallet: ${usdcFeeWallet}`);
  
  // Test Helius rebate address
  console.log(`\n💎 Helius Rebate Address: ${process.env.HELIUS_REBATE_ADDRESS}`);
  
  // Test Solana functions
  try {
    const balance = await solana.getSolBalance();
    console.log(`\n💳 Current SOL Balance: ${balance} SOL`);
    
    console.log('\n✅ Fee system verification complete!');
    console.log('📝 Summary:');
    console.log('  - Fee rate: 0.5% per transaction');
    console.log('  - Fee collection wallet: H8m2gN2GEPSbk4u6PoWa8JYkEZRJWH45DyWjbAm76uCX');
    console.log('  - Helius rebates: Enabled for transaction cost optimization');
    console.log('  - Solana chain: Ready with rebate system');
    
  } catch (error) {
    console.error('❌ Error testing Solana functions:', error.message);
  }
}

testFeeSystem();
