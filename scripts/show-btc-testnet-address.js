const bitcoin = require('bitcoinjs-lib');
const ECPairFactory = require('ecpair').default;
const ecc = require('@bitcoinerlab/secp256k1');
require('dotenv').config();

const ECPair = ECPairFactory(ecc);
const network = bitcoin.networks.testnet;
const keyPair = ECPair.fromWIF(process.env.BTC_WIF, network);
// Convert publicKey to Buffer for compatibility
const pubkeyBuffer = Buffer.from(keyPair.publicKey);
const { address } = bitcoin.payments.p2wpkh({ pubkey: pubkeyBuffer, network });

console.log('Your Bitcoin Testnet Address:', address);
