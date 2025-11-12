#!/usr/bin/env node

/**
 * Repository Verification and Audit Script
 * Comprehensive checks for repository health, security, and standards compliance
 * Author: 4eckd
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

// Check if file exists
function fileExists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

// Check if directory exists
function dirExists(dirPath) {
  return fs.existsSync(path.join(process.cwd(), dirPath)) &&
         fs.statSync(path.join(process.cwd(), dirPath)).isDirectory();
}

// Read file content
function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
  } catch {
    return null;
  }
}

// Execute command safely
function execCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch {
    return null;
  }
}

// Verification checks
const checks = {
  criticalFiles: {
    name: 'Critical Files',
    files: [
      { path: 'README.md', desc: 'Project documentation' },
      { path: 'LICENSE', desc: 'License file' },
      { path: 'package.json', desc: 'NPM configuration' },
      { path: '.gitignore', desc: 'Git ignore rules' },
      { path: 'CONTRIBUTING.md', desc: 'Contribution guidelines' },
      { path: 'CODE_OF_CONDUCT.md', desc: 'Code of conduct' },
      { path: 'SECURITY.md', desc: 'Security policy' },
      { path: 'CHANGELOG.md', desc: 'Change log' },
    ],
  },

  documentation: {
    name: 'Documentation',
    files: [
      { path: 'CODEBASE_INDEX.md', desc: 'Codebase index' },
      { path: 'TELEGRAM_INTEGRATION_PLAN.md', desc: 'Telegram integration plan' },
      { path: 'CONTRIBUTING_PLAN.md', desc: 'Contribution plan' },
      { path: '.env.example', desc: 'Environment template' },
    ],
  },

  githubTemplates: {
    name: 'GitHub Templates',
    files: [
      { path: '.github/PULL_REQUEST_TEMPLATE.md', desc: 'PR template' },
      { path: '.github/ISSUE_TEMPLATE/bug_report.md', desc: 'Bug report template' },
      { path: '.github/ISSUE_TEMPLATE/feature_request.md', desc: 'Feature request template' },
      { path: '.github/ISSUE_TEMPLATE/documentation.md', desc: 'Documentation template' },
      { path: '.github/ISSUE_TEMPLATE/config.yml', desc: 'Issue config' },
    ],
  },

  workflows: {
    name: 'GitHub Workflows',
    files: [
      { path: '.github/workflows/ci.yml', desc: 'CI workflow' },
      { path: '.github/workflows/railway-deploy.yml', desc: 'Railway deployment' },
    ],
  },

  sourceDirectories: {
    name: 'Source Directories',
    dirs: [
      { path: 'src', desc: 'Source code' },
      { path: 'api', desc: 'API server' },
      { path: 'contracts', desc: 'Smart contracts SDK' },
      { path: 'db', desc: 'Database layer' },
      { path: 'scripts', desc: 'Utility scripts' },
      { path: 'docs', desc: 'Documentation' },
    ],
  },
};

// Security checks
function performSecurityChecks() {
  logSection('🔐 Security Checks');

  const issues = [];
  const warnings = [];

  // Check .env is in .gitignore
  const gitignore = readFile('.gitignore');
  if (gitignore) {
    if (!gitignore.includes('.env')) {
      issues.push('.env not in .gitignore - CRITICAL');
    } else {
      log('✅ .env properly ignored', 'green');
    }

    if (!gitignore.includes('node_modules')) {
      warnings.push('node_modules should be in .gitignore');
    }

    if (!gitignore.includes('*.log')) {
      warnings.push('Log files should be ignored');
    }
  }

  // Check for .env file in repo root
  if (fileExists('.env')) {
    warnings.push('.env file exists in working directory (ensure it\'s not committed)');
  }

  // Check for common sensitive patterns
  const packageJson = readFile('package.json');
  if (packageJson && packageJson.includes('private_key')) {
    warnings.push('Potential private key reference in package.json');
  }

  // Check git history for sensitive files
  const gitLog = execCommand('git log --all --pretty=format: --name-only --diff-filter=A');
  if (gitLog) {
    const sensitivePatterns = [/\.env$/, /id_rsa/, /credentials/, /secret/i];
    const files = gitLog.split('\n').filter(Boolean);

    sensitivePatterns.forEach(pattern => {
      const matches = files.filter(file => pattern.test(file));
      if (matches.length > 0) {
        issues.push(`Potential secrets in git history: ${matches.join(', ')}`);
      }
    });
  }

  // Report security findings
  if (issues.length === 0 && warnings.length === 0) {
    log('✅ No security issues found', 'green');
  } else {
    if (issues.length > 0) {
      log('\n❌ Security Issues:', 'red');
      issues.forEach(issue => log(`  • ${issue}`, 'red'));
    }
    if (warnings.length > 0) {
      log('\n⚠️  Security Warnings:', 'yellow');
      warnings.forEach(warning => log(`  • ${warning}`, 'yellow'));
    }
  }

  return { issues: issues.length, warnings: warnings.length };
}

// Code quality checks
function performCodeQualityChecks() {
  logSection('🎨 Code Quality Checks');

  const results = [];

  // Check if ESLint is configured
  if (fileExists('.eslintrc.json') || fileExists('.eslintrc.js')) {
    log('✅ ESLint configured', 'green');

    // Try to run linter
    const lintResult = execCommand('npm run lint 2>&1');
    if (lintResult && !lintResult.includes('error')) {
      log('✅ Linting passed', 'green');
    } else if (lintResult) {
      log('⚠️  Linting has warnings/errors', 'yellow');
      results.push({ type: 'warning', message: 'Run npm run lint to fix issues' });
    }
  } else {
    log('⚠️  ESLint not configured', 'yellow');
    results.push({ type: 'warning', message: 'Consider adding ESLint configuration' });
  }

  // Check for Prettier
  if (fileExists('.prettierrc.json') || fileExists('.prettierrc')) {
    log('✅ Prettier configured', 'green');
  } else {
    log('⚠️  Prettier not configured', 'yellow');
  }

  // Check for EditorConfig
  if (fileExists('.editorconfig')) {
    log('✅ EditorConfig present', 'green');
  } else {
    log('⚠️  EditorConfig missing', 'yellow');
  }

  return results;
}

// Dependency checks
function performDependencyChecks() {
  logSection('📦 Dependency Checks');

  // Check if node_modules exists
  if (dirExists('node_modules')) {
    log('✅ Dependencies installed', 'green');
  } else {
    log('⚠️  Dependencies not installed', 'yellow');
    log('   Run: npm install', 'cyan');
  }

  // Check package-lock.json
  if (fileExists('package-lock.json')) {
    log('✅ package-lock.json present', 'green');
  } else {
    log('⚠️  package-lock.json missing', 'yellow');
  }

  // Check for outdated packages
  const outdated = execCommand('npm outdated --json 2>/dev/null');
  if (outdated) {
    try {
      const packages = JSON.parse(outdated);
      const count = Object.keys(packages).length;
      if (count > 0) {
        log(`⚠️  ${count} outdated package(s) found`, 'yellow');
        log('   Run: npm outdated for details', 'cyan');
      } else {
        log('✅ All packages up to date', 'green');
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Check for vulnerabilities
  const audit = execCommand('npm audit --json 2>/dev/null');
  if (audit) {
    try {
      const auditData = JSON.parse(audit);
      const vulns = auditData.metadata?.vulnerabilities;
      if (vulns) {
        const total = Object.values(vulns).reduce((a, b) => a + b, 0);
        if (total > 0) {
          log(`⚠️  ${total} vulnerability(ies) found`, 'yellow');
          log('   Run: npm audit for details', 'cyan');
        } else {
          log('✅ No vulnerabilities found', 'green');
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
}

// Git checks
function performGitChecks() {
  logSection('🔄 Git Configuration Checks');

  // Check git user config
  const userName = execCommand('git config user.name');
  const userEmail = execCommand('git config user.email');

  if (userName && userEmail) {
    log(`✅ Git user configured: ${userName.trim()} <${userEmail.trim()}>`, 'green');
  } else {
    log('⚠️  Git user not configured', 'yellow');
    log('   Run: git config user.name "Your Name"', 'cyan');
    log('   Run: git config user.email "your@email.com"', 'cyan');
  }

  // Check current branch
  const branch = execCommand('git branch --show-current');
  if (branch) {
    const branchName = branch.trim();
    if (branchName === 'main' || branchName === 'master') {
      log(`⚠️  On ${branchName} branch - create feature branch for development`, 'yellow');
    } else {
      log(`✅ On feature branch: ${branchName}`, 'green');
    }
  }

  // Check for uncommitted changes
  const status = execCommand('git status --porcelain');
  if (status && status.trim()) {
    log('⚠️  Uncommitted changes detected', 'yellow');
  } else {
    log('✅ Working directory clean', 'green');
  }

  // Check remotes
  const remotes = execCommand('git remote -v');
  if (remotes) {
    const hasOrigin = remotes.includes('origin');
    const hasUpstream = remotes.includes('upstream');

    if (hasOrigin) {
      log('✅ Origin remote configured', 'green');
    } else {
      log('⚠️  Origin remote not configured', 'yellow');
    }

    if (hasUpstream) {
      log('✅ Upstream remote configured', 'green');
    } else {
      log('⚠️  Upstream remote not configured', 'yellow');
      log('   Run: git remote add upstream https://github.com/jmenichole/Justthetip.git', 'cyan');
    }
  }
}

// Main verification function
function runVerification() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'magenta');
  log('║     JustTheTip Repository Verification & Audit            ║', 'magenta');
  log('╚════════════════════════════════════════════════════════════╝', 'magenta');

  let totalIssues = 0;
  let totalWarnings = 0;

  // Check critical files
  logSection('📄 Critical Files Check');
  checks.criticalFiles.files.forEach(file => {
    if (fileExists(file.path)) {
      log(`✅ ${file.path} - ${file.desc}`, 'green');
    } else {
      log(`❌ ${file.path} - ${file.desc} [MISSING]`, 'red');
      totalIssues++;
    }
  });

  // Check documentation
  logSection('📚 Documentation Check');
  checks.documentation.files.forEach(file => {
    if (fileExists(file.path)) {
      log(`✅ ${file.path} - ${file.desc}`, 'green');
    } else {
      log(`⚠️  ${file.path} - ${file.desc} [OPTIONAL]`, 'yellow');
      totalWarnings++;
    }
  });

  // Check GitHub templates
  logSection('🐙 GitHub Templates Check');
  checks.githubTemplates.files.forEach(file => {
    if (fileExists(file.path)) {
      log(`✅ ${file.path} - ${file.desc}`, 'green');
    } else {
      log(`⚠️  ${file.path} - ${file.desc}`, 'yellow');
      totalWarnings++;
    }
  });

  // Check workflows
  logSection('⚙️  GitHub Workflows Check');
  if (dirExists('.github/workflows')) {
    const workflows = fs.readdirSync(path.join(process.cwd(), '.github/workflows'));
    const yamlFiles = workflows.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    log(`✅ Found ${yamlFiles.length} workflow(s)`, 'green');
    yamlFiles.forEach(wf => log(`   • ${wf}`, 'cyan'));
  } else {
    log('⚠️  No workflows directory', 'yellow');
    totalWarnings++;
  }

  // Check directories
  logSection('📁 Source Directories Check');
  checks.sourceDirectories.dirs.forEach(dir => {
    if (dirExists(dir.path)) {
      log(`✅ ${dir.path}/ - ${dir.desc}`, 'green');
    } else {
      log(`⚠️  ${dir.path}/ - ${dir.desc}`, 'yellow');
      totalWarnings++;
    }
  });

  // Security checks
  const securityResults = performSecurityChecks();
  totalIssues += securityResults.issues;
  totalWarnings += securityResults.warnings;

  // Code quality checks
  const codeResults = performCodeQualityChecks();
  totalWarnings += codeResults.filter(r => r.type === 'warning').length;

  // Dependency checks
  performDependencyChecks();

  // Git checks
  performGitChecks();

  // Calculate health score
  const healthScore = Math.max(0, 100 - (totalIssues * 10) - (totalWarnings * 2));

  // Final summary
  logSection('📊 Verification Summary');
  console.log('');
  log(`Health Score: ${healthScore}/100`, healthScore >= 80 ? 'green' : healthScore >= 60 ? 'yellow' : 'red');
  log(`Critical Issues: ${totalIssues}`, totalIssues > 0 ? 'red' : 'green');
  log(`Warnings: ${totalWarnings}`, totalWarnings > 0 ? 'yellow' : 'green');

  console.log('\n');

  if (healthScore >= 90) {
    log('🎉 Excellent! Repository is in great shape!', 'green');
  } else if (healthScore >= 70) {
    log('👍 Good! Minor improvements recommended.', 'yellow');
  } else if (healthScore >= 50) {
    log('⚠️  Fair. Several improvements needed.', 'yellow');
  } else {
    log('❌ Action required. Critical issues found.', 'red');
  }

  console.log('\n');

  // Exit with appropriate code
  process.exit(totalIssues > 0 ? 1 : 0);
}

// Run verification
if (require.main === module) {
  runVerification();
}

module.exports = { runVerification };
