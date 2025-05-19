const { validate: validateSolanaAddress } = require('@solana/web3.js');
const { address: btcAddress } = require('bitcoinjs-lib');
const { validate: validateLTCAddress } = require('litecoin-address-validation');

const SUPPORTED_COINS = ['SOL', 'USDC', 'LTC', 'BTC', 'BCH'];

function isValidAmount(amount) {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && /^\d*\.?\d*$/.test(amount);
}

function isSupportedCoin(coin) {
  return SUPPORTED_COINS.includes(coin.toUpperCase());
}

function isValidAddress(address, coin) {
  try {
    switch(coin.toUpperCase()) {
      case 'SOL':
      case 'USDC':
        return validateSolanaAddress(address);
      case 'BTC':
        return btcAddress.toOutputScript(address, btcAddress.networks.testnet);
      case 'LTC':
        return validateLTCAddress(address);
      case 'BCH':
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

module.exports = {
  isValidAmount,
  isSupportedCoin,
  isValidAddress,
  SUPPORTED_COINS
};
