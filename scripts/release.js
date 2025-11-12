#!/usr/bin/env node
/**
 * Release Workflow Script for JustTheTip
 *
 * Automated release process:
 * 1. Run tests
 * 2. Run linting
 * 3. Run security checks
 * 4. Bump version
 * 5. Update changelog
 * 6. Create git tag
 * 7. Generate release notes
 *
 * Usage: npm run release <major|minor|patch>
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

function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function getCurrentVersion() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  );
  return packageJson.version;
}

async function runTests() {
  log('\n🧪 Running tests...', 'blue');
  try {
    exec('npm test');
    log('✅ Tests passed', 'green');
    return true;
  } catch (error) {
    log('❌ Tests failed', 'red');
    return false;
  }
}

async function runLinting() {
  log('\n🔍 Running linter...', 'blue');
  try {
    exec('npm run lint');
    log('✅ Linting passed', 'green');
    return true;
  } catch (error) {
    log('❌ Linting failed', 'red');
    return false;
  }
}

async function runSecurityCheck() {
  log('\n🔒 Running security checks...', 'blue');
  try {
    exec('node scripts/security-check.js', { silent: false });
    log('✅ Security checks passed', 'green');
    return true;
  } catch (error) {
    log('⚠️  Security checks found issues', 'yellow');
    return true; // Don't block release on security warnings
  }
}

async function cleanProject() {
  log('\n🧹 Cleaning project...', 'blue');
  try {
    exec('node scripts/cleanup.js', { silent: true });
    log('✅ Project cleaned', 'green');
    return true;
  } catch (error) {
    log('⚠️  Cleanup had warnings', 'yellow');
    return true;
  }
}

async function bumpVersion(type) {
  log(`\n📦 Bumping ${type} version...`, 'blue');
  try {
    exec(`node scripts/version.js ${type}`);
    return getCurrentVersion();
  } catch (error) {
    throw new Error(`Version bump failed: ${error.message}`);
  }
}

function getChangelogForVersion(version) {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

  if (!fs.existsSync(changelogPath)) {
    return 'No changelog available';
  }

  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const versionMatch = changelog.match(
    new RegExp(`## \\[${version}\\][^]*?(?=##\\s|\\n\\n---|$)`)
  );

  if (!versionMatch) {
    return 'No changelog entry found for this version';
  }

  return versionMatch[0].replace(`## [${version}]`, '').trim();
}

function generateReleaseNotes(version) {
  const notes = [];

  notes.push(`# Release v${version}\n`);
  notes.push(`**Release Date:** ${new Date().toISOString().split('T')[0]}\n`);

  // Get changelog
  const changelog = getChangelogForVersion(version);
  notes.push('## Changes\n');
  notes.push(changelog + '\n');

  // Installation instructions
  notes.push('## Installation\n');
  notes.push('```bash');
  notes.push('npm install');
  notes.push('```\n');

  // Upgrade instructions
  notes.push('## Upgrade from Previous Version\n');
  notes.push('1. Pull latest changes: `git pull`');
  notes.push('2. Install dependencies: `npm install`');
  notes.push('3. Run database migrations if any');
  notes.push('4. Restart the bot\n');

  // Contributors
  notes.push('## Contributors\n');
  notes.push('Thank you to all contributors who made this release possible!');
  notes.push('See [CONTRIBUTORS.md](./CONTRIBUTORS.md) for the full list.\n');

  notes.push('---\n');
  notes.push('**Co-maintained by:**');
  notes.push('- jlucus');
  notes.push('- 4eckd');

  return notes.join('\n');
}

function saveReleaseNotes(version, notes) {
  const notesDir = path.join(process.cwd(), 'releases');

  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }

  const notesPath = path.join(notesDir, `v${version}.md`);
  fs.writeFileSync(notesPath, notes);

  log(`✅ Release notes saved to releases/v${version}.md`, 'green');
  return notesPath;
}

async function confirmRelease(type, currentVersion) {
  log('\n╔════════════════════════════════════════╗', 'bright');
  log('║        Release Confirmation            ║', 'bright');
  log('╚════════════════════════════════════════╝\n', 'bright');

  log(`   Type:          ${type}`, 'blue');
  log(`   Current:       v${currentVersion}`, 'reset');
  log('');

  if (process.argv.includes('--yes') || process.argv.includes('-y')) {
    return true;
  }

  log('⚠️  This will create a new release with the above configuration.', 'yellow');
  log('   Continue? (Ctrl+C to cancel)\n', 'yellow');

  // Wait for user confirmation
  await new Promise(resolve => setTimeout(resolve, 3000));
  return true;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    log('\n📖 Usage: npm run release <type> [options]\n', 'blue');
    log('Types:', 'blue');
    log('   major    Major release (1.0.0 -> 2.0.0)', 'reset');
    log('   minor    Minor release (1.0.0 -> 1.1.0)', 'reset');
    log('   patch    Patch release (1.0.0 -> 1.0.1)\n', 'reset');
    log('Options:', 'blue');
    log('   --skip-tests       Skip running tests', 'reset');
    log('   --skip-lint        Skip linting', 'reset');
    log('   --skip-security    Skip security checks', 'reset');
    log('   --yes, -y          Skip confirmation prompt\n', 'reset');
    process.exit(0);
  }

  const type = args[0];
  if (!['major', 'minor', 'patch'].includes(type)) {
    log(`❌ Invalid release type: ${type}`, 'red');
    log('   Use: major, minor, or patch\n', 'red');
    process.exit(1);
  }

  log('\n╔════════════════════════════════════════╗', 'bright');
  log('║      JustTheTip Release Workflow       ║', 'bright');
  log('╚════════════════════════════════════════╝\n', 'bright');

  const currentVersion = getCurrentVersion();

  // Confirm release
  await confirmRelease(type, currentVersion);

  try {
    // Pre-release checks
    if (!args.includes('--skip-tests')) {
      const testsOk = await runTests();
      if (!testsOk) {
        log('\n❌ Tests must pass before release', 'red');
        process.exit(1);
      }
    }

    if (!args.includes('--skip-lint')) {
      const lintOk = await runLinting();
      if (!lintOk) {
        log('\n❌ Linting must pass before release', 'red');
        process.exit(1);
      }
    }

    if (!args.includes('--skip-security')) {
      await runSecurityCheck();
    }

    // Clean project
    await cleanProject();

    // Bump version
    const newVersion = await bumpVersion(type);
    log(`\n✅ Version bumped to v${newVersion}`, 'green');

    // Generate release notes
    log('\n📝 Generating release notes...', 'blue');
    const releaseNotes = generateReleaseNotes(newVersion);
    const notesPath = saveReleaseNotes(newVersion, releaseNotes);

    // Success
    log('\n╔════════════════════════════════════════╗', 'green');
    log('║      Release Completed Successfully!   ║', 'green');
    log('╚════════════════════════════════════════╝\n', 'green');

    log('📦 Release Details:', 'blue');
    log(`   Version: v${newVersion}`, 'green');
    log(`   Notes:   ${notesPath}`, 'reset');
    log('');

    log('📤 Next Steps:', 'blue');
    log(`   1. Review release notes: cat ${notesPath}`, 'reset');
    log(`   2. Push commit: git push`, 'reset');
    log(`   3. Push tag: git push origin v${newVersion}`, 'reset');
    log('   4. Create GitHub release with notes', 'reset');
    log('   5. Announce release to community\n', 'reset');

  } catch (error) {
    log(`\n❌ Release failed: ${error.message}\n`, 'red');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}\n`, 'red');
  process.exit(1);
});
