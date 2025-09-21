// Input validation utilities for JustTheTip bot
const crypto = require('crypto');

class InputValidation {
  isValidAmount(amount) {
    return typeof amount === 'number' && amount > 0 && amount <= 1000000 && !isNaN(amount);
  }

  isSupportedCoin(coin) {
    const supported = ['SOL', 'USDC', 'LTC'];
    return supported.includes(coin.toUpperCase());
  }

  isValidAddress(address, coin) {
    if (!address || typeof address !== 'string') return false;
    
    switch (coin.toUpperCase()) {
      case 'SOL':
        return address.length >= 32 && address.length <= 44;
      case 'USDC':
        return address.length >= 32 && address.length <= 44;
      case 'LTC':
        return address.startsWith('L') || address.startsWith('M') || address.startsWith('ltc1');
      default:
        return false;
    }
  }

  sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '').trim().slice(0, 100);
  }
}

module.exports = new InputValidation();