/**
 * JustTheTip - Environment Validation Utilities
 * Shared utilities for validating environment variables
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

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

/**
 * Print formatted message to console
 * @param {string} message - Message to log
 * @param {string} color - Color name from colors object
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print a header with decorative lines
 * @param {string} message - Header message
 */
function logHeader(message) {
  const line = '═'.repeat(60);
  log(`\n${line}`, 'cyan');
  log(`${message}`, 'cyan');
  log(`${line}\n`, 'cyan');
}

/**
 * Validate a single environment variable
 * @param {Object} varConfig - Variable configuration
 * @param {string} varConfig.name - Variable name
 * @param {string} varConfig.description - Variable description
 * @param {boolean} varConfig.optional - Whether variable is optional
 * @param {Function} varConfig.validate - Validation function
 * @param {string} varConfig.errorMsg - Error message if validation fails
 * @param {string} varConfig.default - Default value
 * @returns {Object} Validation result with status and name
 */
function validateVar(varConfig) {
  const value = process.env[varConfig.name];
  const exists = value !== undefined && value !== '';
  
  if (!exists) {
    if (varConfig.optional) {
      log(`  ⚠️  ${varConfig.name}: Not set (optional)`, 'yellow');
      if (varConfig.default) {
        log(`      Using default: ${varConfig.default}`, 'cyan');
      }
      if (varConfig.description) {
        log(`      ${varConfig.description}`, 'cyan');
      }
      return { status: 'warning', name: varConfig.name };
    } else {
      log(`  ❌ ${varConfig.name}: MISSING (required)`, 'red');
      if (varConfig.description) {
        log(`      ${varConfig.description}`, 'cyan');
      }
      if (varConfig.errorMsg) {
        log(`      ${varConfig.errorMsg}`, 'cyan');
      }
      return { status: 'error', name: varConfig.name, message: varConfig.errorMsg };
    }
  }
  
  // Run custom validation if provided
  if (varConfig.validate && !varConfig.validate(value)) {
    log(`  ⚠️  ${varConfig.name}: INVALID`, 'yellow');
    if (varConfig.errorMsg) {
      log(`      ${varConfig.errorMsg}`, 'cyan');
    }
    return { status: 'invalid', name: varConfig.name, message: varConfig.errorMsg };
  }
  
  // Mask sensitive values
  const shouldMask = varConfig.name.includes('KEY') || 
                    varConfig.name.includes('TOKEN') || 
                    varConfig.name.includes('SECRET') ||
                    varConfig.name.includes('PASSWORD') ||
                    varConfig.name.includes('URI');
  
  const displayValue = shouldMask
    ? (value.length > 8 ? '***' + value.slice(-4) : '***')
    : (value.length > 50 ? value.slice(0, 47) + '...' : value);
  
  log(`  ✅ ${varConfig.name}: ${displayValue}`, 'green');
  return { status: 'valid', name: varConfig.name, value: displayValue };
}

/**
 * Validate a group of environment variables
 * @param {string} groupName - Name of the group
 * @param {Array} variables - Array of variable configurations
 * @param {string} color - Color for group header
 * @returns {Object} Results object with arrays of valid, warning, error, invalid
 */
function validateGroup(groupName, variables, color = 'yellow') {
  log(`\n${groupName}:`, color);
  
  const results = {
    valid: [],
    warning: [],
    error: [],
    invalid: [],
  };
  
  for (const varConfig of variables) {
    const result = validateVar(varConfig);
    results[result.status].push(result);
  }
  
  return results;
}

/**
 * Print validation summary
 * @param {Object} allResults - Combined results from all groups
 */
function printSummary(allResults) {
  logHeader('Verification Summary');
  
  log(`  ✅ Valid: ${allResults.valid.length}`, 'green');
  log(`  ⚠️  Warnings: ${allResults.warning.length}`, 'yellow');
  log(`  ⚠️  Invalid: ${allResults.invalid.length}`, 'yellow');
  log(`  ❌ Errors: ${allResults.error.length}`, 'red');
  log('');
}

/**
 * Common environment variable definitions
 */
const commonVars = {
  DISCORD_BOT_TOKEN: {
    name: 'DISCORD_BOT_TOKEN',
    description: 'Discord bot token for authentication',
    validate: (val) => val && val.length > 50,
    errorMsg: 'DISCORD_BOT_TOKEN must be set with valid Discord token from Developer Portal',
  },
  DISCORD_CLIENT_ID: {
    name: 'DISCORD_CLIENT_ID',
    description: 'Discord application client ID',
    validate: (val) => val && /^\d+$/.test(val),
    errorMsg: 'DISCORD_CLIENT_ID must be set with numeric Discord application ID',
  },
  MONGODB_URI: {
    name: 'MONGODB_URI',
    description: 'MongoDB connection string for database',
    optional: true,
    validate: (val) => val && (val.startsWith('mongodb://') || val.startsWith('mongodb+srv://')),
    errorMsg: 'MONGODB_URI should be a valid MongoDB connection string',
  },
  SOLANA_RPC_URL: {
    name: 'SOLANA_RPC_URL',
    description: 'Solana RPC endpoint for blockchain operations',
    validate: (val) => val && val.startsWith('https://'),
    errorMsg: 'SOLANA_RPC_URL should be a valid HTTPS URL',
  },
  NODE_ENV: {
    name: 'NODE_ENV',
    description: 'Environment mode',
    optional: true,
    default: 'development',
  },
};

module.exports = {
  colors,
  log,
  logHeader,
  validateVar,
  validateGroup,
  printSummary,
  commonVars,
};
