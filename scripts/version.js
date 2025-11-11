#!/usr/bin/env node
/**
 * Version Management Script for JustTheTip
 *
 * Handles version bumping, changelog generation, and git tagging
 * Usage:
 *   npm run version patch    # 1.0.0 -> 1.0.1
 *   npm run version minor    # 1.0.0 -> 1.1.0
 *   npm run version major    # 1.0.0 -> 2.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function getCurrentVersion() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  );
  return packageJson.version;
}

function bumpVersion(currentVersion, type) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid version type: ${type}. Use major, minor, or patch.`);
  }
}

function updatePackageJson(newVersion) {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  packageJson.version = newVersion;

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  log(`✅ Updated package.json to v${newVersion}`, 'green');
}

function getUnreleasedChanges() {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

  if (!fs.existsSync(changelogPath)) {
    log('⚠️  CHANGELOG.md not found', 'yellow');
    return null;
  }

  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const unreleasedMatch = changelog.match(/## \[Unreleased\]([\s\S]*?)(?=##\s|\n\n---|\Z)/);

  if (!unreleasedMatch || !unreleasedMatch[1].trim()) {
    return null;
  }

  return unreleasedMatch[1].trim();
}

function updateChangelog(newVersion) {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

  if (!fs.existsSync(changelogPath)) {
    log('⚠️  CHANGELOG.md not found, skipping', 'yellow');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  let changelog = fs.readFileSync(changelogPath, 'utf8');

  const unreleasedChanges = getUnreleasedChanges();

  if (!unreleasedChanges) {
    log('⚠️  No unreleased changes found in CHANGELOG.md', 'yellow');
    log('   Add changes under [Unreleased] section before releasing', 'yellow');
    return;
  }

  // Replace [Unreleased] with new version
  changelog = changelog.replace(
    /## \[Unreleased\]/,
    `## [Unreleased]\n\n## [${newVersion}] - ${today}`
  );

  fs.writeFileSync(changelogPath, changelog);
  log(`✅ Updated CHANGELOG.md with v${newVersion}`, 'green');
}

function createGitTag(version) {
  try {
    // Check if there are uncommitted changes
    const status = execSync('git status --porcelain', { encoding: 'utf8' });

    if (status.trim()) {
      log('⚠️  Uncommitted changes detected. Commit them first:', 'yellow');
      log(status, 'reset');
      return false;
    }

    // Create annotated tag
    const tagMessage = `Release v${version}`;
    execSync(`git tag -a v${version} -m "${tagMessage}"`, { stdio: 'pipe' });

    log(`✅ Created git tag: v${version}`, 'green');
    log('   Push with: git push origin v' + version, 'blue');
    return true;
  } catch (error) {
    log(`❌ Failed to create git tag: ${error.message}`, 'red');
    return false;
  }
}

function commitVersionChanges(version) {
  try {
    // Stage changes
    execSync('git add package.json CHANGELOG.md', { stdio: 'pipe' });

    // Commit
    const commitMessage = `chore(release): bump version to v${version}

Update package.json and CHANGELOG.md for release v${version}

Co-authored-by: jlucus <jlucus@users.noreply.github.com>
Co-authored-by: 4eckd <4eckd@users.noreply.github.com>`;

    execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe' });

    log(`✅ Committed version changes`, 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to commit changes: ${error.message}`, 'red');
    return false;
  }
}

function displayVersionInfo(currentVersion, newVersion, type) {
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║   Version Bump Summary                ║', 'blue');
  log('╚════════════════════════════════════════╝\n', 'blue');

  log(`   Type:         ${type}`, 'reset');
  log(`   Current:      v${currentVersion}`, 'reset');
  log(`   New:          v${newVersion}`, 'green');
  log('');
}

function showUsage() {
  log('\n📖 Usage:', 'blue');
  log('   npm run version <type> [options]\n', 'reset');

  log('Version Types:', 'blue');
  log('   patch    Increment patch version (1.0.0 -> 1.0.1)', 'reset');
  log('   minor    Increment minor version (1.0.0 -> 1.1.0)', 'reset');
  log('   major    Increment major version (1.0.0 -> 2.0.0)\n', 'reset');

  log('Options:', 'blue');
  log('   --no-git-tag   Skip creating git tag', 'reset');
  log('   --no-commit    Skip committing changes', 'reset');
  log('   --dry-run      Show what would be done without making changes\n', 'reset');

  log('Examples:', 'blue');
  log('   npm run version patch', 'reset');
  log('   npm run version minor --no-git-tag', 'reset');
  log('   npm run version major --dry-run\n', 'reset');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }

  const type = args[0];
  const dryRun = args.includes('--dry-run');
  const noGitTag = args.includes('--no-git-tag');
  const noCommit = args.includes('--no-commit');

  if (!['major', 'minor', 'patch'].includes(type)) {
    log(`❌ Invalid version type: ${type}`, 'red');
    showUsage();
    process.exit(1);
  }

  const currentVersion = getCurrentVersion();
  const newVersion = bumpVersion(currentVersion, type);

  displayVersionInfo(currentVersion, newVersion, type);

  if (dryRun) {
    log('🔍 DRY RUN - No changes will be made\n', 'yellow');
    log('Would update:', 'blue');
    log('  • package.json', 'reset');
    log('  • CHANGELOG.md', 'reset');
    if (!noCommit) log('  • git commit', 'reset');
    if (!noGitTag) log('  • git tag', 'reset');
    log('');
    return;
  }

  // Perform version bump
  try {
    updatePackageJson(newVersion);
    updateChangelog(newVersion);

    if (!noCommit) {
      commitVersionChanges(newVersion);
    }

    if (!noGitTag) {
      createGitTag(newVersion);
    }

    log('\n✅ Version bump complete!\n', 'green');

    log('Next steps:', 'blue');
    log('  1. Review changes: git show', 'blue');
    if (!noGitTag) {
      log(`  2. Push tag: git push origin v${newVersion}`, 'blue');
      log('  3. Push commit: git push', 'blue');
    } else {
      log('  2. Push commit: git push', 'blue');
    }
    log('  4. Create GitHub release (optional)\n', 'blue');

  } catch (error) {
    log(`\n❌ Version bump failed: ${error.message}\n`, 'red');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}\n`, 'red');
  process.exit(1);
});
