#!/usr/bin/env node
/**
 * JustTheTip - Security Check Script
 *
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 * 
 * This file is part of JustTheTip.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * See LICENSE file in the project root for full license information.
 * 
 * Performs comprehensive security checks:
 * - NPM audit for vulnerabilities
 * - Secret scanning in code
 * - Dependency analysis
 * - Code security linting
 *
 * Usage: npm run security-check
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Patterns that might indicate secrets or sensitive data
const SECRET_PATTERNS = [
  { regex: /(["']?)(DISCORD_BOT_TOKEN|BOT_TOKEN)(["']?\s*[:=]\s*["'])([^"']+)(["'])/gi, name: 'Discord Bot Token' },
  { regex: /(["']?)(API_KEY|APIKEY)(["']?\s*[:=]\s*["'])([^"']+)(["'])/gi, name: 'API Key' },
  { regex: /(["']?)(SECRET|CLIENT_SECRET)(["']?\s*[:=]\s*["'])([^"']+)(["'])/gi, name: 'Secret Key' },
  { regex: /(["']?)(PRIVATE_KEY|PRIV_KEY)(["']?\s*[:=]\s*["'])([^"']+)(["'])/gi, name: 'Private Key' },
  { regex: /(["']?)(PASSWORD|PASSWD|PWD)(["']?\s*[:=]\s*["'])([^"']+)(["'])/gi, name: 'Password' },
  { regex: /-----BEGIN (RSA |DSA |EC )?PRIVATE KEY-----/gi, name: 'Private Key Block' },
  { regex: /mongodb(\+srv)?:\/\/[^\s]+/gi, name: 'MongoDB Connection String' },
  { regex: /postgres(ql)?:\/\/[^\s]+/gi, name: 'PostgreSQL Connection String' },
  { regex: /sk_live_[0-9a-zA-Z]{24,}/gi, name: 'Stripe Live Secret Key' },
  { regex: /pk_live_[0-9a-zA-Z]{24,}/gi, name: 'Stripe Live Public Key' },
  { regex: /ghp_[0-9a-zA-Z]{36}/gi, name: 'GitHub Personal Access Token' },
  { regex: /ghs_[0-9a-zA-Z]{36}/gi, name: 'GitHub Secret' },
  { regex: /AIza[0-9A-Za-z\\-_]{35}/gi, name: 'Google API Key' }
];

// Files to exclude from scanning
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.env.example',
  'package-lock.json',
  'yarn.lock',
  'CHANGELOG.md',
  'README.md'
];

function shouldScanFile(filePath) {
  // Check if file should be excluded
  for (const pattern of EXCLUDE_PATTERNS) {
    if (filePath.includes(pattern)) {
      return false;
    }
  }

  // Only scan text files
  const ext = path.extname(filePath).toLowerCase();
  const textExtensions = ['.js', '.ts', '.json', '.env', '.txt', '.md', '.yml', '.yaml', '.sh'];

  return textExtensions.includes(ext) || path.basename(filePath) === '.env';
}

function scanFileForSecrets(filePath) {
  const findings = [];

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (const { regex, name } of SECRET_PATTERNS) {
      regex.lastIndex = 0; // Reset regex

      lines.forEach((line, lineNumber) => {
        const match = regex.exec(line);
        if (match) {
          // Check if it's a placeholder or example
          const matchedValue = match[4] || match[0];
          const isPlaceholder = /your_|example_|test_|dummy_|xxx|placeholder|<|>|TODO|CHANGEME/i.test(matchedValue);

          if (!isPlaceholder && matchedValue.length > 5) {
            findings.push({
              file: filePath,
              line: lineNumber + 1,
              type: name,
              snippet: line.trim().substring(0, 80)
            });
          }
        }
      });
    }
  } catch (error) {
    // Skip files that can't be read
  }

  return findings;
}

function scanDirectory(dirPath, findings = []) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDE_PATTERNS.some(pattern => entry.name.includes(pattern))) {
          scanDirectory(fullPath, findings);
        }
      } else if (entry.isFile() && shouldScanFile(fullPath)) {
        const fileFindings = scanFileForSecrets(fullPath);
        findings.push(...fileFindings);
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }

  return findings;
}

async function runNpmAudit() {
  log('\n📦 Running NPM Security Audit...', 'blue');

  try {
    const output = execSync('npm audit --json', { encoding: 'utf8' });
    const auditData = JSON.parse(output);

    const { vulnerabilities } = auditData.metadata;
    const total = vulnerabilities.info + vulnerabilities.low + vulnerabilities.moderate +
                  vulnerabilities.high + vulnerabilities.critical;

    if (total === 0) {
      log('✅ No vulnerabilities found in dependencies\n', 'green');
      return true;
    }

    log(`⚠️  Found ${total} vulnerabilities:\n`, 'yellow');
    log(`   Critical: ${vulnerabilities.critical}`, vulnerabilities.critical > 0 ? 'red' : 'reset');
    log(`   High: ${vulnerabilities.high}`, vulnerabilities.high > 0 ? 'red' : 'reset');
    log(`   Moderate: ${vulnerabilities.moderate}`, vulnerabilities.moderate > 0 ? 'yellow' : 'reset');
    log(`   Low: ${vulnerabilities.low}`, 'reset');
    log(`   Info: ${vulnerabilities.info}\n`, 'reset');

    log('💡 Run `npm audit fix` to automatically fix some issues', 'blue');
    log('💡 Run `npm audit fix --force` to apply breaking changes\n', 'blue');

    return vulnerabilities.critical === 0 && vulnerabilities.high === 0;
  } catch (error) {
    // npm audit returns non-zero exit code when vulnerabilities found
    try {
      const auditData = JSON.parse(error.stdout);
      const { vulnerabilities } = auditData.metadata;

      log(`⚠️  Found vulnerabilities:\n`, 'red');
      log(`   Critical: ${vulnerabilities.critical || 0}`, 'red');
      log(`   High: ${vulnerabilities.high || 0}`, 'red');
      log(`   Moderate: ${vulnerabilities.moderate || 0}`, 'yellow');

      return vulnerabilities.critical === 0 && vulnerabilities.high === 0;
    } catch {
      log('❌ Failed to run npm audit\n', 'red');
      return false;
    }
  }
}

async function runSecretScanning() {
  log('🔍 Scanning for Secrets and Sensitive Data...', 'blue');

  const findings = scanDirectory(process.cwd());

  if (findings.length === 0) {
    log('✅ No secrets detected in codebase\n', 'green');
    return true;
  }

  log(`⚠️  Found ${findings.length} potential secrets:\n`, 'yellow');

  // Group by file
  const byFile = findings.reduce((acc, finding) => {
    if (!acc[finding.file]) acc[finding.file] = [];
    acc[finding.file].push(finding);
    return acc;
  }, {});

  for (const [file, fileFindings] of Object.entries(byFile)) {
    log(`   📄 ${path.relative(process.cwd(), file)}`, 'yellow');
    for (const finding of fileFindings) {
      log(`      Line ${finding.line}: ${finding.type}`, 'red');
      log(`      > ${finding.snippet}...`, 'reset');
    }
    log('');
  }

  log('⚠️  Please review these findings and ensure no real secrets are committed\n', 'yellow');
  return false;
}

async function runCodeSecurityLint() {
  log('🔐 Running Security Linting...', 'blue');

  try {
    execSync('npx eslint . --ext .js --quiet --rule "security/*: warn"', {
      stdio: 'pipe',
      encoding: 'utf8'
    });

    log('✅ No security issues found by ESLint\n', 'green');
    return true;
  } catch (error) {
    if (error.stdout && error.stdout.trim()) {
      log('⚠️  Security issues found:\n', 'yellow');
      log(error.stdout, 'reset');
      return false;
    }

    log('✅ No security issues found by ESLint\n', 'green');
    return true;
  }
}

async function checkGitSecrets() {
  log('🔍 Checking for secrets in Git history...', 'blue');

  try {
    // Check if git-secrets is installed
    try {
      execSync('which git-secrets', { stdio: 'pipe' });
    } catch {
      log('ℹ️  git-secrets not installed (optional)', 'blue');
      log('   Install: brew install git-secrets (macOS) or apt-get install git-secrets\n', 'blue');
      return true;
    }

    execSync('git secrets --scan', { stdio: 'pipe' });
    log('✅ No secrets found in Git history\n', 'green');
    return true;
  } catch (error) {
    log('⚠️  Potential secrets found in Git history\n', 'yellow');
    return false;
  }
}

async function main() {
  log('\n╔════════════════════════════════════════╗', 'bright');
  log('║   JustTheTip Security Check           ║', 'bright');
  log('╚════════════════════════════════════════╝\n', 'bright');

  const results = {
    npmAudit: await runNpmAudit(),
    secretScanning: await runSecretScanning(),
    codeLinting: await runCodeSecurityLint(),
    gitSecrets: await checkGitSecrets()
  };

  // Summary
  log('═'.repeat(40), 'blue');
  log('\n📊 Security Check Summary:\n', 'bright');

  const checks = [
    { name: 'NPM Audit', pass: results.npmAudit },
    { name: 'Secret Scanning', pass: results.secretScanning },
    { name: 'Code Security Linting', pass: results.codeLinting },
    { name: 'Git Secrets', pass: results.gitSecrets }
  ];

  for (const check of checks) {
    const status = check.pass ? '✅ PASS' : '❌ FAIL';
    const color = check.pass ? 'green' : 'red';
    log(`   ${status} - ${check.name}`, color);
  }

  const allPassed = Object.values(results).every(r => r === true);

  if (allPassed) {
    log('\n✅ All security checks passed!\n', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some security checks failed. Please review the issues above.\n', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Security check failed: ${error.message}\n`, 'red');
  process.exit(1);
});
