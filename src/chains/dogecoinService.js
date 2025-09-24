// Dogecoin service using BlockCypher API
const axios = require('axios');
require('dotenv').config();

const DOGE_API_URL = process.env.DOGE_API_URL || 'https://api.blockcypher.com/v1/doge/main';
const DOGE_API_TOKEN = process.env.DOGE_API_TOKEN || '';

class DogecoinService {
  static async getBalance(address) {
    try {
      const res = await axios.get(`${DOGE_API_URL}/addrs/${address}/balance`);
      return res.data.final_balance / 1e8;
    } catch (e) {
      console.error('DogecoinService.getBalance error:', e.message);
      throw new Error('Failed to fetch DOGE balance');
    }
  }

  // Sending DOGE would require private key signing, which is not implemented here for security.
  static async sendDOGE(/*fromWif, toAddress, amount*/) {
    throw new Error('sendDOGE not implemented. Use a secure signing service.');
  }
}

module.exports = DogecoinService;
