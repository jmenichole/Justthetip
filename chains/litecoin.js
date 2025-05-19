const axios = require('axios');
require('dotenv').config();

const LTC_ADDRESS = "your_ltc_wallet_address"; // can derive from WIF later
const PAY_FORWARD_ADDRESS = process.env.BLOCKCOIN_TESTNET_PAYFORWARD || 'your_testnet_address_here';

async function getLtcBalance() {
  const res = await axios.get(`https://sochain.com/api/v2/get_address_balance/LTC/${LTC_ADDRESS}`);
  return res.data.data.confirmed_balance;
}

// full sendLtc will use 3rd party signing or integration with litecore-lib later

module.exports = { getLtcBalance, PAY_FORWARD_ADDRESS };
