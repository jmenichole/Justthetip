#!/usr/bin/env node

/**
 * Railway Bot Startup Script
 * 
 * This script:
 * 1. Verifies all required secrets are present
 * 2. Performs health checks
 * 3. Starts the Discord bot
 * 4. Monitors for startup issues
 */

const { spawn } = require('child_process');
const path = require('path');

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

async function verifySecrets() {
  logHeader('Step 1: Verifying Railway Secrets');
  
  try {
    // Run the verification script
    const { verifyRailwaySecrets } = require('./verify-railway-secrets');
    const success = verifyRailwaySecrets();
    
    if (!success) {
      log('❌ Secret verification failed', 'red');
      process.exit(1);
    }
    
    log('✅ Secret verification passed\n', 'green');
    return true;
  } catch (error) {
    log(`❌ Secret verification error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function performHealthChecks() {
  logHeader('Step 2: Health Checks');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  
  log(`Node.js version: ${nodeVersion}`, majorVersion >= 16 ? 'green' : 'yellow');
  
  if (majorVersion < 16) {
    log('⚠️  Warning: Node.js 16+ recommended', 'yellow');
  }
  
  // Check required modules
  const requiredModules = ['discord.js', 'dotenv-safe', 'mongodb'];
  let modulesOk = true;
  
  for (const module of requiredModules) {
    try {
      require.resolve(module);
      log(`✅ Module ${module}: Found`, 'green');
    } catch (error) {
      log(`❌ Module ${module}: Missing`, 'red');
      modulesOk = false;
    }
  }
  
  if (!modulesOk) {
    log('\n❌ Required modules missing. Run: npm install', 'red');
    process.exit(1);
  }
  
  log('\n✅ Health checks passed\n', 'green');
}

function startBot() {
  logHeader('Step 3: Starting Discord Bot');
  
  const botPath = path.join(__dirname, '..', 'bot.js');
  log(`Starting bot from: ${botPath}`, 'cyan');
  log('', 'reset');
  
  // Start the bot process
  const bot = spawn('node', [botPath], {
    stdio: 'inherit',
    env: process.env,
  });
  
  bot.on('error', (error) => {
    log(`\n❌ Failed to start bot: ${error.message}`, 'red');
    process.exit(1);
  });
  
  bot.on('exit', (code, signal) => {
    if (code !== 0) {
      log(`\n❌ Bot exited with code ${code}`, 'red');
      if (signal) {
        log(`Signal: ${signal}`, 'yellow');
      }
      process.exit(code || 1);
    }
  });
  
  // Handle cleanup
  process.on('SIGTERM', () => {
    log('\n⚠️  Received SIGTERM, shutting down gracefully...', 'yellow');
    bot.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    log('\n⚠️  Received SIGINT, shutting down gracefully...', 'yellow');
    bot.kill('SIGINT');
  });
}

async function main() {
  logHeader('Railway Discord Bot Startup');
  
  log('🚂 Starting JustTheTip Discord Bot on Railway', 'blue');
  log(`   Time: ${new Date().toISOString()}`, 'cyan');
  log(`   Platform: ${process.env.RAILWAY_ENVIRONMENT || 'Unknown'}`, 'cyan');
  log('', 'reset');
  
  try {
    // Step 1: Verify secrets
    await verifySecrets();
    
    // Step 2: Health checks
    await performHealthChecks();
    
    // Step 3: Start bot
    startBot();
    
    log('✅ Bot startup sequence complete', 'green');
    log('📡 Bot should be online in Discord shortly...', 'cyan');
    log('', 'reset');
    
  } catch (error) {
    log(`\n❌ Startup failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the startup sequence
main().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
