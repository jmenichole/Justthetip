/**
 * JustTheTip Smart Contract Bot Example
 * Demonstrates non-custodial Discord bot implementation
 */

import { JustTheTipSDK } from './sdk.js';
import { PublicKey } from '@solana/web3.js';

// Example usage of the JustTheTip SDK
async function exampleUsage() {
  console.log('🚀 JustTheTip Smart Contract SDK Example\n');

  // Initialize SDK with Solana RPC endpoint
  const sdk = new JustTheTipSDK('https://api.mainnet-beta.solana.com');

  // Example user addresses (in real usage, these would come from user registration)
  const userWallet1 = new PublicKey('11111111111111111111111111111112');
  const userWallet2 = new PublicKey('11111111111111111111111111111112');

  console.log('1. Generating Program Derived Addresses for Discord users:');
  try {
    const userPDA1 = await sdk.generateUserPDA('discord_user_123456789');
    const userPDA2 = await sdk.generateUserPDA('discord_user_987654321');
    
    console.log(`   User 1 PDA: ${userPDA1.toBase58()}`);
    console.log(`   User 2 PDA: ${userPDA2.toBase58()}\n`);
  } catch (error) {
    console.log('   PDA generation example (requires valid program ID)\n');
  }

  console.log('2. Creating tip instruction:');
  const tipInstruction = sdk.createTipInstruction(
    userWallet1, 
    userWallet2, 
    0.1 // 0.1 SOL tip
  );
  console.log(`   Instruction type: ${tipInstruction.programId.toBase58()}`);
  console.log(`   Lamports to transfer: ${tipInstruction.data.readBigUInt64LE(4)}\n`);

  console.log('3. Creating airdrop instructions:');
  const recipients = [
    { pubkey: userWallet1, amount: 0.05 },
    { pubkey: userWallet2, amount: 0.05 }
  ];
  const airdropInstructions = sdk.createAirdropInstructions(userWallet1, recipients);
  console.log(`   Created ${airdropInstructions.length} airdrop instructions\n`);

  console.log('4. Address validation:');
  console.log(`   Valid address: ${sdk.isValidAddress('11111111111111111111111111111112')}`);
  console.log(`   Invalid address: ${sdk.isValidAddress('invalid_address')}\n`);

  console.log('5. Creating complete transaction:');
  const transaction = sdk.createTransaction([tipInstruction]);
  console.log(`   Transaction has ${transaction.instructions.length} instruction(s)\n`);

  console.log('✨ Smart Contract Discord Bot Architecture:');
  console.log('   • Users register their Solana wallets with Discord bot');
  console.log('   • Bot generates Program Derived Addresses for each user');
  console.log('   • Tips are executed through smart contract instructions');
  console.log('   • No private keys are ever handled by the bot');
  console.log('   • All transactions are signed by users in their own wallets');
}

// Discord Bot Integration Example
class SmartContractDiscordBot {
  constructor() {
    this.sdk = new JustTheTipSDK(process.env.SOL_RPC_URL);
  }

  async handleTipCommand(senderId, recipientId, amount) {
    try {
      // Get registered wallet addresses from database
      const senderWallet = await this.getUserWallet(senderId);
      const recipientWallet = await this.getUserWallet(recipientId);

      if (!senderWallet || !recipientWallet) {
        throw new Error('Users must register wallets first');
      }

      // Create tip instruction
      const instruction = this.sdk.createTipInstruction(
        new PublicKey(senderWallet),
        new PublicKey(recipientWallet),
        amount
      );

      // Create transaction
      const transaction = this.sdk.createTransaction([instruction]);

      // Return transaction for user to sign
      return {
        transaction: transaction.serialize({ requireAllSignatures: false }),
        message: `Tip transaction created: ${amount} SOL to user ${recipientId}`
      };

    } catch (error) {
      throw new Error(`Failed to create tip: ${error.message}`);
    }
  }

  async getUserWallet(userId) {
    // This would query your database
    // return await db.getWallet(userId, 'SOL');
    return null; // Placeholder
  }
}

// Execute if this file is run directly
if (import.meta.url === new URL(import.meta.url).href) {
  exampleUsage().catch(console.error);
}