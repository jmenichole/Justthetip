// Test escrow airdrop functionality without Discord
require('dotenv').config({ path: '.env.devnet' });
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { JustTheTipSDK } = require('./contracts/sdk.js');

async function testEscrowAirdrop() {
  console.log('🧪 Testing Escrow Airdrop Transaction Building');
  console.log('============================================');
  
  try {
    // Initialize SDK
    const rpcUrl = process.env.SOL_RPC_URL || 'https://api.devnet.solana.com';
    const sdk = new JustTheTipSDK(rpcUrl);
    console.log('✅ SDK initialized');
    console.log('📋 Program ID:', sdk.programId.toString());
    
    // Create test wallets (for simulation)
    const senderKeypair = Keypair.generate();
    const recipient1 = new PublicKey('11111111111111111111111111111112'); // System program as example
    const recipient2 = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC mint
    
    console.log('👤 Test Sender:', senderKeypair.publicKey.toString());
    console.log('👥 Test Recipients:', [recipient1.toString(), recipient2.toString()]);
    
    // Test escrow airdrop transaction building
    const recipients = [
      { recipient: recipient1, amount: 1000000 }, // 0.001 SOL
      { recipient: recipient2, amount: 2000000 }  // 0.002 SOL
    ];
    
    const feeWallet = new PublicKey('11111111111111111111111111111112');
    const feePercentage = 5; // 5%
    
    console.log('\n📦 Building escrow airdrop transaction...');
    const result = await sdk.createEscrowAirdropTransaction(
      senderKeypair.publicKey,
      recipients,
      feeWallet,
      feePercentage
    );
    
    console.log('✅ Transaction built successfully!');
    console.log('   - Airdrop ID:', result.airdropId);
    console.log('   - Total amount:', result.totalAmount, 'SOL');
    console.log('   - Fee breakdown:', JSON.stringify(result.feeBreakdown, null, 2));
    console.log('📊 Transaction details:');
    console.log('   - Instructions:', result.transaction.instructions.length);
    console.log('   - Recipients:', recipients.length);
    console.log('   - Total amount:', recipients.reduce((sum, r) => sum + r.amount, 0) / 1000000000, 'SOL');
    console.log('   - Fee percentage:', feePercentage + '%');
    
    // Calculate expected fee
    const totalAmount = recipients.reduce((sum, r) => sum + r.amount, 0);
    const feeAmount = Math.floor(totalAmount * feePercentage / 100);
    console.log('   - Expected fee:', feeAmount / 1000000000, 'SOL');
    console.log('   - Amount to recipients:', (totalAmount - feeAmount) / 1000000000, 'SOL');
    
    console.log('\n🎉 Escrow airdrop transaction building works!');
    console.log('\n📝 To test with real transactions:');
    console.log('1. Get devnet SOL from: https://faucet.solana.com/');
    console.log('2. Replace test wallets with real devnet wallets');
    console.log('3. Sign and send the transaction');
    console.log('4. Verify atomic behavior in Solana Explorer');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testEscrowAirdrop();
