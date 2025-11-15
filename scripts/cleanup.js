#!/usr/bin/env node
/**
 * JustTheTip - Cleanup Script
 *
 * Copyright (c) 2025 JustTheTip Bot. All rights reserved.
 * 
 * This file is part of JustTheTip.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * See LICENSE file in the project root for full license information.
 * 
 * Removes temporary files, logs, cache, and outdated artifacts
 * Usage: npm run clean
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Directories and patterns to clean
const cleanupTargets = [
  // Logs
  { pattern: '*.log', description: 'Log files' },
  { pattern: 'logs/*.log', description: 'Log directory' },
  { pattern: '*.log.*', description: 'Rotated logs' },

  // Node modules artifacts
  { pattern: 'node_modules/.cache', description: 'Node cache' },
  { pattern: '.npm', description: 'NPM cache' },

  // Test artifacts
  { pattern: 'coverage', description: 'Test coverage reports' },
  { pattern: '.nyc_output', description: 'NYC coverage data' },
  { pattern: '*.test.js.snap', description: 'Jest snapshots (stale)' },

  // Build artifacts
  { pattern: 'dist', description: 'Distribution builds' },
  { pattern: 'build', description: 'Build output' },
  { pattern: '.next', description: 'Next.js build cache' },
  { pattern: '.cache', description: 'Build cache' },

  // Database artifacts
  { pattern: '*.db', description: 'SQLite databases (dev only)', skipProd: true },
  { pattern: '*.sqlite', description: 'SQLite files (dev only)', skipProd: true },
  { pattern: '*.db-journal', description: 'SQLite journals' },

  // Temporary files
  { pattern: 'tmp/*', description: 'Temporary directory' },
  { pattern: '.tmp', description: 'Temp cache' },
  { pattern: '*.tmp', description: 'Temp files' },
  { pattern: '*.temp', description: 'Temp files' },

  // OS files
  { pattern: '.DS_Store', description: 'macOS metadata' },
  { pattern: 'Thumbs.db', description: 'Windows thumbnails' },
  { pattern: 'desktop.ini', description: 'Windows desktop config' },

  // Editor files
  { pattern: '.vscode/.ropeproject', description: 'VSCode rope project' },
  { pattern: '*.swp', description: 'Vim swap files' },
  { pattern: '*.swo', description: 'Vim swap files' },
  { pattern: '*~', description: 'Backup files' },

  // Package manager
  { pattern: 'package-lock.json', description: 'NPM lock file', optional: true },
  { pattern: 'yarn.lock', description: 'Yarn lock file', optional: true },

  // Anchor artifacts
  { pattern: 'justthetip-contracts/target', description: 'Anchor build artifacts' },
  { pattern: 'justthetip-contracts/.anchor', description: 'Anchor cache' }
];

// Files to preserve (never delete)
const preserveFiles = [
  '.env',
  '.env.example',
  '.gitignore',
  'node_modules',
  'package.json',
  'README.md'
];

function shouldClean(target) {
  const isProduction = process.env.NODE_ENV === 'production';

  if (target.skipProd && isProduction) {
    log(`  ⏭️  Skipping ${target.description} (production mode)`, 'yellow');
    return false;
  }

  return true;
}

function cleanPattern(pattern, description, optional = false) {
  const fullPath = path.join(process.cwd(), pattern);

  try {
    // Check if path exists
    if (!fs.existsSync(fullPath) && !pattern.includes('*')) {
      if (!optional) {
        log(`  ℹ️  ${description}: Not found`, 'blue');
      }
      return 0;
    }

    // Use shell commands for glob patterns
    if (pattern.includes('*')) {
      try {
        execSync(`rm -rf ${pattern}`, { stdio: 'pipe', cwd: process.cwd() });
        log(`  ✅ Cleaned ${description}`, 'green');
        return 1;
      } catch (error) {
        if (!optional) {
          log(`  ⚠️  ${description}: Nothing to clean`, 'yellow');
        }
        return 0;
      }
    }

    // Directory
    if (fs.lstatSync(fullPath).isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      log(`  ✅ Cleaned ${description}`, 'green');
      return 1;
    }

    // File
    fs.unlinkSync(fullPath);
    log(`  ✅ Cleaned ${description}`, 'green');
    return 1;
  } catch (error) {
    if (!optional) {
      log(`  ❌ Failed to clean ${description}: ${error.message}`, 'red');
    }
    return 0;
  }
}

function getDirectorySize(dirPath) {
  try {
    const output = execSync(`du -sh ${dirPath} 2>/dev/null || echo "0"`, {
      encoding: 'utf8'
    });
    return output.split('\t')[0];
  } catch {
    return 'unknown';
  }
}

async function main() {
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║   JustTheTip Cleanup Script           ║', 'blue');
  log('╚════════════════════════════════════════╝\n', 'blue');

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    log('⚠️  Running in PRODUCTION mode - some cleanups skipped\n', 'yellow');
  }

  // Get initial sizes
  const nodeModulesSize = getDirectorySize('node_modules');
  log(`📊 Current node_modules size: ${nodeModulesSize}\n`, 'blue');

  let cleanedCount = 0;

  // Clean each target
  log('🧹 Cleaning targets:\n', 'blue');

  for (const target of cleanupTargets) {
    if (shouldClean(target)) {
      const cleaned = cleanPattern(target.pattern, target.description, target.optional);
      cleanedCount += cleaned;
    }
  }

  // Optional: Clean node_modules completely
  const cleanNodeModules = process.argv.includes('--deep') || process.argv.includes('--node-modules');

  if (cleanNodeModules) {
    log('\n🔥 Deep clean: Removing node_modules...', 'yellow');
    cleanPattern('node_modules', 'Node modules directory');
    log('   Run `npm install` to reinstall dependencies', 'yellow');
  }

  // Summary
  log('\n' + '─'.repeat(40), 'blue');
  log(`\n✨ Cleanup complete! Cleaned ${cleanedCount} items.\n`, 'green');

  if (!cleanNodeModules) {
    log('💡 Tip: Run with --deep to also remove node_modules\n', 'blue');
  }

  log('Next steps:', 'blue');
  log('  • Run tests: npm test', 'blue');
  log('  • Run linter: npm run lint', 'blue');
  log('  • Check audit: npm run audit\n', 'blue');
}

main().catch(error => {
  log(`\n❌ Cleanup failed: ${error.message}\n`, 'red');
  process.exit(1);
});
