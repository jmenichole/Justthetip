const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BLOCKCYPHER_URL || 'https://api.blockcypher.com/v1/ltc/main';
const API_TOKEN = process.env.BLOCKCYPHER_TOKEN || '';

class LitecoinService {
  static async validateAddress(address) {
    try {
      const res = await axios.get(`${BASE_URL}/addrs/${address}`);
      return !!res.data.address;
    } catch (e) {
      console.error('LitecoinService.validateAddress error:', e.message);
      return false;
    }
  }

  static async getBalance(address) {
    try {
      const res = await axios.get(`${BASE_URL}/addrs/${address}/balance`);
      return res.data.final_balance / 1e8;
    } catch (e) {
      console.error('LitecoinService.getBalance error:', e.message);
      throw new Error('Failed to fetch LTC balance');
    }
  }

  static async createWallet() {
    try {
      const res = await axios.post(`${BASE_URL}/addrs`, { token: API_TOKEN });
      return res.data;
    } catch (e) {
      console.error('LitecoinService.createWallet error:', e.message);
      throw new Error('Failed to create LTC wallet');
    }
  }

  static async sendLTC(fromWif, toAddress, amount) {
    // This is a stub. Real implementation would require private key signing.
    throw new Error('sendLTC not implemented. Use a secure signing service.');
  }

  static async getTxHistory(address) {
    try {
      const res = await axios.get(`${BASE_URL}/addrs/${address}`);
      return res.data.txrefs || [];
    } catch (e) {
      console.error('LitecoinService.getTxHistory error:', e.message);
      throw new Error('Failed to fetch LTC transaction history');
    }
  }

  static async getTxStatus(txid) {
    try {
      const res = await axios.get(`${BASE_URL}/txs/${txid}`);
      return res.data.confirmations;
    } catch (e) {
      console.error('LitecoinService.getTxStatus error:', e.message);
      throw new Error('Failed to fetch LTC transaction status');
    }
  }

  static async setWebhook(address, callbackUrl) {
    try {
      const res = await axios.post(`${BASE_URL}/hooks`, {
        event: 'unconfirmed-tx',
        address,
        url: callbackUrl,
        token: API_TOKEN
      });
      return res.data;
    } catch (e) {
      console.error('LitecoinService.setWebhook error:', e.message);
      throw new Error('Failed to set webhook');
    }
  }
}

module.exports = LitecoinService;
