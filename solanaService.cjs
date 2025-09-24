const axios = require('axios');
const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
require('dotenv').config();

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '074efb1f-0838-4334-839b-2f5780b43eca';
const BASE_URL = 'https://api.helius.xyz/v0';
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SOL_PRIVATE_KEY = process.env.SOL_PRIVATE_KEY ? JSON.parse(process.env.SOL_PRIVATE_KEY) : null;

class SolanaService {
  static async getBalance(address) {
    try {
      if (!HELIUS_API_KEY) {
        console.error('SolanaService.getBalance error: Missing HELIUS_API_KEY in environment variables');
        throw new Error('Missing HELIUS_API_KEY in environment variables');
      }

      const url = `${BASE_URL}/addresses/${address}/balances?api-key=${HELIUS_API_KEY}`;
      const res = await axios.get(url);
      return res.data.nativeBalance / 1e9;
    } catch (e) {
      console.error('SolanaService.getBalance error:', e.message);
      throw new Error('Failed to fetch SOL balance');
    }
  }

  static async createAndSignTransaction(from, to, amount, signer) {
    // Stub: Implement with proper Solana signing libraries
    throw new Error('createAndSignTransaction not implemented.');
  }

  static async transferSOL(from, to, amount, signer) {
    // from: public key string (bot wallet), to: public key string (recipient), amount: in SOL, signer: Keypair
    if (!SOLANA_RPC_URL || !SOL_PRIVATE_KEY) throw new Error('Missing SOLANA_RPC_URL or SOL_PRIVATE_KEY in env');
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const fromPubkey = new PublicKey(from);
    const toPubkey = new PublicKey(to);
    const keypair = signer || Keypair.fromSecretKey(Uint8Array.from(SOL_PRIVATE_KEY));
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports
      })
    );
    const signature = await sendAndConfirmTransaction(connection, tx, [keypair]);
    return signature;
  }

  static async getTxStatus(signature) {
    try {
      const url = `${BASE_URL}/transactions/${signature}?api-key=${HELIUS_API_KEY}`;
      const res = await axios.get(url);
      return res.data.status;
    } catch (e) {
      console.error('SolanaService.getTxStatus error:', e.message);
      throw new Error('Failed to fetch SOL transaction status');
    }
  }

  static async parseTransaction(signature) {
    try {
      const url = `${BASE_URL}/transactions/${signature}?api-key=${HELIUS_API_KEY}`;
      const res = await axios.get(url);
      return res.data;
    } catch (e) {
      console.error('SolanaService.parseTransaction error:', e.message);
      throw new Error('Failed to parse SOL transaction');
    }
  }

  static async monitorAddress(address) {
    try {
      const url = `${BASE_URL}/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}`;
      const res = await axios.get(url);
      return res.data;
    } catch (e) {
      console.error('SolanaService.monitorAddress error:', e.message);
      throw new Error('Failed to monitor SOL address');
    }
  }
}

module.exports = SolanaService;
