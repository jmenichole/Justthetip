const { validate: validateSolanaAddress } = require('@solana/web3.js');
const { address: btcAddress } = require('bitcoinjs-lib');

const SUPPORTED_COINS = ['SOL'];

function isValidAmount(amount) {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && /^\d*\.?\d*$/.test(amount);
}

function isSupportedCoin(coin) {
  return coin && coin.toUpperCase() === 'SOL';
}

function isValidAddress(address, coin) {
  try {
    return coin && coin.toUpperCase() === 'SOL' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  } catch {
    return false;
  }
}

function isValidLTCAddress(address) {
  // Litecoin addresses start with L, M, or 3 (legacy), or ltc1 (bech32)
  return (
    /^([LM3][a-km-zA-HJ-NP-Z1-9]{26,33})$/.test(address) ||
    /^(ltc1)[a-zA-HJ-NP-Z0-9]{39,59}$/.test(address)
  );
}

function isValidETHAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isValidDOGEAddress(address) {
  return /^D{1}[5-9A-HJ-NP-Ua-km-z]{33}$/.test(address) || /^(doge1)[a-zA-HJ-NP-Z0-9]{39,59}$/.test(address);
}

function isValidMATICAddress(address) {
  // Polygon uses Ethereum address format
  return isValidETHAddress(address);
}

const inputValidation = {
  isValidAmount,
  isSupportedCoin,
  isValidAddress: (address, coin) => {
    if (!address || typeof address !== 'string') return false;
    address = address.trim();
    switch(coin.toUpperCase()) {
      case 'SOL':
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      case 'USDC':
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      case 'BTC':
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^(bc1)[a-zA-HJ-NP-Z0-9]{8,87}$/.test(address);
      case 'LTC':
        return isValidLTCAddress(address);
      case 'BCH':
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^(bitcoincash:)?[qp][a-z0-9]{41}$/.test(address);
      case 'ETH':
        return isValidETHAddress(address);
      case 'DOGE':
        return isValidDOGEAddress(address);
      case 'MATIC':
        return isValidMATICAddress(address);
      default:
        return false;
    }
  },
  SUPPORTED_COINS
};

module.exports = inputValidation;
