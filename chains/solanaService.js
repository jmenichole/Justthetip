const axios = require('axios');
require('dotenv').config();

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '074efb1f-0838-4334-839b-2f5780b43eca';
const BASE_URL = 'https://api.helius.xyz/v0';

class SolanaService {
  static async getBalance(address) {
    try {
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
    // Stub: Implement with proper Solana signing libraries
    throw new Error('transferSOL not implemented.');
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
