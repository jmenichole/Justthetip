'use strict';

const bs58 = require('bs58');
const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');
const logger = require('./logger');

const DEFAULT_CLUSTER = 'devnet';
const COMMITMENT = 'confirmed';

let cachedConnection = null;

function getConnection() {
  if (!cachedConnection) {
    const endpoint = process.env.X402_RPC_URL || clusterApiUrl(DEFAULT_CLUSTER);
    cachedConnection = new Connection(endpoint, COMMITMENT);
    logger.info(`[x402] Connected to ${endpoint}`);
  }

  return cachedConnection;
}

function loadKeypair(secret) {
  if (!secret) {
    throw new Error('Missing secret key for x402 payment client');
  }

  try {
    if (Array.isArray(secret)) {
      return Keypair.fromSecretKey(Uint8Array.from(secret));
    }

    if (Buffer.isBuffer(secret)) {
      return Keypair.fromSecretKey(Uint8Array.from(secret));
    }

    if (typeof secret === 'string') {
      return Keypair.fromSecretKey(bs58.decode(secret.trim()));
    }

    throw new Error('Unsupported secret key format. Provide base58 string or byte array.');
  } catch (error) {
    throw new Error(`Failed to load signing key: ${error.message}`);
  }
}

async function sendPayment({
  fromSecret,
  toAddress,
  amountLamports,
  reference,
}) {
  const connection = getConnection();
  const payer = loadKeypair(fromSecret);

  try {
    const destination = new PublicKey(toAddress);
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: destination,
      lamports: amountLamports,
    });

    const tx = new Transaction({
      feePayer: payer.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    }).add(transferInstruction);

    const signature = await connection.sendTransaction(tx, [payer], {
      skipPreflight: false,
      preflightCommitment: COMMITMENT,
    });

    logger.info(`[x402] Sent ${amountLamports} lamports from ${payer.publicKey} to ${destination} (ref: ${reference || 'n/a'})`);

    await connection.confirmTransaction(signature, COMMITMENT);

    return { signature, destination: destination.toBase58(), amountLamports };
  } catch (error) {
    logger.error(`[x402] Payment failed: ${error.message}`);
    throw error;
  }
}

async function getTransactionStatus(signature) {
  const connection = getConnection();

  try {
    const status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
    const info = status.value;

    if (!info) {
      return { signature, status: 'unknown' };
    }

    if (info.err) {
      return { signature, status: 'failed', error: info.err };
    }

    return {
      signature,
      status: info.confirmationStatus || 'confirmed',
      slot: info.slot,
    };
  } catch (error) {
    logger.error(`[x402] Failed to fetch transaction status for ${signature}: ${error.message}`);
    throw error;
  }
}

async function getBalance(publicKey) {
  const connection = getConnection();
  const address = new PublicKey(publicKey);
  const lamports = await connection.getBalance(address);

  return {
    lamports,
    sol: lamports / LAMPORTS_PER_SOL,
  };
}

module.exports = {
  sendPayment,
  getTransactionStatus,
  getBalance,
  getConnection,
};
