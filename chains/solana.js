// --- Solana connection and keypair setup ---
const solanaWeb3 = require('@solana/web3.js');
require('dotenv').config();

// Allow custom RPC endpoint via .env, fallback to mainnet-beta
const solanaRpcUrl = process.env.SOL_RPC_URL || solanaWeb3.clusterApiUrl('mainnet-beta');
const connection = new solanaWeb3.Connection(solanaRpcUrl);

// Parse private key from .env (must be a JSON array string)
const secret = Uint8Array.from(JSON.parse(process.env.SOL_PRIVATE_KEY));
const keypair = solanaWeb3.Keypair.fromSecretKey(secret);

// --- Solana wallet functions ---
async function getSolBalance() {
  const balance = await connection.getBalance(keypair.publicKey);
  return balance / solanaWeb3.LAMPORTS_PER_SOL;
}

async function sendSol(to, amount) {
  const tx = await solanaWeb3.sendAndConfirmTransaction(
    connection,
    new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: new solanaWeb3.PublicKey(to),
        lamports: amount * solanaWeb3.LAMPORTS_PER_SOL
      })
    ),
    [keypair]
  );
  return tx;
}

module.exports = { getSolBalance, sendSol };
