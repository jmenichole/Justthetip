// Dogecoin support using ECPair from ecpair package
const bitcoin = require('bitcoinjs-lib');
const ECPairFactory = require('ecpair').default;
const ecc = require('@bitcoinerlab/secp256k1');
const axios = require('axios');
require('dotenv').config();

const ECPair = ECPairFactory(ecc);

const network = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: null,
  bip32: { public: 0x02facafd, private: 0x02fac398 },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e
};
const keyPair = ECPair.fromWIF(process.env.DOGE_WIF, network);

async function getDogeBalance(address) {
  // Use a public API for balance (BlockCypher, SoChain, etc.)
  const res = await axios.get(`https://sochain.com/api/v2/get_address_balance/DOGE/${address}`);
  return parseFloat(res.data.data.confirmed_balance);
}

async function sendDoge(to, amount) {
  // This is a placeholder. Real implementation requires UTXO selection, fee calculation, and broadcasting.
  throw new Error('sendDoge not implemented. Use a full-featured library or service.');
}

module.exports = { getDogeBalance, sendDoge };
