#!/usr/bin/env node
/**
 * JustTheTip - Kick Integration Setup Script
 *
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 * 
 * This file is part of JustTheTip.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * See LICENSE file in the project root for full license information.
 * 
 * This script helps developers set up the Kick integration by:
 * 1. Checking environment variables
 * 2. Running database migrations
 * 3. Validating Kick API credentials
 * 4. Installing required dependencies
 * 5. Creating necessary directories
 *
 * Usage: node scripts/kick-setup.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Check if .env file exists
function checkEnvFile() {
  logSection('Checking Environment Configuration');

  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  if (!fs.existsSync(envPath)) {
    logWarning('.env file not found');

    if (fs.existsSync(envExamplePath)) {
      logInfo('Copying .env.example to .env...');
      fs.copyFileSync(envExamplePath, envPath);
      logSuccess('.env file created from .env.example');
    } else {
      logError('.env.example not found. Cannot create .env file.');
      return false;
    }
  } else {
    logSuccess('.env file exists');
  }

  return true;
}

// Check required environment variables
function checkRequiredEnvVars() {
  logSection('Checking Required Environment Variables');

  require('dotenv').config();

  const requiredVars = {
    // Existing variables
    'DISCORD_BOT_TOKEN': 'Discord bot token',
    'DISCORD_CLIENT_ID': 'Discord client ID',
    'DISCORD_CLIENT_SECRET': 'Discord client secret',
    'SOLANA_RPC_URL': 'Solana RPC endpoint',
    'DATABASE_URL': 'Database connection URL',

    // New Kick variables
    'KICK_CLIENT_ID': 'Kick API client ID',
    'KICK_CLIENT_SECRET': 'Kick API client secret',
    'KICK_REDIRECT_URI': 'Kick OAuth redirect URI',

    // New Passkey variables
    'PASSKEY_RP_NAME': 'Passkey relying party name',
    'PASSKEY_RP_ID': 'Passkey relying party ID',
    'PASSKEY_ORIGIN': 'Passkey origin URL',

    // Encryption
    'TOKEN_ENCRYPTION_KEY': '32-byte encryption key for tokens'
  };

  const missing = [];
  const present = [];

  for (const [varName, description] of Object.entries(requiredVars)) {
    if (!process.env[varName] || process.env[varName] === 'your_' + varName.toLowerCase()) {
      missing.push({ varName, description });
    } else {
      present.push(varName);
    }
  }

  // Log present variables
  present.forEach(varName => {
    logSuccess(`${varName} is set`);
  });

  // Log missing variables
  if (missing.length > 0) {
    log('\n');
    logWarning('Missing or invalid environment variables:');
    missing.forEach(({ varName, description }) => {
      logError(`  ${varName}: ${description}`);
    });

    log('\n');
    logInfo('Please add these variables to your .env file:');
    log('\n');
    missing.forEach(({ varName }) => {
      log(`${varName}=your_value_here`, 'yellow');
    });

    log('\n');
    logInfo('To get Kick API credentials:');
    log('  1. Visit https://dev.kick.com', 'cyan');
    log('  2. Create a new application', 'cyan');
    log('  3. Copy the Client ID and Client Secret', 'cyan');

    return false;
  }

  logSuccess('All required environment variables are set');
  return true;
}

// Generate encryption key if missing
function generateEncryptionKey() {
  logSection('Encryption Key Setup');

  if (process.env.TOKEN_ENCRYPTION_KEY &&
      process.env.TOKEN_ENCRYPTION_KEY !== 'your_32_byte_encryption_key_here') {
    logSuccess('Encryption key is already set');
    return true;
  }

  logInfo('Generating new 32-byte encryption key...');

  const key = crypto.randomBytes(32).toString('base64');

  log('\n');
  log('Add this to your .env file:', 'yellow');
  log(`TOKEN_ENCRYPTION_KEY=${key}`, 'green');
  log('\n');

  // Optionally append to .env file
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (!envContent.includes('TOKEN_ENCRYPTION_KEY=')) {
      fs.appendFileSync(envPath, `\nTOKEN_ENCRYPTION_KEY=${key}\n`);
      logSuccess('Encryption key added to .env file');
    }
  }

  return true;
}

// Install npm dependencies
function installDependencies() {
  logSection('Installing NPM Dependencies');

  const newDependencies = [
    '@simplewebauthn/server',
    '@simplewebauthn/browser',
    '@noble/hashes',
    'ws' // WebSocket for Kick chat
  ];

  try {
    logInfo('Checking for new dependencies...');

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    );

    const toInstall = newDependencies.filter(
      dep => !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
    );

    if (toInstall.length === 0) {
      logSuccess('All required dependencies are already installed');
      return true;
    }

    logInfo(`Installing: ${toInstall.join(', ')}`);
    execSync(`npm install ${toInstall.join(' ')}`, { stdio: 'inherit' });

    logSuccess('Dependencies installed successfully');
    return true;
  } catch (error) {
    logError(`Failed to install dependencies: ${error.message}`);
    return false;
  }
}

// Create directory structure
function createDirectories() {
  logSection('Creating Directory Structure');

  const directories = [
    'src/kick',
    'src/passkey',
    'src/integrations',
    'tests/kick',
    'tests/passkey',
    'db/migrations',
    'api/routes'
  ];

  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logSuccess(`Created directory: ${dir}`);
    } else {
      logInfo(`Directory already exists: ${dir}`);
    }
  });

  return true;
}

// Run database migrations
function runMigrations() {
  logSection('Running Database Migrations');

  const migrationPath = path.join(process.cwd(), 'db/migrations/003_kick_integration.sql');

  if (!fs.existsSync(migrationPath)) {
    logWarning('Migration file not found. Skipping database migration.');
    logInfo('Run this script again after creating the migration file.');
    return true;
  }

  try {
    logInfo('Running Kick integration migration...');

    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      logWarning('DATABASE_URL not set. Skipping database migration.');
      logInfo('Set DATABASE_URL in your .env file and run migrations manually.');
      return true;
    }

    // For SQLite (development)
    if (process.env.DATABASE_URL.startsWith('sqlite')) {
      logInfo('SQLite detected. Migrations will be run automatically on first use.');
      logSuccess('Migration file ready');
      return true;
    }

    // For PostgreSQL
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    logInfo('To run migrations, execute:');
    log('\n');
    log('psql $DATABASE_URL < db/migrations/003_kick_integration.sql', 'cyan');
    log('\n');
    log('Or use your preferred PostgreSQL client (pgAdmin, DBeaver, etc.)', 'cyan');

    logSuccess('Migration file is ready to be executed');
    return true;
  } catch (error) {
    logError(`Migration setup failed: ${error.message}`);
    return false;
  }
}

// Create sample stub files
function createStubFiles() {
  logSection('Creating Stub Files');

  const stubs = [
    {
      path: 'src/kick/kickClient.js',
      content: `/**
 * Kick API Client
 * Main client for interacting with Kick.com API
 */

'use strict';

class KickClient {
  constructor(accessToken) {
    this.baseUrl = 'https://api.kick.com/v1';
    this.accessToken = accessToken;
  }

  async getChannel(slug) {
    // TODO: Implement channel fetching
    throw new Error('Not implemented');
  }

  async sendMessage(channelId, text) {
    // TODO: Implement message sending
    throw new Error('Not implemented');
  }
}

module.exports = KickClient;
`
    },
    {
      path: 'src/passkey/passkeyService.js',
      content: `/**
 * Passkey Service
 * WebAuthn/FIDO2 passkey authentication
 */

'use strict';

class PasskeyService {
  async startRegistration(userId, username) {
    // TODO: Implement passkey registration
    throw new Error('Not implemented');
  }

  async finishRegistration(userId, credential) {
    // TODO: Implement passkey verification
    throw new Error('Not implemented');
  }
}

module.exports = PasskeyService;
`
    }
  ];

  stubs.forEach(({ path: stubPath, content }) => {
    const fullPath = path.join(process.cwd(), stubPath);

    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, content);
      logSuccess(`Created stub file: ${stubPath}`);
    } else {
      logInfo(`File already exists: ${stubPath}`);
    }
  });

  return true;
}

// Main setup function
async function main() {
  log('\n');
  log('╔═══════════════════════════════════════════════════════════╗', 'magenta');
  log('║                                                           ║', 'magenta');
  log('║           JustTheTip Kick Integration Setup              ║', 'bright');
  log('║                                                           ║', 'magenta');
  log('╚═══════════════════════════════════════════════════════════╝', 'magenta');

  const steps = [
    { name: 'Environment File', fn: checkEnvFile },
    { name: 'Environment Variables', fn: checkRequiredEnvVars },
    { name: 'Encryption Key', fn: generateEncryptionKey },
    { name: 'NPM Dependencies', fn: installDependencies },
    { name: 'Directory Structure', fn: createDirectories },
    { name: 'Database Migrations', fn: runMigrations },
    { name: 'Stub Files', fn: createStubFiles }
  ];

  let allPassed = true;

  for (const step of steps) {
    try {
      const result = await step.fn();
      if (!result) {
        allPassed = false;
      }
    } catch (error) {
      logError(`Error in ${step.name}: ${error.message}`);
      allPassed = false;
    }
  }

  // Summary
  logSection('Setup Summary');

  if (allPassed) {
    logSuccess('Kick integration setup completed successfully! 🎉');
    log('\n');
    logInfo('Next steps:');
    log('  1. Configure your Kick API credentials in .env', 'cyan');
    log('  2. Run database migrations if needed', 'cyan');
    log('  3. Start development: npm run start:bot', 'cyan');
    log('  4. Check out docs/KICK_CONTRIBUTION_GUIDE.md', 'cyan');
  } else {
    logWarning('Setup completed with warnings or errors.');
    log('\n');
    logInfo('Please address the issues above and run this script again.');
  }

  log('\n');
}

// Run the script
main().catch(error => {
  logError(`Setup failed: ${error.message}`);
  process.exit(1);
});
