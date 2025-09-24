// JustTheTip Smart Contract Integration
// Non-custodial Solana smart contract functionality

const { Connection, PublicKey, SystemProgram, Transaction, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const bs58 = require('bs58');

class JustTheTipSmartContract {
  constructor(rpcUrl = null) {
    this.connection = new Connection(
      rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    // Program ID (would be your deployed smart contract)
    this.programId = new PublicKey('11111111111111111111111111111112'); // Placeholder
    
    // Token mint addresses for supported tokens
    this.tokens = {
      SOL: null, // Native SOL
      USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC on Solana
      // Add more tokens as needed
    };
  }

  // Generate Program Derived Address for user
  async generateUserPDA(discordUserId) {
    const seeds = [
      Buffer.from('justthetip'),
      Buffer.from('user'),
      Buffer.from(discordUserId)
    ];
    
    try {
      const [pda, bump] = PublicKey.findProgramAddressSync(seeds, this.programId);
      return { 
        address: pda.toString(), 
        bump,
        publicKey: pda 
      };
    } catch (error) {
      console.error('Error generating PDA:', error);
      throw new Error('Failed to generate Program Derived Address');
    }
  }

  // Get wallet balance for SOL
  async getSolBalance(walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting SOL balance:', error);
      return 0;
    }
  }

  // Get token balance (USDC, etc.)
  async getTokenBalance(walletAddress, tokenMint) {
    try {
      const walletPublicKey = new PublicKey(walletAddress);
      const mintPublicKey = new PublicKey(tokenMint);
      
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        walletPublicKey,
        { mint: mintPublicKey }
      );
      
      if (tokenAccounts.value.length === 0) {
        return 0;
      }
      
      const tokenAccount = tokenAccounts.value[0];
      const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount.pubkey);
      
      return parseFloat(accountInfo.value.uiAmount) || 0;
    } catch (error) {
      console.error('Error getting token balance:', error);
      return 0;
    }
  }

  // Create SOL transfer instruction
  createSolTransferInstruction(senderAddress, recipientAddress, amount) {
    try {
      const sender = new PublicKey(senderAddress);
      const recipient = new PublicKey(recipientAddress);
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      
      return SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: recipient,
        lamports
      });
    } catch (error) {
      console.error('Error creating SOL transfer:', error);
      throw error;
    }
  }

  // Create token transfer instruction
  async createTokenTransferInstruction(senderAddress, recipientAddress, amount, tokenMint) {
    try {
      const sender = new PublicKey(senderAddress);
      const recipient = new PublicKey(recipientAddress);
      const mint = new PublicKey(tokenMint);
      
      // Get sender's token account
      const senderTokenAccounts = await this.connection.getTokenAccountsByOwner(
        sender,
        { mint }
      );
      
      if (senderTokenAccounts.value.length === 0) {
        throw new Error('Sender has no token account for this token');
      }
      
      const senderTokenAccount = senderTokenAccounts.value[0].pubkey;
      
      // Get or create recipient's token account
      const recipientTokenAccounts = await this.connection.getTokenAccountsByOwner(
        recipient,
        { mint }
      );
      
      let recipientTokenAccount;
      if (recipientTokenAccounts.value.length === 0) {
        // Create associated token account instruction
        const { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } = require('@solana/spl-token');
        recipientTokenAccount = await getAssociatedTokenAddress(mint, recipient);
        
        return [
          createAssociatedTokenAccountInstruction(
            sender, // payer
            recipientTokenAccount,
            recipient,
            mint
          ),
          // Token transfer instruction would go here
        ];
      } else {
        recipientTokenAccount = recipientTokenAccounts.value[0].pubkey;
      }
      
      // Create transfer instruction (this would use your custom program)
      return this.createCustomTokenTransfer(senderTokenAccount, recipientTokenAccount, amount);
      
    } catch (error) {
      console.error('Error creating token transfer:', error);
      throw error;
    }
  }

  // Create custom token transfer (placeholder for your smart contract logic)
  createCustomTokenTransfer(senderTokenAccount, recipientTokenAccount, amount) {
    // This would be replaced with your actual smart contract instruction
    // For now, returning a basic transfer instruction
    return SystemProgram.transfer({
      fromPubkey: senderTokenAccount,
      toPubkey: recipientTokenAccount,
      lamports: amount * LAMPORTS_PER_SOL
    });
  }

  // Create complete transaction
  async createTipTransaction(senderAddress, recipientAddress, amount, tokenType = 'SOL') {
    try {
      const transaction = new Transaction();
      
      if (tokenType === 'SOL') {
        const instruction = this.createSolTransferInstruction(senderAddress, recipientAddress, amount);
        transaction.add(instruction);
      } else {
        const tokenMint = this.tokens[tokenType];
        if (!tokenMint) {
          throw new Error(`Unsupported token: ${tokenType}`);
        }
        
        const instructions = await this.createTokenTransferInstruction(
          senderAddress, 
          recipientAddress, 
          amount, 
          tokenMint
        );
        
        if (Array.isArray(instructions)) {
          instructions.forEach(ix => transaction.add(ix));
        } else {
          transaction.add(instructions);
        }
      }
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(senderAddress);
      
      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  // Validate Solana address
  isValidSolanaAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  // Serialize transaction for signing
  serializeTransaction(transaction) {
    try {
      return transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      });
    } catch (error) {
      console.error('Error serializing transaction:', error);
      throw error;
    }
  }

  // Create transaction signature URL
  createSignatureUrl(transaction) {
    try {
      const serialized = this.serializeTransaction(transaction);
      const base58Transaction = bs58.encode(serialized);
      
      // Return URL that can be used with wallet adapters
      return {
        serializedTransaction: base58Transaction,
        phantomUrl: `https://phantom.app/ul/browse/https://justthetip.com/sign?tx=${base58Transaction}`,
        solflareUrl: `https://solflare.com/ul/v1/browse/https://justthetip.com/sign?tx=${base58Transaction}`
      };
    } catch (error) {
      console.error('Error creating signature URL:', error);
      throw error;
    }
  }

  // Estimate transaction fee
  async estimateTransactionFee(transaction) {
    try {
      const fee = await this.connection.getFeeForMessage(
        transaction.compileMessage(),
        'confirmed'
      );
      return (fee.value || 5000) / LAMPORTS_PER_SOL; // Default to 5000 lamports if unable to estimate
    } catch (error) {
      console.error('Error estimating fee:', error);
      return 0.005; // Default fee estimate
    }
  }

  // Check transaction status
  async checkTransactionStatus(signature) {
    try {
      const status = await this.connection.getSignatureStatus(signature);
      return {
        confirmed: status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized',
        error: status.value?.err,
        confirmationStatus: status.value?.confirmationStatus
      };
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return { confirmed: false, error: 'Failed to check status' };
    }
  }

  // Create airdrop transaction (for devnet/testnet)
  async createAirdropTransaction(recipientAddress, amount) {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Airdrops not available on mainnet');
      }
      
      const recipient = new PublicKey(recipientAddress);
      const signature = await this.connection.requestAirdrop(
        recipient,
        amount * LAMPORTS_PER_SOL
      );
      
      return signature;
    } catch (error) {
      console.error('Error creating airdrop:', error);
      throw error;
    }
  }
}

module.exports = JustTheTipSmartContract;