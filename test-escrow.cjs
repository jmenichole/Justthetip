// Test script for escrow functionality
require('dotenv').config({ path: '.env.devnet' });
const { Connection, PublicKey } = require('@solana/web3.js');
const { JustTheTipSDK } = require('./contracts/sdk.js');

async function testEscrow() {
  console.log('🧪 Testing Escrow Airdrop Functionality');
  console.log('=====================================');
  
  try {
    // Initialize SDK with RPC URL
    const rpcUrl = process.env.SOL_RPC_URL || 'https://api.devnet.solana.com';
    const sdk = new JustTheTipSDK(rpcUrl);
    console.log('✅ SDK initialized');
    
    // Test program ID loading
    console.log('📋 Program ID:', sdk.programId.toString());
    
    // Test basic connection
    const balance = await sdk.connection.getBalance(new PublicKey('11111111111111111111111111111112'));
    console.log('✅ Solana connection working, system account balance:', balance);
    
    console.log('🎉 Escrow system ready for testing!');
    console.log('\n📝 To test with Discord bot:');
    console.log('1. Fix BOT_TOKEN in .env.devnet');
    console.log('2. Run: node src/bots/bot_smart_contract.js');
    console.log('3. Use /sc-airdrop command in Discord');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testEscrow();
