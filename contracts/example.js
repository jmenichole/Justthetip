/**
 * JustTheTip SDK Example
 * Demonstrates smart contract functionality
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

const { Connection, PublicKey, SystemProgram, Transaction, Keypair } = require('@solana/web3.js');

class JustTheTipSDK {
  constructor(rpcUrl = 'https://api.mainnet-beta.solana.com') {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey('11111111111111111111111111111112'); // System program as example
  }

  // Create tip instruction
  createTipInstruction(senderWallet, recipientWallet, amount) {
    try {
      const sender = new PublicKey(senderWallet);
      const recipient = new PublicKey(recipientWallet);
      const lamports = Math.floor(amount * 1e9);
      
      return SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: recipient,
        lamports
      });
    } catch (error) {
      console.error('Error creating tip instruction:', error);
      throw error;
    }
  }

  // Generate PDA for Discord user
  async generateUserPDA(discordUserId) {
    const seeds = [
      Buffer.from('justthetip'),
      Buffer.from(discordUserId)
    ];
    
    try {
      const [pda, bump] = PublicKey.findProgramAddressSync(seeds, this.programId);
      return { address: pda, bump };
    } catch (error) {
      console.error('Error generating PDA:', error);
      throw error;
    }
  }

  // Get wallet balance
  async getBalance(walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  // Create airdrop instructions for multiple recipients
  createAirdropInstructions(sender, recipients) {
    const instructions = [];
    
    try {
      const senderPubkey = new PublicKey(sender);
      
      recipients.forEach(({ pubkey, amount }) => {
        const recipientPubkey = new PublicKey(pubkey);
        const lamports = Math.floor(amount * 1e9);
        
        const instruction = SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: recipientPubkey,
          lamports
        });
        
        instructions.push(instruction);
      });
      
      return instructions;
    } catch (error) {
      console.error('Error creating airdrop instructions:', error);
      throw error;
    }
  }

  // Create custom instruction (placeholder for advanced features)
  createCustomInstruction(params) {
    // This would contain your custom program instructions
    console.log('Custom instruction with params:', params);
    return null; // Placeholder
  }
}

// Example usage
async function demo() {
  console.log('🚀 JustTheTip SDK Demo\n');
  
  // Initialize SDK
  const sdk = new JustTheTipSDK('https://api.mainnet-beta.solana.com');
  console.log('✅ SDK initialized');
  
  // Example wallet addresses (replace with real ones)
  const senderWallet = '11111111111111111111111111111112';
  const recipientWallet = '11111111111111111111111111111113';
  
  try {
    // Create tip instruction
    console.log('\n📤 Creating tip instruction...');
    const tipInstruction = sdk.createTipInstruction(
      senderWallet,
      recipientWallet, 
      0.1 // 0.1 SOL
    );
    console.log('✅ Tip instruction created');
    
    // Generate PDA for Discord user
    console.log('\n🔗 Generating PDA...');
    const userPDA = await sdk.generateUserPDA('discord_user_123');
    console.log('✅ PDA generated:', userPDA.address.toString());
    
    // Create multi-recipient airdrop
    console.log('\n🎁 Creating airdrop instructions...');
    const recipients = [
      { pubkey: recipientWallet, amount: 0.05 },
      { pubkey: senderWallet, amount: 0.05 }
    ];
    const airdropInstructions = sdk.createAirdropInstructions(senderWallet, recipients);
    console.log('✅ Airdrop instructions created:', airdropInstructions.length);
    
    console.log('\n🎉 Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo error:', error.message);
  }
}

// Export for use as module
module.exports = { JustTheTipSDK };

// Run demo if executed directly
if (require.main === module) {
  demo();
}