#!/usr/bin/env node

/**
 * Environment Variable Verification Script
 * 
 * Validates that all required environment variables are set before starting the bot.
 * This helps catch configuration issues early in development and deployment.
 */

const fs = require('fs');
const path = require('path');
const {
  log,
  logHeader,
  validateVar,
  validateGroup,
  printSummary,
  commonVars,
} = require('../src/utils/envValidation');

// Required environment variables for different bot modes
const requiredVars = {
  common: [
    { name: 'DISCORD_BOT_TOKEN', description: 'Discord bot token from Developer Portal' },
    { name: 'DISCORD_CLIENT_ID', description: 'Discord application client ID' },
    { name: 'NODE_ENV', description: 'Environment (development/production)', optional: true, default: 'development' },
  ],
  smartContract: [
    { name: 'SOLANA_RPC_URL', description: 'Solana RPC endpoint (mainnet/devnet)' },
  ],
  legacy: [
    { name: 'MONGODB_URI', description: 'MongoDB connection string' },
    { name: 'SOLANA_RPC_URL', description: 'Solana RPC endpoint' },
  ],
  optional: [
    { name: 'GUILD_ID', description: 'Discord guild ID for testing', optional: true },
    { name: 'HELIUS_API_KEY', description: 'Helius API key for optimized RPC', optional: true },
    { name: 'SUPER_ADMIN_USER_IDS', description: 'Comma-separated admin Discord IDs', optional: true },
    { name: 'DATABASE_URL', description: 'PostgreSQL connection string', optional: true },
  ],
};

// Security warnings for sensitive variables
const securityWarnings = [
  { name: 'SOL_PRIVATE_KEY', message: 'Private keys should use secure secrets management in production' },
  { name: 'LTC_WALLET_KEY', message: 'Private keys should use secure secrets management in production' },
  { name: 'ETH_PRIVATE_KEY', message: 'Private keys should use secure secrets management in production' },
];

/**
 * Check if .env file exists
 */
function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    log('\n❌ ERROR: .env file not found!', 'red');
    log('\nPlease create a .env file based on .env.example:', 'yellow');
    log('  cp .env.example .env', 'cyan');
    log('\nThen configure the required variables.\n', 'yellow');
    return false;
  }
  return true;
}

/**
 * Load environment variables
 */
function loadEnv() {
  try {
    require('dotenv').config();
    return true;
  } catch (error) {
    log(`\n❌ ERROR: Failed to load .env file: ${error.message}`, 'red');
    return false;
  }
}

// Note: validateVar is now imported from shared utils

/**
 * Check for security issues
 */
function checkSecurity() {
  const warnings = [];
  const isProduction = process.env.NODE_ENV === 'production';
  
  for (const warning of securityWarnings) {
    const value = process.env[warning.name];
    if (value && value !== '' && value !== '[]') {
      if (isProduction) {
        warnings.push(`${warning.name}: ${warning.message}`);
      }
    }
  }
  
  return warnings;
}

/**
 * Determine bot mode based on command line args or npm script
 */
function getBotMode() {
  const args = process.argv.slice(2);
  const npmScript = process.env.npm_lifecycle_event;
  
  if (args.includes('--smart-contract') || npmScript === 'start:smart-contract') {
    return 'smart-contract';
  } else if (args.includes('--legacy') || npmScript === 'start:bot') {
    return 'legacy';
  }
  // Default to smart contract mode
  return 'smart-contract';
}

/**
 * Main verification function
 */
function verifyEnvironment() {
  logHeader('JustTheTip Environment Variable Verification');
  
  // Check .env file exists
  if (!checkEnvFile()) {
    process.exit(1);
  }
  
  // Load environment variables
  if (!loadEnv()) {
    process.exit(1);
  }
  
  const botMode = getBotMode();
  const modeDisplayName = botMode === 'smart-contract' ? 'Smart Contract (Non-custodial)' : 'Legacy (Custodial)';
  log(`Bot Mode: ${modeDisplayName}`, 'blue');
  log(`Environment: ${process.env.NODE_ENV || 'development'}`, 'blue');
  log('');
  
  const results = {
    ok: [],
    warning: [],
    error: [],
  };
  
  // Check common variables
  log('Common Variables:', 'yellow');
  for (const varConfig of requiredVars.common) {
    const result = validateVar(varConfig);
    // Map 'valid' status to 'ok' for results buckets
    const status = result.status === 'valid' ? 'ok' : result.status;
    if (results[status]) {
      results[status].push(result.name);
    }
  }
  
  // Check mode-specific variables
  const modeVarsKey = botMode === 'smart-contract' ? 'smartContract' : 'legacy';
  log(`\n${modeDisplayName} Mode Variables:`, 'yellow');
  const modeVars = requiredVars[modeVarsKey];
  for (const varConfig of modeVars) {
    const result = validateVar(varConfig);
    // Map 'valid' status to 'ok' for results buckets
    const status = result.status === 'valid' ? 'ok' : result.status;
    if (results[status]) {
      results[status].push(result.name);
    }
  }
  
  // Check optional variables
  log('\nOptional Variables:', 'yellow');
  for (const varConfig of requiredVars.optional) {
    const result = validateVar(varConfig);
    // Map 'valid' status to 'ok' for results buckets
    const status = result.status === 'valid' ? 'ok' : result.status;
    if (results[status]) {
      results[status].push(result.name);
    }
  }
  
  // Security check
  const securityWarningsList = checkSecurity();
  if (securityWarningsList.length > 0) {
    log('\n⚠️  Security Warnings:', 'yellow');
    for (const warning of securityWarningsList) {
      log(`  • ${warning}`, 'yellow');
    }
    log('\n  Consider using AWS Secrets Manager, HashiCorp Vault, or similar.', 'cyan');
  }
  
  // Summary - use shared utility
  const allResults = {
    valid: results.ok,
    warning: results.warning,
    error: results.error,
    invalid: [],
  };
  printSummary(allResults);
  
  // Exit with appropriate code
  if (results.error.length > 0) {
    log('❌ Environment verification failed. Please fix the errors above.\n', 'red');
    process.exit(1);
  } else if (results.warning.length > 0) {
    log('⚠️  Environment verification completed with warnings.\n', 'yellow');
    log('You can proceed, but some optional features may not work.\n', 'yellow');
    process.exit(0);
  } else {
    log('✅ Environment verification successful!\n', 'green');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  verifyEnvironment();
}

module.exports = { verifyEnvironment };
