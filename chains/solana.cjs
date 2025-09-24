// --- Solana connection and keypair setup ---
const solanaWeb3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const fetch = require('node-fetch');
require('dotenv').config();

// Allow custom RPC endpoint via .env, fallback to mainnet-beta
const solanaRpcUrl = process.env.SOLANA_RPC_URL || process.env.SOL_RPC_URL || solanaWeb3.clusterApiUrl('mainnet-beta');
const connection = new solanaWeb3.Connection(solanaRpcUrl);

// Parse private key from .env (must be a JSON array string)
const secret = Uint8Array.from(JSON.parse(process.env.SOL_PRIVATE_KEY));
const keypair = solanaWeb3.Keypair.fromSecretKey(secret);

// Helius configuration for fee rebates
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_REBATE_ADDRESS = process.env.HELIUS_REBATE_ADDRESS;
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// USDC token configuration
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qAqA7GkFf7i8k3h8J4p3k9Z3b'; // Mainnet USDC mint

// Enhanced transaction sending with Helius rebates
async function sendTransactionWithRebate(transaction, signers, description = 'Transaction') {
  try {
    // Sign the transaction
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = keypair.publicKey;
    transaction.sign(...signers);
    
    // Serialize transaction
    const serializedTransaction = transaction.serialize().toString('base64');
    
    console.log(`📡 Sending ${description} with Helius rebate system...`);
    
    // Send transaction with rebate-address parameter
    const response = await fetch(`${HELIUS_RPC_URL}&rebate-address=${HELIUS_REBATE_ADDRESS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sendTransaction',
        params: [
          serializedTransaction,
          {
            skipPreflight: false,
            preflightCommitment: 'processed',
            commitment: 'confirmed'
          }
        ]
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.error('❌ Transaction failed:', result.error);
      throw new Error(`Transaction failed: ${result.error.message}`);
    }
    
    console.log(`✅ ${description} sent:`, result.result);
    console.log('💰 Fee rebates will be paid to:', HELIUS_REBATE_ADDRESS);
    
    return result.result;
  } catch (error) {
    console.error(`❌ Error sending ${description}:`, error);
    // Fallback to regular connection if Helius fails
    console.log('🔄 Falling back to regular transaction...');
    const signature = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, signers);
    return signature;
  }
}

// --- Solana wallet functions ---
async function getSolBalance() {
  const balance = await connection.getBalance(keypair.publicKey);
  return balance / solanaWeb3.LAMPORTS_PER_SOL;
}

async function getUsdcBalance(pubkeyStr) {
  const pubkey = new solanaWeb3.PublicKey(pubkeyStr);
  const tokenAccounts = await connection.getTokenAccountsByOwner(pubkey, { mint: new solanaWeb3.PublicKey(USDC_MINT) });
  let balance = 0;
  for (const acc of tokenAccounts.value) {
    const accInfo = await connection.getParsedAccountInfo(acc.pubkey);
    balance += accInfo.value.data.parsed.info.tokenAmount.uiAmount;
  }
  return balance;
}

async function sendUsdc(to, amount) {
  const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    new solanaWeb3.PublicKey(USDC_MINT),
    keypair.publicKey
  );
  const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    new solanaWeb3.PublicKey(USDC_MINT),
    new solanaWeb3.PublicKey(to)
  );
  
  const transaction = new solanaWeb3.Transaction().add(
    splToken.createTransferInstruction(
      fromTokenAccount.address,
      toTokenAccount.address,
      keypair.publicKey,
      amount * 1e6 // USDC has 6 decimals
    )
  );
  
  return await sendTransactionWithRebate(transaction, [keypair], `USDC transfer (${amount} USDC)`);
}

async function sendSol(to, amount) {
  const transaction = new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new solanaWeb3.PublicKey(to),
      lamports: amount * solanaWeb3.LAMPORTS_PER_SOL
    })
  );
  
  return await sendTransactionWithRebate(transaction, [keypair], `SOL transfer (${amount} SOL)`);
}

module.exports = { getSolBalance, sendSol, getUsdcBalance, sendUsdc };
