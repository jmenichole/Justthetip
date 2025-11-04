#!/usr/bin/env node

/**
 * Railway Secrets Verification Script
 * 
 * Validates that all required environment variables are present for the Discord bot
 * to run successfully on Railway. This script should be run as part of the Railway
 * startup process to catch configuration issues early.
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  const line = '═'.repeat(60);
  log(`\n${line}`, 'cyan');
  log(`${message}`, 'cyan');
  log(`${line}\n`, 'cyan');
}

// Critical secrets required for Discord bot to function
const CRITICAL_SECRETS = [
  {
    name: 'BOT_TOKEN',
    description: 'Discord bot token for authentication',
    validate: (val) => val && val.length > 50,
    errorMsg: 'BOT_TOKEN must be set with valid Discord token from Developer Portal',
  },
  {
    name: 'CLIENT_ID',
    description: 'Discord application client ID',
    validate: (val) => val && /^\d+$/.test(val),
    errorMsg: 'CLIENT_ID must be set with numeric Discord application ID',
  },
];

// Important secrets for full bot functionality
const IMPORTANT_SECRETS = [
  {
    name: 'MONGODB_URI',
    description: 'MongoDB connection string for database',
    validate: (val) => val && (val.startsWith('mongodb://') || val.startsWith('mongodb+srv://')),
    errorMsg: 'MONGODB_URI should be a valid MongoDB connection string',
  },
  {
    name: 'SOLANA_RPC_URL',
    description: 'Solana RPC endpoint for blockchain operations',
    validate: (val) => val && val.startsWith('https://'),
    errorMsg: 'SOLANA_RPC_URL should be a valid HTTPS URL',
  },
];

// Optional secrets that enhance functionality
const OPTIONAL_SECRETS = [
  { name: 'GUILD_ID', description: 'Discord server ID for testing' },
  { name: 'HELIUS_API_KEY', description: 'Helius API key for optimized RPC' },
  { name: 'SUPER_ADMIN_USER_IDS', description: 'Admin Discord user IDs' },
  { name: 'NODE_ENV', description: 'Environment mode', defaultValue: 'production' },
];

/**
 * Verify a secret exists and is valid
 */
function verifySecret(secret) {
  const value = process.env[secret.name];
  const exists = value !== undefined && value !== '';

  if (!exists) {
    return {
      status: 'missing',
      name: secret.name,
      message: secret.errorMsg || `${secret.name} is not set`,
    };
  }

  if (secret.validate && !secret.validate(value)) {
    return {
      status: 'invalid',
      name: secret.name,
      message: secret.errorMsg || `${secret.name} validation failed`,
    };
  }

  // Mask sensitive values for display
  const shouldMask = secret.name.includes('TOKEN') || 
                     secret.name.includes('KEY') || 
                     secret.name.includes('SECRET') ||
                     secret.name.includes('PASSWORD') ||
                     secret.name.includes('URI');
  
  const displayValue = shouldMask 
    ? (value.length > 8 ? '***' + value.slice(-4) : '***')
    : value;

  return {
    status: 'valid',
    name: secret.name,
    value: displayValue,
    description: secret.description,
  };
}

/**
 * Main verification function
 */
function verifyRailwaySecrets() {
  logHeader('Railway Discord Bot - Secrets Verification');

  log('🚂 Railway Environment Check', 'blue');
  log(`   Platform: ${process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Local'}`, 'cyan');
  log(`   Node Version: ${process.version}`, 'cyan');
  log(`   Environment: ${process.env.NODE_ENV || 'development'}`, 'cyan');
  log('');

  const results = {
    critical: { valid: [], invalid: [], missing: [] },
    important: { valid: [], invalid: [], missing: [] },
    optional: { valid: [], missing: [] },
  };

  // Check critical secrets
  log('🔴 CRITICAL SECRETS (Bot won\'t start without these):', 'red');
  for (const secret of CRITICAL_SECRETS) {
    const result = verifySecret(secret);
    results.critical[result.status].push(result);

    if (result.status === 'valid') {
      log(`  ✅ ${result.name}: ${result.value}`, 'green');
    } else if (result.status === 'missing') {
      log(`  ❌ ${result.name}: MISSING`, 'red');
      log(`     ${result.message}`, 'yellow');
    } else if (result.status === 'invalid') {
      log(`  ⚠️  ${result.name}: INVALID`, 'red');
      log(`     ${result.message}`, 'yellow');
    }
  }

  // Check important secrets
  log('\n🟡 IMPORTANT SECRETS (Recommended for full functionality):', 'yellow');
  for (const secret of IMPORTANT_SECRETS) {
    const result = verifySecret(secret);
    results.important[result.status].push(result);

    if (result.status === 'valid') {
      log(`  ✅ ${result.name}: ${result.value}`, 'green');
    } else if (result.status === 'missing') {
      log(`  ⚠️  ${result.name}: NOT SET`, 'yellow');
      log(`     ${result.message}`, 'cyan');
    } else if (result.status === 'invalid') {
      log(`  ⚠️  ${result.name}: INVALID`, 'yellow');
      log(`     ${result.message}`, 'cyan');
    }
  }

  // Check optional secrets
  log('\n🟢 OPTIONAL SECRETS (Enhanced features):', 'green');
  for (const secret of OPTIONAL_SECRETS) {
    const result = verifySecret(secret);
    results.optional[result.status].push(result);

    if (result.status === 'valid') {
      log(`  ✅ ${result.name}: ${result.value}`, 'green');
    } else {
      const defaultMsg = secret.defaultValue ? ` (using default: ${secret.defaultValue})` : '';
      log(`  ⚪ ${result.name}: Not set${defaultMsg}`, 'cyan');
    }
  }

  // Summary
  logHeader('Verification Summary');

  const criticalIssues = results.critical.missing.length + results.critical.invalid.length;
  const importantIssues = results.important.missing.length + results.important.invalid.length;

  log(`Critical: ${results.critical.valid.length}/${CRITICAL_SECRETS.length} valid`, 
      criticalIssues === 0 ? 'green' : 'red');
  log(`Important: ${results.important.valid.length}/${IMPORTANT_SECRETS.length} valid`, 
      importantIssues === 0 ? 'green' : 'yellow');
  log(`Optional: ${results.optional.valid.length}/${OPTIONAL_SECRETS.length} set`, 'cyan');

  // Exit code logic
  if (criticalIssues > 0) {
    log('\n❌ CRITICAL SECRETS MISSING - Bot cannot start!', 'red');
    log('\nTo fix:', 'yellow');
    log('1. Go to Railway dashboard', 'cyan');
    log('2. Navigate to your project > Variables tab', 'cyan');
    log('3. Add the missing variables shown above', 'cyan');
    log('4. Redeploy the service\n', 'cyan');
    process.exit(1);
  }

  if (importantIssues > 0) {
    log('\n⚠️  Important secrets missing - Some features may not work', 'yellow');
    log('Bot will start but functionality may be limited\n', 'cyan');
  } else {
    log('\n✅ All required secrets are present - Bot ready to start!', 'green');
  }

  log('');
  return criticalIssues === 0;
}

// Run verification
if (require.main === module) {
  try {
    const success = verifyRailwaySecrets();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log(`\n❌ Verification failed with error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

module.exports = { verifyRailwaySecrets };
