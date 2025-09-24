import { Connection, PublicKey, Transaction, SystemProgram, TransactionInstruction, Keypair } from '@solana/web3.js';
import { randomFillSync } from 'crypto';

/**
 * JustTheTip Smart Contract SDK
 * Non-custodial Discord bot framework for Solana escrow program
 */
export class JustTheTipSDK {
  constructor(rpcUrl) {
    this.connection = new Connection(rpcUrl);
    // Use the deployed escrow program ID
    this.programId = new PublicKey('7PGCDfH3duBrAzKWXxTQufJJjnLEYtG219wPH39ZdDDb');
  }

  /**
   * Generate escrow PDA for a creator
   * @param {PublicKey} creator - Creator's wallet public key
   * @returns {PublicKey} - Generated escrow PDA
   */
  async generateEscrowPDA(creator) {
    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from('escrow'), creator.toBuffer()],
      this.programId
    );
    return pda;
  }

  /**
   * Create escrow initialization transaction
   * @param {PublicKey} creator - Creator's wallet public key
   * @param {number} recipientCount - Number of recipients
   * @param {number} expiryHours - Hours until expiry
   * @param {number} feePercentage - Fee percentage (0-100)
   * @returns {Transaction} - Transaction ready for signing
   */
  async createInitializeEscrowTransaction(creator, recipientCount, expiryHours, feePercentage) {
    const escrowPDA = await this.generateEscrowPDA(creator);
    
    // Calculate expiry timestamp
    const expiryTimestamp = Math.floor(Date.now() / 1000) + (expiryHours * 3600);
    
    // Instruction data for initialize_escrow
    const instructionData = Buffer.concat([
      Buffer.from([0]), // initialize_escrow instruction index
      new Uint8Array(new BigUint64Array([BigInt(recipientCount)]).buffer), // recipient_count (u32)
      new Uint8Array(new BigUint64Array([BigInt(expiryTimestamp)]).buffer), // expiry_timestamp (i64)
      Buffer.from([feePercentage]), // fee_percentage (u8)
    ]);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: escrowPDA, isSigner: false, isWritable: true },
        { pubkey: creator, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = creator;
    transaction.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash;
    
    return transaction;
  }

  /**
   * Create escrow deposit transaction
   * @param {PublicKey} depositor - Depositor's wallet public key
   * @param {PublicKey} escrowCreator - Escrow creator's public key
   * @param {number} amount - Amount to deposit in lamports
   * @returns {Transaction} - Transaction ready for signing
   */
  async createDepositTransaction(depositor, escrowCreator, amount) {
    const escrowPDA = await this.generateEscrowPDA(escrowCreator);
    
    // Instruction data for deposit
    const instructionData = Buffer.concat([
      Buffer.from([1]), // deposit instruction index
      new Uint8Array(new BigUint64Array([BigInt(amount)]).buffer), // amount (u64)
    ]);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: escrowPDA, isSigner: false, isWritable: true },
        { pubkey: depositor, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = depositor;
    transaction.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash;
    
    return transaction;
  }

  /**
   * Create escrow claim transaction
   * @param {PublicKey} claimant - Claimant's wallet public key
   * @param {PublicKey} escrowCreator - Escrow creator's public key
   * @returns {Transaction} - Transaction ready for signing
   */
  async createClaimTransaction(claimant, escrowCreator) {
    const escrowPDA = await this.generateEscrowPDA(escrowCreator);
    
    // Instruction data for claim_share
    const instructionData = Buffer.from([2]); // claim_share instruction index

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: escrowPDA, isSigner: false, isWritable: true },
        { pubkey: claimant, isSigner: true, isWritable: true },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = claimant;
    transaction.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash;
    
    return transaction;
  }

  /**
   * Get escrow account status
   * @param {PublicKey} escrowCreator - Escrow creator's public key
   * @returns {Promise<Object>} - Escrow account data
   */
  async getEscrowStatus(escrowCreator) {
    const escrowPDA = await this.generateEscrowPDA(escrowCreator);
    
    try {
      const accountInfo = await this.connection.getAccountInfo(escrowPDA);
      if (!accountInfo) {
        return { exists: false };
      }

      // Parse escrow account data
      const data = accountInfo.data;
      const escrowData = {
        creator: new PublicKey(data.slice(8, 40)), // 32 bytes after discriminator
        totalAmount: Number(new BigUint64Array(data.slice(40, 48))[0]),
        remainingAmount: Number(new BigUint64Array(data.slice(48, 56))[0]),
        recipientCount: Number(new Uint32Array(data.slice(56, 60))[0]),
        claimedCount: Number(new Uint32Array(data.slice(60, 64))[0]),
        expiryTimestamp: Number(new BigInt64Array(data.slice(64, 72))[0]),
        isActive: data[72] === 1,
        feePercentage: data[73],
        exists: true,
        escrowPDA: escrowPDA,
        currentBalance: accountInfo.lamports,
      };

      return escrowData;
    } catch (error) {
      console.error('Error fetching escrow status:', error);
      return { exists: false };
    }
  }

  /**
   * Create escrow airdrop transaction (legacy compatibility)
   * @param {PublicKey} senderWallet - Sender's wallet
   * @param {Array} recipients - Array of {userId, amount} objects
   * @param {PublicKey} feeWallet - Fee wallet
   * @param {number} feePercentage - Fee percentage
   * @returns {Object} - Transaction data with airdrop ID
   */
  async createEscrowAirdropTransaction(senderWallet, recipients, feeWallet, feePercentage = 0) {
    // Generate airdrop ID (for tracking purposes)
    const airdropId = new Uint8Array(32);
    randomFillSync(airdropId);
    const airdropIdHex = Buffer.from(airdropId).toString('hex');

    // Calculate total amount
    const totalRecipientAmount = recipients.reduce((sum, recipient) => sum + recipient.amount, 0);
    const feeAmount = Math.floor(totalRecipientAmount * feePercentage / 100);
    const totalAmount = totalRecipientAmount + feeAmount;

    // Create escrow initialization transaction
    const initTx = await this.createInitializeEscrowTransaction(
      senderWallet,
      recipients.length,
      24, // 24 hours expiry
      feePercentage
    );

    // Create deposit transaction
    const depositTx = await this.createDepositTransaction(
      feeWallet,
      senderWallet,
      totalAmount
    );

    return {
      airdropId: airdropIdHex,
      initTransaction: initTx,
      depositTransaction: depositTx,
      totalAmount: totalAmount / 1e9, // Convert to SOL
      recipientCount: recipients.length,
      feeAmount: feeAmount / 1e9,
    };
  }

  /**
   * Create claim airdrop transaction (legacy compatibility)
   * @param {string} airdropId - Airdrop ID (not used in escrow program)
   * @param {PublicKey} recipientWallet - Recipient's wallet
   * @param {number} amount - Amount to claim (not used in escrow program)
   * @returns {Transaction} - Claim transaction
   */
  async createClaimAirdropTransaction(airdropId, recipientWallet, amount) {
    // For escrow program, we need the escrow creator's public key
    // This is a simplified version - in practice, you'd need to map airdropId to escrowCreator
    throw new Error('Use createClaimTransaction with escrow creator public key instead');
  }

  /**
   * Get airdrop status (legacy compatibility)
   * @param {string} airdropId - Airdrop ID
   * @returns {Promise<Object>} - Airdrop status
   */
  async getAirdropStatus(airdropId) {
    // This is a placeholder - you'd need to implement airdrop ID to escrow creator mapping
    return {
      exists: false,
      totalAmount: 0,
      remainingAmount: 0,
    };
  }
}
