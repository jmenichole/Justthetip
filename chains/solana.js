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

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qAqA7GkFf7i8k3h8J4p3k9Z3b'; // Mainnet USDC mint
const splToken = require('@solana/spl-token');

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
  const tx = new solanaWeb3.Transaction().add(
    splToken.createTransferInstruction(
      fromTokenAccount.address,
      toTokenAccount.address,
      keypair.publicKey,
      amount * 1e6 // USDC has 6 decimals
    )
  );
  const sig = await solanaWeb3.sendAndConfirmTransaction(connection, tx, [keypair]);
  return sig;
}

module.exports = { getSolBalance, sendSol, getUsdcBalance, sendUsdc };
