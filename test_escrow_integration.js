import { JustTheTipSDK } from './contracts/sdk.js';
import { PublicKey } from '@solana/web3.js';

async function testEscrowIntegration() {
  console.log('🧪 Testing Escrow Program Integration...\n');
  
  const sdk = new JustTheTipSDK('https://api.testnet.solana.com');
  
  // Test escrow PDA generation
  const testCreator = new PublicKey('Fbs3TfxS3pDtdpVJX32kYchKsWGUviQPRvjuNUEsSSGr');
  const escrowPDA = await sdk.generateEscrowPDA(testCreator);
  console.log('✅ Escrow PDA generated:', escrowPDA.toString());
  
  // Test transaction creation
  try {
    const initTx = await sdk.createInitializeEscrowTransaction(
      testCreator,
      3, // 3 recipients
      24, // 24 hours
      5 // 5% fee
    );
    console.log('✅ Initialize escrow transaction created');
    
    const depositTx = await sdk.createDepositTransaction(
      testCreator, // depositor
      testCreator, // escrow creator
      1 * 1e9 // 1 SOL
    );
    console.log('✅ Deposit transaction created');
    
    const claimTx = await sdk.createClaimTransaction(
      new PublicKey('11111111111111111111111111111112'), // test claimant
      testCreator // escrow creator
    );
    console.log('✅ Claim transaction created');
    
  } catch (error) {
    console.error('❌ Transaction creation failed:', error);
    return;
  }
  
  // Test escrow status (will fail if no escrow exists, which is expected)
  try {
    const status = await sdk.getEscrowStatus(testCreator);
    if (status.exists) {
      console.log('✅ Escrow status retrieved:', {
        totalAmount: status.totalAmount / 1e9,
        remainingAmount: status.remainingAmount / 1e9,
        recipientCount: status.recipientCount,
        claimedCount: status.claimedCount,
        isActive: status.isActive,
        feePercentage: status.feePercentage
      });
    } else {
      console.log('ℹ️  No escrow found (expected for test creator)');
    }
  } catch (error) {
    console.error('❌ Status check failed:', error);
  }
  
  console.log('\n🎉 Escrow integration test completed!');
}

// Run the test
testEscrowIntegration().catch(console.error);
