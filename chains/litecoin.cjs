const axios = require('axios');
require('dotenv').config();

const LTC_ADDRESS = process.env.LTC_ADDRESS || "your_ltc_wallet_address"; 

async function getLtcBalance(address) {
  try {
    const res = await axios.get(`https://sochain.com/api/v2/get_address_balance/LTC/${address}`);
    return parseFloat(res.data.data.confirmed_balance);
  } catch (error) {
    console.error('Error fetching LTC balance:', error);
    return 0;
  }
}

async function sendLtc(to, amount) {
  // This is a placeholder. Real implementation requires proper LTC transaction signing
  throw new Error('sendLtc not implemented. Use a full-featured library or service.');
}

module.exports = { getLtcBalance, sendLtc };