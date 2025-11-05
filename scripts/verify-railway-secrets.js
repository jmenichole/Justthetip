#!/usr/bin/env node

/**
 * Railway Secrets Verification Script
 * 
 * Validates that all required environment variables are present for the Discord bot
 * to run successfully on Railway. This script should be run as part of the Railway
 * startup process to catch configuration issues early.
 */

const {
  log,
  logHeader,
  validateVar,
  commonVars,
} = require('../src/utils/envValidation');

// Critical secrets required for Discord bot to function
const CRITICAL_SECRETS = [
  commonVars.DISCORD_BOT_TOKEN,
  commonVars.DISCORD_CLIENT_ID,
];

// Important secrets for full bot functionality
const IMPORTANT_SECRETS = [
  commonVars.MONGODB_URI,
  commonVars.SOLANA_RPC_URL,
];

// Optional secrets that enhance functionality
const OPTIONAL_SECRETS = [
  { name: 'GUILD_ID', description: 'Discord server ID for testing' },
  { name: 'HELIUS_API_KEY', description: 'Helius API key for optimized RPC' },
  { name: 'SUPER_ADMIN_USER_IDS', description: 'Admin Discord user IDs' },
  { name: 'NODE_ENV', description: 'Environment mode', defaultValue: 'production', optional: true },
];

// Note: validateVar from shared utils replaces verifySecret

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
    optional: { valid: [], missing: [], invalid: [] },
  };

  // Check critical secrets
  log('🔴 CRITICAL SECRETS (Bot won\'t start without these):', 'red');
  for (const secret of CRITICAL_SECRETS) {
    const result = validateVar(secret);
    // Map 'error' status to 'missing' for critical secrets
    const status = result.status === 'error' ? 'missing' : result.status;
    results.critical[status].push(result);

    if (result.status === 'valid') {
      log(`  ✅ ${result.name}: ${result.value}`, 'green');
    } else if (result.status === 'error' || result.status === 'missing') {
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
    const result = validateVar(secret);
    // Map 'error' and 'warning' status to 'missing' for important secrets
    let status = result.status;
    if (status === 'error' || status === 'warning') {
      status = 'missing';
    }
    results.important[status].push(result);

    if (result.status === 'valid') {
      log(`  ✅ ${result.name}: ${result.value}`, 'green');
    } else if (result.status === 'error' || result.status === 'warning' || result.status === 'missing') {
      log(`  ⚠️  ${result.name}: NOT SET`, 'yellow');
      if (result.message) {
        log(`     ${result.message}`, 'cyan');
      }
    } else if (result.status === 'invalid') {
      log(`  ⚠️  ${result.name}: INVALID`, 'yellow');
      if (result.message) {
        log(`     ${result.message}`, 'cyan');
      }
    }
  }

  // Check optional secrets
  log('\n🟢 OPTIONAL SECRETS (Enhanced features):', 'green');
  for (const secret of OPTIONAL_SECRETS) {
    const result = validateVar(secret);
    // Map 'warning' and 'error' status to 'missing' for optional secrets
    let status = result.status;
    if (status === 'warning' || status === 'error') {
      status = 'missing';
    }
    results.optional[status].push(result);

    if (result.status === 'valid') {
      log(`  ✅ ${result.name}: ${result.value}`, 'green');
    } else if (result.status === 'invalid') {
      log(`  ⚠️  ${result.name}: INVALID`, 'yellow');
      if (result.message) {
        log(`     ${result.message}`, 'cyan');
      }
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

  // Display result messages (but don't exit - let caller decide)
  if (criticalIssues > 0) {
    log('\n❌ CRITICAL SECRETS MISSING - Bot cannot start!', 'red');
    log('\nTo fix:', 'yellow');
    log('1. Go to Railway dashboard', 'cyan');
    log('2. Navigate to your project > Variables tab', 'cyan');
    log('3. Add the missing variables shown above', 'cyan');
    log('4. Redeploy the service\n', 'cyan');
  } else if (importantIssues > 0) {
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
