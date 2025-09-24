import { Connection, PublicKey, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { randomFillSync } from 'crypto';
/**
 * JustTheTip Smart Contract SDK
 * Non-custodial Discord bot framework for Solana
 */
export class JustTheTipSDK {
  constructor(rpcUrl, programId = null) {
    this.connection = new Connection(rpcUrl);
    // Default to a placeholder - will be updated with deployed program ID
    this.programId = programId || new PublicKey('DPEJ3qgA54d88TnB7DeC72fmPd64BL7ZBaXe3Wcyb8dE');
  }

  /**
   * Generate Program Derived Address for a Discord user
   * @param {string} userId - Discord user ID
   * @param {string} seed - Optional seed for PDA generation
   * @returns {PublicKey} - Generated PDA
   */
  async generateUserPDA(userId, seed = 'user') {
    const [pda] = await PublicKey.findProgramAddress(
      [
        Buffer.from(seed),
        Buffer.from(userId),
      ],
      this.programId
    );
    return pda;
  }

  /**
   * Create initialize user account instruction
   * @param {string} userId - Discord user ID
   * @param {PublicKey} userWallet - User's wallet public key
   * @returns {TransactionInstruction} - Initialize instruction
   */
  async createInitializeUserInstruction(userId, userWallet) {
    const userPDA = await this.generateUserPDA(userId);

    const instructionData = {
      instruction: 'InitializeUserAccount',
      userId: userId,
    };

    const data = Buffer.from(JSON.stringify(instructionData));

    return new TransactionInstruction({
      keys: [
        { pubkey: userPDA, isSigner: false, isWritable: true },
        { pubkey: userWallet, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: data,
    });
  }

  /**
   * Create a tip instruction using the smart contract
   * @param {string} senderUserId - Sender's Discord user ID
   * @param {PublicKey} recipientPubkey - Recipient's wallet
   * @param {number} amount - Amount in SOL
   * @returns {TransactionInstruction} - Tip creation instruction
   */
  async createTipInstruction(senderUserId, recipientPubkey, amount) {
    const senderPDA = await this.generateUserPDA(senderUserId);
    const tipId = this.generateTipId();
    const tipPDA = await PublicKey.findProgramAddress(
      [Buffer.from('tip'), Buffer.from(tipId, 'hex')],
      this.programId
    );

    const instructionData = {
      instruction: 'CreateTip',
      amount: Math.floor(amount * 1e9), // Convert to lamports
      recipient: recipientPubkey.toString(),
    };

    const data = Buffer.from(JSON.stringify(instructionData));

    return new TransactionInstruction({
      keys: [
        { pubkey: tipPDA, isSigner: false, isWritable: true },
        { pubkey: senderPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: data,
    });
  }

  /**
   * Create execute tip instruction
   * @param {string} tipId - Unique tip identifier
   * @param {PublicKey} senderWallet - Sender's wallet
   * @param {PublicKey} recipientWallet - Recipient's wallet
   * @returns {TransactionInstruction} - Execute tip instruction
   */
  async createExecuteTipInstruction(tipId, senderWallet, recipientWallet) {
    const tipPDA = await PublicKey.findProgramAddress(
      [Buffer.from('tip'), Buffer.from(tipId, 'hex')],
      this.programId
    );

    const instructionData = {
      instruction: 'ExecuteTip',
      tipId: Array.from(Buffer.from(tipId, 'hex')),
    };

    const data = Buffer.from(JSON.stringify(instructionData));

    return new TransactionInstruction({
      keys: [
        { pubkey: tipPDA, isSigner: false, isWritable: true },
        { pubkey: senderWallet, isSigner: true, isWritable: true },
        { pubkey: recipientWallet, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: data,
    });
  }

  /**
   * Generate a unique tip ID
   * @returns {string} - Hex string tip ID
   */
  generateTipId() {
    return Date.now().toString(16) + Math.random().toString(16).substr(2, 8);
  }

  /**
   * Create an airdrop instruction to multiple recipients
   * @param {PublicKey} senderPubkey - Sender's wallet
   * @param {Array<{pubkey: PublicKey, amount: number}>} recipients - Recipients list
   * @returns {Array<TransactionInstruction>} - Array of transaction instructions
   */
  createAirdropInstructions(senderPubkey, recipients) {
    return recipients.map(recipient => {
      const lamports = Math.floor(recipient.amount * 1e9);
      return SystemProgram.transfer({
        fromPubkey: senderPubkey,
        toPubkey: recipient.pubkey || recipient.recipient,
        lamports: lamports
      });
    });
  }

  /**
   * Get wallet balance
   * @param {PublicKey} walletPubkey - Wallet public key
   * @returns {number} - Balance in SOL
   */
  async getBalance(walletPubkey) {
    const balance = await this.connection.getBalance(walletPubkey);
    return balance / 1e9; // Convert lamports to SOL
  }

  /**
   * Validate Solana address format
   * @param {string} address - Address to validate
   * @returns {boolean} - Is valid address
   */
  isValidAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a transaction with multiple instructions
   * @param {Array<TransactionInstruction>} instructions - Instructions to include
   * @returns {Transaction} - Solana transaction
   */
  createTransaction(instructions) {
    const transaction = new Transaction();
    instructions.forEach(instruction => transaction.add(instruction));
    return transaction;
  }

  /**
   * Get recent transactions for a wallet
   * @param {PublicKey} walletPubkey - Wallet to check
   * @param {number} limit - Number of transactions to fetch
   * @returns {Array} - Recent transactions
   */
  async getRecentTransactions(walletPubkey, limit = 10) {
    try {
      const signatures = await this.connection.getSignaturesForAddress(walletPubkey, { limit });
      return signatures;
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      return [];
    }
  }


  async createEscrowAirdropTransaction(senderWallet, recipients, feeWallet, feePercentage = 0) {
    // Generate airdrop ID
    const airdropId = new Uint8Array(32);
    randomFillSync(airdropId);

    // Calculate total amount
    const totalRecipientAmount = recipients.reduce((sum, recipient) => sum + recipient.amount, 0);
    const feeAmount = Math.floor(totalRecipientAmount * feePercentage / 100);
    const totalAmount = totalRecipientAmount + feeAmount;

    // Create escrow PDA
    const [escrowPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('escrow'), airdropId],
      this.programId
    );

    // Create CollectFunds instruction
    const collectInstruction = new TransactionInstruction({
      keys: [
        { pubkey: senderWallet, isSigner: true, isWritable: true },
        { pubkey: escrowPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: Buffer.concat([
        Buffer.from([0]), // CollectFunds instruction index
        Buffer.from(new Uint8Array(new BigUint64Array([BigInt(totalAmount)]).buffer)),
        Buffer.from(airdropId),
      ]),
    });

    // Serialize recipients for DistributeAirdrop
    const recipientsData = Buffer.alloc(4 + recipients.length * (32 + 8)); // 4 for length + 32+8 per recipient
    recipientsData.writeUInt32LE(recipients.length, 0);
    let offset = 4;
    for (const recipient of recipients) {
      recipient.pubkey || recipient.recipient.toBuffer().copy(recipientsData, offset);
      offset += 32;
      recipientsData.writeBigUInt64LE(BigInt(recipient.amount), offset);
      offset += 8;
    }

    // Create DistributeAirdrop instruction
    const distributeInstruction = new TransactionInstruction({
      keys: [
        { pubkey: escrowPDA, isSigner: false, isWritable: true },
        { pubkey: senderWallet, isSigner: true, isWritable: true },
        { pubkey: feeWallet, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: Buffer.concat([
        Buffer.from([1]), // DistributeAirdrop instruction index
        Buffer.from(airdropId),
        recipientsData,
        feeWallet.toBuffer(),
        Buffer.from([feePercentage]),
      ]),
    });

    // Create transaction
    const transaction = new Transaction();
    transaction.add(collectInstruction);
    transaction.add(distributeInstruction);

    return {
      transaction,
      airdropId: Buffer.from(airdropId).toString('hex'),
      totalAmount: totalAmount / 1e9, // Convert lamports to SOL
      feeBreakdown: {
        recipientAmount: totalRecipientAmount / 1e9,
        feeAmount: feeAmount / 1e9,
        totalAmount: totalAmount / 1e9
      },
      recipientCount: recipients.length
    };
  }

  /**
   * Create a claim airdrop transaction
   * @param {string} airdropId - Hex string of the airdrop ID
   * @param {PublicKey} recipientWallet - Recipient's wallet public key
   * @param {number} amount - Amount to claim in lamports
   * @returns {Transaction} - Signed transaction ready for execution
   */
  async createClaimAirdropTransaction(airdropId, recipientWallet, amount) {
    // Convert hex airdrop ID to Uint8Array
    const airdropIdBytes = new Uint8Array(Buffer.from(airdropId, 'hex'));

    // Create escrow PDA
    const [escrowPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('escrow'), airdropIdBytes],
      this.programId
    );

    // Create ClaimAirdrop instruction (instruction index 3)
    const claimInstruction = new TransactionInstruction({
      keys: [
        { pubkey: escrowPDA, isSigner: false, isWritable: true },
        { pubkey: recipientWallet, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: Buffer.concat([
        Buffer.from([3]), // ClaimAirdrop instruction index
        Buffer.from(airdropIdBytes),
        recipientWallet.toBuffer(),
        Buffer.from(new Uint8Array(new BigUint64Array([BigInt(amount)]).buffer)),
      ]),
    });

    // Create transaction
    const transaction = new Transaction();
    transaction.add(claimInstruction);

    return transaction;
  }

  /**
   * Get airdrop escrow status
   * @param {string} airdropId - Hex string of the airdrop ID
   * @returns {Promise<{totalAmount: number, remainingAmount: number}>} - Escrow status
   */
  async getAirdropStatus(airdropId) {
    const airdropIdBytes = new Uint8Array(Buffer.from(airdropId, 'hex'));

    const [escrowPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('escrow'), airdropIdBytes],
      this.programId
    );

    try {
      const accountInfo = await this.connection.getAccountInfo(escrowPDA);
      if (!accountInfo) {
        return { totalAmount: 0, remainingAmount: 0, exists: false };
      }

      // Read total amount from account data (first 8 bytes)
      const totalAmount = Number(new BigUint64Array(accountInfo.data.slice(0, 8))[0]);

      return {
        totalAmount: totalAmount / 1e9, // Convert to SOL
        remainingAmount: accountInfo.lamports / 1e9, // Current balance
        exists: true
      };
    } catch (error) {
      console.error('Error getting airdrop status:', error);
      return { totalAmount: 0, remainingAmount: 0, exists: false };
    }
  }
}

// CommonJS export for compatibility
