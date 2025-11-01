#!/usr/bin/env node

/**
 * Environment Variable Verification Script
 * 
 * Validates that all required environment variables are set before starting the bot.
 * This helps catch configuration issues early in development and deployment.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Required environment variables for different bot modes
const requiredVars = {
  common: [
    { name: 'BOT_TOKEN', description: 'Discord bot token from Developer Portal' },
    { name: 'CLIENT_ID', description: 'Discord application client ID' },
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
 * Print formatted message to console
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

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

/**
 * Validate a single environment variable
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
      return { status: 'error', name: varConfig.name };
    }
  } else {
    // Mask sensitive values
    const displayValue = varConfig.name.includes('KEY') || 
                        varConfig.name.includes('TOKEN') || 
                        varConfig.name.includes('SECRET') ||
                        varConfig.name.includes('PASSWORD')
      ? '***' + value.slice(-4)
      : value.length > 50 ? value.slice(0, 47) + '...' : value;
    
    log(`  ✅ ${varConfig.name}: ${displayValue}`, 'green');
    return { status: 'ok', name: varConfig.name };
  }
}

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
  if (args.includes('--smart-contract') || process.env.npm_lifecycle_event === 'start:smart-contract') {
    return 'smartContract';
  } else if (args.includes('--legacy') || process.env.npm_lifecycle_event === 'start:bot') {
    return 'legacy';
  }
  // Default to smart contract mode
  return 'smartContract';
}

/**
 * Main verification function
 */
function verifyEnvironment() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('  JustTheTip Environment Variable Verification', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');
  
  // Check .env file exists
  if (!checkEnvFile()) {
    process.exit(1);
  }
  
  // Load environment variables
  if (!loadEnv()) {
    process.exit(1);
  }
  
  const botMode = getBotMode();
  log(`Bot Mode: ${botMode === 'smartContract' ? 'Smart Contract (Non-custodial)' : 'Legacy (Custodial)'}`, 'blue');
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
    results[result.status].push(result.name);
  }
  
  // Check mode-specific variables
  log(`\n${botMode === 'smartContract' ? 'Smart Contract' : 'Legacy'} Mode Variables:`, 'yellow');
  const modeVars = requiredVars[botMode];
  for (const varConfig of modeVars) {
    const result = validateVar(varConfig);
    results[result.status].push(result.name);
  }
  
  // Check optional variables
  log('\nOptional Variables:', 'yellow');
  for (const varConfig of requiredVars.optional) {
    const result = validateVar(varConfig);
    results[result.status].push(result.name);
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
  
  // Summary
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Summary:', 'cyan');
  log(`  ✅ OK: ${results.ok.length}`, 'green');
  log(`  ⚠️  Warnings: ${results.warning.length}`, 'yellow');
  log(`  ❌ Errors: ${results.error.length}`, 'red');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');
  
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
