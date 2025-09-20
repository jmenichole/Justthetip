import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

/**
 * JustTheTip Smart Contract SDK
 * Non-custodial Discord bot framework for Solana
 */
export class JustTheTipSDK {
  constructor(rpcUrl, programId = null) {
    this.connection = new Connection(rpcUrl);
    this.programId = programId || new PublicKey('11111111111111111111111111111112'); // System Program
  }

  /**
   * Generate Program Derived Address for a Discord user
   * @param {string} userId - Discord user ID
   * @param {string} seed - Optional seed for PDA generation
   * @returns {PublicKey} - Generated PDA
   */
  async generateUserPDA(userId, seed = 'tip-account') {
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
   * Create a tip instruction between two users
   * @param {PublicKey} senderPubkey - Sender's wallet
   * @param {PublicKey} recipientPubkey - Recipient's wallet
   * @param {number} amount - Amount in SOL
   * @returns {TransactionInstruction} - Solana transaction instruction
   */
  createTipInstruction(senderPubkey, recipientPubkey, amount) {
    const lamports = Math.floor(amount * 1e9); // Convert SOL to lamports
    
    return SystemProgram.transfer({
      fromPubkey: senderPubkey,
      toPubkey: recipientPubkey,
      lamports: lamports
    });
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
        toPubkey: recipient.pubkey,
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
   * @param {PublicKey} walletPubkey - Wallet public key
   * @param {number} limit - Number of transactions to fetch
   * @returns {Array} - Array of transaction signatures
   */
  async getRecentTransactions(walletPubkey, limit = 10) {
    const signatures = await this.connection.getSignaturesForAddress(
      walletPubkey,
      { limit }
    );
    return signatures;
  }
}