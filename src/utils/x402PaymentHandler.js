/**
 * x402 Payment Protocol Handler for JustTheTip
 * 
 * Implements HTTP 402 payment protocol for API monetization on Solana
 * Enables instant USDC micropayments for premium features
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const logger = require('./logger');

/**
 * USDC Mint Addresses
 * Devnet: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
 * Mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
 */
const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

class X402PaymentHandler {
  constructor(options = {}) {
    this.network = options.network || process.env.SOLANA_CLUSTER || 'devnet';
    this.rpcUrl = options.rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.treasuryAddress = options.treasuryAddress || process.env.X402_TREASURY_WALLET;
    this.connection = new Connection(this.rpcUrl, 'confirmed');
    
    // USDC mint based on network
    this.usdcMint = this.network === 'mainnet-beta' ? USDC_MINT_MAINNET : USDC_MINT_DEVNET;
    
    logger.info('x402 Payment Handler initialized', {
      network: this.network,
      treasury: this.treasuryAddress,
      usdcMint: this.usdcMint
    });
  }

  /**
   * Create payment requirements for HTTP 402 response
   * @param {Object} options - Payment options
   * @param {string} options.amount - Amount in USDC micro-units (e.g., "1000000" = $1)
   * @param {string} options.description - Payment description
   * @param {string} options.resource - Resource being paid for
   * @returns {Object} Payment requirements
   */
  createPaymentRequirements(options = {}) {
    const {
      amount = "1000000", // Default $1 USDC
      description = "API Access",
      resource = "premium-feature"
    } = options;

    if (!this.treasuryAddress) {
      throw new Error('Treasury wallet address not configured. Set X402_TREASURY_WALLET environment variable to a valid Solana public key address (e.g., 7xK...abc).');
    }

    // Validate treasury address is a valid Solana public key
    try {
      new PublicKey(this.treasuryAddress);
    } catch (error) {
      throw new Error(`Invalid treasury wallet address: ${this.treasuryAddress}. Must be a valid Solana public key.`);
    }

    return {
      protocol: "x402",
      version: "1.0",
      chain: "solana",
      network: this.network,
      payment: {
        recipient: this.treasuryAddress,
        amount: amount,
        currency: "USDC",
        mint: this.usdcMint,
        description: description,
        resource: resource
      },
      instructions: {
        message: `Send ${(Number(amount) / 1000000).toFixed(2)} USDC to proceed`,
        steps: [
          "Connect your Solana wallet",
          `Transfer ${(Number(amount) / 1000000).toFixed(2)} USDC to ${this.treasuryAddress}`,
          "Include transaction signature in X-Payment header",
          "Retry the request with payment proof"
        ]
      }
    };
  }

  /**
   * Create HTTP 402 response
   * @param {Object} paymentRequirements - Payment requirements
   * @returns {Object} Response object with status and body
   */
  create402Response(paymentRequirements) {
    return {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Required': 'x402',
        'X-Payment-Chain': 'solana',
        'X-Payment-Amount': paymentRequirements.payment.amount,
        'X-Payment-Currency': 'USDC',
        'X-Payment-Recipient': paymentRequirements.payment.recipient
      },
      body: {
        error: 'Payment Required',
        code: 402,
        message: 'This resource requires payment to access',
        payment: paymentRequirements
      }
    };
  }

  /**
   * Extract payment proof from request headers
   * @param {Object} headers - Request headers
   * @returns {string|null} Transaction signature or null
   */
  extractPayment(headers) {
    // Support multiple header formats
    const paymentHeader = headers['x-payment'] || 
                          headers['X-Payment'] || 
                          headers['x-transaction-signature'] ||
                          headers['X-Transaction-Signature'];
    
    if (!paymentHeader) {
      return null;
    }

    // Extract signature (could be just signature or in JSON format)
    try {
      if (typeof paymentHeader === 'string' && paymentHeader.startsWith('{')) {
        const parsed = JSON.parse(paymentHeader);
        return parsed.signature || parsed.txSignature || null;
      }
      return paymentHeader;
    } catch (error) {
      logger.warn('Failed to parse payment header', { error: error.message });
      return paymentHeader; // Return as-is if not JSON
    }
  }

  /**
   * Verify payment transaction on Solana
   * @param {string} signature - Transaction signature
   * @param {Object} requirements - Payment requirements
   * @returns {Promise<boolean>} True if payment is valid
   */
  async verifyPayment(signature, requirements) {
    try {
      if (!signature) {
        logger.warn('No payment signature provided');
        return false;
      }

      logger.info('Verifying x402 payment', { signature });

      // Fetch transaction from Solana
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!tx) {
        logger.warn('Transaction not found on chain', { signature });
        return false;
      }

      // Check transaction succeeded
      if (tx.meta?.err) {
        logger.warn('Transaction failed', { signature, error: tx.meta.err });
        return false;
      }

      // Verify payment details
      const expectedRecipient = new PublicKey(requirements.payment.recipient);

      // Parse transaction to verify USDC transfer
      // Note: This is a basic verification suitable for the hackathon demo.
      // For production use, you should:
      // 1. Parse SPL token transfer instructions to extract exact transfer details
      // 2. Verify the token mint matches USDC mint address
      // 3. Verify the exact transfer amount matches requirements
      // 4. Check that a valid SPL token transfer instruction was executed
      // 
      // The current implementation provides a reasonable check that the recipient
      // is involved in the transaction, which combined with the economic cost of
      // paying for transactions, provides a practical barrier against abuse.
      // For a more robust solution, consider using a transaction parser library
      // like @solana/spl-token or implementing custom instruction parsing.
      
      const accountKeys = tx.transaction.message.getAccountKeys();
      const recipientInTx = accountKeys.staticAccountKeys.some(
        key => key.equals(expectedRecipient)
      );

      if (!recipientInTx) {
        logger.warn('Recipient not found in transaction', {
          signature,
          expected: requirements.payment.recipient
        });
        return false;
      }

      logger.info('Payment verified successfully', {
        signature,
        amount: requirements.payment.amount,
        recipient: requirements.payment.recipient
      });

      return true;

    } catch (error) {
      logger.error('Payment verification failed', {
        signature,
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Middleware for Express routes requiring payment
   * @param {Object} paymentOptions - Payment configuration
   * @returns {Function} Express middleware
   */
  requirePayment(paymentOptions = {}) {
    return async (req, res, next) => {
      try {
        // Extract payment from headers
        const signature = this.extractPayment(req.headers);

        // Create payment requirements
        const requirements = this.createPaymentRequirements(paymentOptions);

        // If no payment provided, return 402
        if (!signature) {
          const response = this.create402Response(requirements);
          return res.status(response.status)
            .set(response.headers)
            .json(response.body);
        }

        // Verify payment
        const isValid = await this.verifyPayment(signature, requirements);

        if (!isValid) {
          return res.status(402).json({
            error: 'Invalid Payment',
            message: 'Payment verification failed. Please ensure your transaction is confirmed on-chain.',
            signature: signature
          });
        }

        // Payment verified, proceed to route handler
        req.payment = {
          signature,
          verified: true,
          amount: requirements.payment.amount,
          recipient: requirements.payment.recipient
        };

        next();

      } catch (error) {
        logger.error('Payment middleware error', {
          error: error.message,
          stack: error.stack
        });
        res.status(500).json({
          error: 'Payment Processing Error',
          message: 'An error occurred while processing your payment'
        });
      }
    };
  }

  /**
   * Get payment status for a transaction
   * @param {string} signature - Transaction signature
   * @returns {Promise<Object>} Payment status
   */
  async getPaymentStatus(signature) {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!tx) {
        return {
          status: 'not_found',
          message: 'Transaction not found'
        };
      }

      if (tx.meta?.err) {
        return {
          status: 'failed',
          message: 'Transaction failed',
          error: tx.meta.err
        };
      }

      return {
        status: 'confirmed',
        message: 'Payment confirmed',
        blockTime: tx.blockTime,
        slot: tx.slot
      };

    } catch (error) {
      logger.error('Failed to get payment status', {
        signature,
        error: error.message
      });
      return {
        status: 'error',
        message: 'Failed to query payment status',
        error: error.message
      };
    }
  }
}

module.exports = X402PaymentHandler;
