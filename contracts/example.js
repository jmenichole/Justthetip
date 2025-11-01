/**
 * JustTheTip SDK Example
 * Demonstrates smart contract functionality using the SDK
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * 
 * This file is part of JustTheTip.
 * 
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * See LICENSE file in the project root for full license information.
 * 
 * SPDX-License-Identifier: MIT
 * 
 * This software may not be sold commercially without permission.
 */

const { JustTheTipSDK } = require('./sdk');

/**
 * Example usage of JustTheTip SDK
 * Demonstrates all major SDK features
 */
async function demo() {
  console.log('🚀 JustTheTip SDK Demo\n');
  
  // Initialize SDK with RPC URL
  const sdk = new JustTheTipSDK(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
  console.log('✅ SDK initialized');
  
  // Example wallet addresses (replace with real ones for actual usage)
  const senderWallet = '11111111111111111111111111111112';
  const recipientWallet = '11111111111111111111111111111113';
  
  try {
    // 1. Validate addresses
    console.log('\n🔍 Validating addresses...');
    const isSenderValid = sdk.validateAddress(senderWallet);
    const isRecipientValid = sdk.validateAddress(recipientWallet);
    console.log(`Sender valid: ${isSenderValid}, Recipient valid: ${isRecipientValid}`);
    
    // 2. Create tip instruction
    console.log('\n📤 Creating tip instruction...');
    const tipTransaction = sdk.createTipInstruction(senderWallet, recipientWallet, 0.1);
    if (tipTransaction) {
      console.log('✅ Tip transaction created (unsigned)');
      console.log('   Instructions:', tipTransaction.instructions.length);
    }
    
    // 3. Generate PDA for Discord user
    console.log('\n🔗 Generating Program Derived Address...');
    const userPDA = sdk.generateUserPDA('discord_user_123');
    if (userPDA) {
      console.log('✅ PDA generated:', userPDA.address);
      console.log('   Bump:', userPDA.bump);
    }
    
    // 4. Create multi-recipient airdrop
    console.log('\n🎁 Creating airdrop instructions...');
    const recipients = [
      { pubkey: recipientWallet, amount: 0.05 },
      { pubkey: senderWallet, amount: 0.05 }
    ];
    const airdropTransaction = sdk.createAirdropInstructions(senderWallet, recipients);
    if (airdropTransaction) {
      console.log('✅ Airdrop transaction created');
      console.log('   Recipients:', recipients.length);
      console.log('   Instructions:', airdropTransaction.instructions.length);
    }
    
    // 5. Get balance (commented out as it requires a valid address)
    // console.log('\n💰 Getting wallet balance...');
    // const balance = await sdk.getBalance(senderWallet);
    // console.log('✅ Balance:', balance, 'SOL');
    
    // 6. Get recent blockhash
    console.log('\n🔗 Getting recent blockhash...');
    const blockhash = await sdk.getRecentBlockhash();
    if (blockhash) {
      console.log('✅ Recent blockhash:', blockhash.substring(0, 16) + '...');
    }
    
    console.log('\n🎉 SDK Demo completed successfully!');
    console.log('\n📚 For production use:');
    console.log('   - Replace example addresses with real Solana addresses');
    console.log('   - Users must sign transactions in their wallets');
    console.log('   - All operations are non-custodial');
    
  } catch (error) {
    console.error('❌ Demo error:', error.message);
  }
}

// Run demo if executed directly
if (require.main === module) {
  demo().catch(console.error);
}