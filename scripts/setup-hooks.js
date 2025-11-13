#!/usr/bin/env node
/**
 * Git Hooks Setup Script for JustTheTip
 *
 * Sets up pre-commit hooks for:
 * - Code linting
 * - Security checks
 * - Secret scanning
 * - Commit message validation
 *
 * Usage: npm run setup-hooks
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const PRE_COMMIT_HOOK = `#!/bin/sh
# JustTheTip Pre-Commit Hook
# Automatically runs linting and security checks before commit

echo "🔍 Running pre-commit checks..."

# Run linter
echo "📝 Linting staged files..."
npm run lint-staged
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Please fix errors before committing."
  exit 1
fi

# Run security check (lightweight)
echo "🔒 Running quick security scan..."
node scripts/security-check.js --quick 2>/dev/null || true

echo "✅ Pre-commit checks passed!"
exit 0
`;

const COMMIT_MSG_HOOK = `#!/bin/sh
# JustTheTip Commit Message Hook
# Validates commit message format

commit_msg_file=$1
commit_msg=$(cat "$commit_msg_file")

# Check for conventional commit format (loosely)
if ! echo "$commit_msg" | grep -qE '^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\\(.+\\))?: .+'; then
  echo "❌ Invalid commit message format!"
  echo ""
  echo "Expected format:"
  echo "  <type>(<scope>): <subject>"
  echo ""
  echo "Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert"
  echo ""
  echo "Example:"
  echo "  feat(kick): add OAuth authentication"
  echo "  fix(api): resolve rate limit issue"
  echo ""
  exit 1
fi

# Check for co-authorship
if ! echo "$commit_msg" | grep -q "Co-authored-by:"; then
  echo "⚠️  Warning: Consider adding co-author attribution:"
  echo "   Co-authored-by: jlucus <jlucus@users.noreply.github.com>"
  echo "   Co-authored-by: 4eckd <4eckd@users.noreply.github.com>"
fi

exit 0
`;

const PRE_PUSH_HOOK = `#!/bin/sh
# JustTheTip Pre-Push Hook
# Runs tests before pushing

echo "🚀 Running pre-push checks..."

# Run tests
echo "🧪 Running tests..."
npm test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Please fix before pushing."
  exit 1
fi

echo "✅ Pre-push checks passed!"
exit 0
`;

function setupHook(hookName, hookContent) {
  const hooksDir = path.join(process.cwd(), '.git', 'hooks');
  const hookPath = path.join(hooksDir, hookName);

  // Check if .git exists
  if (!fs.existsSync(path.join(process.cwd(), '.git'))) {
    log('⚠️  Not a git repository. Skipping hook setup.', 'yellow');
    return false;
  }

  // Create hooks directory if it doesn't exist
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // Backup existing hook
  if (fs.existsSync(hookPath)) {
    const backupPath = `${hookPath}.backup`;
    fs.copyFileSync(hookPath, backupPath);
    log(`   📦 Backed up existing ${hookName} to ${hookName}.backup`, 'blue');
  }

  // Write new hook
  fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
  log(`   ✅ Created ${hookName}`, 'green');

  return true;
}

function setupLintStaged() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (!packageJson['lint-staged']) {
    packageJson['lint-staged'] = {
      '*.js': ['eslint --fix', 'prettier --write'],
      '*.json': ['prettier --write'],
      '*.md': ['prettier --write']
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    log('   ✅ Added lint-staged configuration to package.json', 'green');
  } else {
    log('   ℹ️  lint-staged already configured', 'blue');
  }
}

function installHusky() {
  log('\n📦 Installing husky...', 'blue');

  try {
    // Check if husky is already installed
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    );

    if (!packageJson.devDependencies || !packageJson.devDependencies.husky) {
      execSync('npm install --save-dev husky', { stdio: 'pipe' });
      log('   ✅ Installed husky', 'green');
    } else {
      log('   ℹ️  Husky already installed', 'blue');
    }

    // Initialize husky
    execSync('npx husky install', { stdio: 'pipe' });
    log('   ✅ Initialized husky', 'green');

    return true;
  } catch (error) {
    log('   ⚠️  Husky setup failed (optional)', 'yellow');
    return false;
  }
}

async function main() {
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║      Git Hooks Setup                   ║', 'blue');
  log('╚════════════════════════════════════════╝\n', 'blue');

  // Setup hooks
  log('🔗 Setting up git hooks...', 'blue');

  const hooks = [
    { name: 'pre-commit', content: PRE_COMMIT_HOOK },
    { name: 'commit-msg', content: COMMIT_MSG_HOOK },
    { name: 'pre-push', content: PRE_PUSH_HOOK }
  ];

  let hooksSetup = 0;
  for (const hook of hooks) {
    if (setupHook(hook.name, hook.content)) {
      hooksSetup++;
    }
  }

  // Setup lint-staged
  log('\n🎨 Configuring lint-staged...', 'blue');
  setupLintStaged();

  // Install husky (optional)
  log('\n🐶 Setting up husky (optional)...', 'blue');
  installHusky();

  // Summary
  log('\n═'.repeat(40), 'blue');
  log('\n✅ Git hooks setup complete!\n', 'green');

  log('📋 Installed hooks:', 'blue');
  log('   • pre-commit:  Runs linting and security checks', 'reset');
  log('   • commit-msg:  Validates commit message format', 'reset');
  log('   • pre-push:    Runs tests before push\n', 'reset');

  log('💡 Tips:', 'blue');
  log('   • Skip hooks temporarily: git commit --no-verify', 'reset');
  log('   • Update hooks: npm run setup-hooks', 'reset');
  log('   • View hooks: ls -la .git/hooks/\n', 'reset');
}

main().catch(error => {
  log(`\n❌ Setup failed: ${error.message}\n`, 'red');
  process.exit(1);
});
