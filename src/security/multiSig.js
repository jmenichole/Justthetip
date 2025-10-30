/**
 * Multi-Signature Wallet Integration
 * Uses Squads Protocol for multi-sig transactions
 * Requires M-of-N approvals for high-value transactions
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const { Squads } = require('@sqds/sdk');

class MultiSigManager {
  constructor(database, connection) {
    this.db = database;
    this.connection = connection;
    this.squads = null; // Initialize when needed
    
    // Configuration
    this.MULTISIG_THRESHOLD = 1 * 1e9; // 1 SOL - transactions above this need multi-sig
    this.REQUIRED_APPROVALS = 2; // Number of approvals needed
    this.TOTAL_SIGNERS = 3; // Total number of authorized signers
  }

  /**
   * Initialize Squads SDK
   * @param {Keypair} authority - Authority keypair
   */
  async initialize(authority) {
    this.squads = Squads.endpoint(this.connection.rpcEndpoint, authority);
    return this.squads;
  }

  /**
   * Create a new multi-sig wallet
   * @param {Array<string>} signerPublicKeys - Array of signer public keys
   * @param {number} threshold - Number of required signatures
   * @returns {Promise<Object>} - Multi-sig wallet details
   */
  async createMultiSig(signerPublicKeys, threshold) {
    if (!this.squads) {
      throw new Error('MultiSig not initialized. Call initialize() first.');
    }

    if (signerPublicKeys.length < threshold) {
      throw new Error('Threshold cannot be greater than number of signers');
    }

    try {
      // Convert to PublicKey objects
      const signers = signerPublicKeys.map(key => new PublicKey(key));

      // Create multi-sig account using Squads
      const createKey = new PublicKey(signerPublicKeys[0]); // Use first signer as create key
      
      const multisigAccount = await this.squads.createMultisig(
        threshold,
        createKey,
        signers
      );

      // Save to database
      const multisig = {
        address: multisigAccount.toString(),
        signers: signerPublicKeys,
        threshold,
        createdAt: new Date(),
        active: true
      };

      await this.db.collection('multiSigWallets').insertOne(multisig);

      // Log to audit trail
      await this.db.collection('auditLog').insertOne({
        action: 'MULTISIG_CREATED',
        multisigAddress: multisig.address,
        signers: signerPublicKeys,
        threshold,
        timestamp: new Date()
      });

      return multisig;
    } catch (error) {
      throw new Error(`Failed to create multi-sig: ${error.message}`);
    }
  }

  /**
   * Create a transaction proposal
   * @param {string} multisigAddress - Multi-sig wallet address
   * @param {Object} transactionData - Transaction details
   * @param {string} proposerId - Proposer Discord user ID
   * @returns {Promise<Object>} - Proposal details
   */
  async createProposal(multisigAddress, transactionData, proposerId) {
    const multisig = await this.db.collection('multiSigWallets').findOne({ 
      address: multisigAddress,
      active: true 
    });

    if (!multisig) {
      throw new Error('Multi-sig wallet not found');
    }

    // Create proposal
    const proposal = {
      id: this._generateProposalId(),
      multisigAddress,
      proposerId,
      transactionData,
      status: 'PENDING',
      approvals: [proposerId], // Proposer auto-approves
      rejections: [],
      requiredApprovals: multisig.threshold,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      executedAt: null,
      txSignature: null
    };

    await this.db.collection('multiSigProposals').insertOne(proposal);

    // Log to audit trail
    await this.db.collection('auditLog').insertOne({
      action: 'MULTISIG_PROPOSAL_CREATED',
      proposalId: proposal.id,
      multisigAddress,
      proposerId,
      amount: transactionData.amount,
      recipient: transactionData.recipient,
      timestamp: new Date()
    });

    return proposal;
  }

  /**
   * Approve a proposal
   * @param {string} proposalId - Proposal ID
   * @param {string} signerId - Signer Discord user ID
   * @param {string} signerWallet - Signer wallet address
   * @returns {Promise<Object>} - Updated proposal
   */
  async approveProposal(proposalId, signerId, signerWallet) {
    const proposal = await this.db.collection('multiSigProposals').findOne({ id: proposalId });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status !== 'PENDING') {
      throw new Error(`Cannot approve proposal with status: ${proposal.status}`);
    }

    if (Date.now() > proposal.expiresAt.getTime()) {
      await this._expireProposal(proposalId);
      throw new Error('Proposal has expired');
    }

    // Verify signer is authorized
    const multisig = await this.db.collection('multiSigWallets').findOne({ 
      address: proposal.multisigAddress 
    });

    if (!multisig.signers.includes(signerWallet)) {
      throw new Error('Unauthorized signer');
    }

    if (proposal.approvals.includes(signerId)) {
      throw new Error('You have already approved this proposal');
    }

    // Add approval
    proposal.approvals.push(signerId);

    // Check if threshold met
    if (proposal.approvals.length >= proposal.requiredApprovals) {
      proposal.status = 'APPROVED';
      
      // Execute transaction
      try {
        const txSignature = await this._executeProposal(proposal);
        proposal.status = 'EXECUTED';
        proposal.executedAt = new Date();
        proposal.txSignature = txSignature;
      } catch (error) {
        proposal.status = 'FAILED';
        proposal.executionError = error.message;
      }
    }

    // Update database
    await this.db.collection('multiSigProposals').updateOne(
      { id: proposalId },
      { $set: proposal }
    );

    // Log to audit trail
    await this.db.collection('auditLog').insertOne({
      action: 'MULTISIG_PROPOSAL_APPROVED',
      proposalId,
      signerId,
      signerWallet,
      status: proposal.status,
      timestamp: new Date()
    });

    return proposal;
  }

  /**
   * Reject a proposal
   * @param {string} proposalId - Proposal ID
   * @param {string} signerId - Signer Discord user ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} - Updated proposal
   */
  async rejectProposal(proposalId, signerId, reason) {
    const proposal = await this.db.collection('multiSigProposals').findOne({ id: proposalId });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status !== 'PENDING') {
      throw new Error(`Cannot reject proposal with status: ${proposal.status}`);
    }

    if (proposal.rejections.includes(signerId)) {
      throw new Error('You have already rejected this proposal');
    }

    // Add rejection
    proposal.rejections.push(signerId);
    proposal.status = 'REJECTED';
    proposal.rejectionReason = reason;

    await this.db.collection('multiSigProposals').updateOne(
      { id: proposalId },
      { $set: proposal }
    );

    // Log to audit trail
    await this.db.collection('auditLog').insertOne({
      action: 'MULTISIG_PROPOSAL_REJECTED',
      proposalId,
      signerId,
      reason,
      timestamp: new Date()
    });

    return proposal;
  }

  /**
   * Get pending proposals
   * @param {string} multisigAddress - Multi-sig wallet address
   * @returns {Promise<Array>} - Pending proposals
   */
  async getPendingProposals(multisigAddress = null) {
    const query = { status: 'PENDING' };
    if (multisigAddress) {
      query.multisigAddress = multisigAddress;
    }

    return await this.db.collection('multiSigProposals')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Execute proposal transaction
   * @private
   */
  async _executeProposal(proposal) {
    // This would use Squads SDK to execute the approved transaction
    throw new Error('Proposal execution not yet implemented');
    
    // Implementation would be:
    // 1. Get all signer signatures
    // 2. Use Squads to execute transaction
    // 3. Return transaction signature
  }

  /**
   * Expire old proposal
   * @private
   */
  async _expireProposal(proposalId) {
    await this.db.collection('multiSigProposals').updateOne(
      { id: proposalId },
      { $set: { status: 'EXPIRED' } }
    );
  }

  /**
   * Generate proposal ID
   * @private
   */
  _generateProposalId() {
    return `PROP${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  /**
   * Clean up expired proposals
   */
  async cleanupExpired() {
    const now = new Date();
    const result = await this.db.collection('multiSigProposals').updateMany(
      {
        status: 'PENDING',
        expiresAt: { $lt: now }
      },
      {
        $set: { status: 'EXPIRED' }
      }
    );

    return result.modifiedCount;
  }

  /**
   * Check if transaction requires multi-sig
   * @param {number} amount - Transaction amount in lamports
   * @returns {boolean}
   */
  requiresMultiSig(amount) {
    return amount >= this.MULTISIG_THRESHOLD;
  }
}

module.exports = MultiSigManager;
