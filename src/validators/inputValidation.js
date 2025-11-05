/**
 * JustTheTip - Input Validation Module
 * Input validation utilities for JustTheTip bot
 * 
 * Copyright (c) 2025 JustTheTip Bot
 * 
 * This file is part of JustTheTip.
 * 
 * Licensed under the JustTheTip Custom License (Based on MIT).
 * See LICENSE file in the project root for full license information.
 * 
 * SPDX-License-Identifier: MIT
 * 
 * This software may not be sold commercially without permission.
 */

// Import shared validation utilities
const {
  isValidAmount,
  isSupportedCoin,
  isValidAddress,
  sanitizeString,
} = require('../utils/validation');

// Re-export as a class for backward compatibility
class InputValidation {
  isValidAmount(amount) {
    return isValidAmount(amount);
  }

  isSupportedCoin(coin) {
    return isSupportedCoin(coin);
  }

  isValidAddress(address, coin) {
    return isValidAddress(address, coin);
  }

  sanitizeString(str) {
    return sanitizeString(str);
  }
}

module.exports = new InputValidation();