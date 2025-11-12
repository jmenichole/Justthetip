# JustTheTip Repository Foundation

**Version**: 1.0.0
**Last Updated**: 2025-11-12
**Maintainer**: 4eckd

---

## 🎯 Overview

This document describes the comprehensive repository foundation and automation tools implemented for JustTheTip, transforming it into a production-ready, contributor-friendly open-source project.

---

## 📦 What's Included

### 1. GitHub Templates

**Issue Templates** (`.github/ISSUE_TEMPLATE/`)
- `bug_report.md` - Structured bug reporting
- `feature_request.md` - Feature proposals with success criteria
- `documentation.md` - Documentation improvement requests
- `security.md` - Security vulnerability reporting guidelines
- `config.yml` - Issue template configuration with community links

**Pull Request Template**
- Comprehensive PR checklist covering code quality, testing, documentation, and security
- Conventional commits enforcement
- Breaking changes documentation
- Reviewer guidance

### 2. Automation Scripts

#### Repository Launcher (`scripts/repo-launcher.sh`)
Interactive CLI tool for repository setup and maintenance.

**Features:**
- Repository structure audit
- Git configuration setup
- Upstream remote configuration
- Dependency installation
- Health checks
- Interactive menu system

**Usage:**
```bash
# Interactive mode
npm run repo:launcher

# Direct commands
npm run repo:audit      # Audit repository structure
npm run repo:health     # Run health check

# Or directly
./scripts/repo-launcher.sh
./scripts/repo-launcher.sh --audit
./scripts/repo-launcher.sh --setup
./scripts/repo-launcher.sh --health
```

#### Repository Verification (`scripts/verify-repository.js`)
Comprehensive automated verification system.

**Checks:**
- ✅ Critical files presence
- ✅ Documentation completeness
- ✅ GitHub templates
- ✅ Workflows configuration
- ✅ Security audit (sensitive files, git history)
- ✅ Code quality (ESLint, Prettier, EditorConfig)
- ✅ Dependencies (installation, outdated packages, vulnerabilities)
- ✅ Git configuration

**Usage:**
```bash
npm run verify-repo
```

**Output:**
- Color-coded status messages
- Health score (0-100)
- Critical issues count
- Warnings count
- Actionable recommendations

### 3. Git Hooks (Husky)

Pre-configured Git hooks to enforce quality standards.

#### Pre-Commit Hook (`.husky/pre-commit`)
Runs before each commit:
- ✅ Linting (ESLint)
- ✅ Sensitive file detection (.env, keys, credentials)
- ✅ Large file warnings
- ⚠️ console.log detection

#### Commit Message Hook (`.husky/commit-msg`)
Enforces Conventional Commits format:
```
<type>(<scope>): <subject>

Examples:
  feat(telegram): add tip command
  fix(api): resolve wallet verification bug
  docs(readme): update installation instructions
```

**Supported Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style
- `refactor` - Refactoring
- `test` - Tests
- `chore` - Maintenance
- `perf` - Performance
- `ci` - CI/CD
- `build` - Build system
- `revert` - Revert commit

**Setup:**
```bash
npm run setup:hooks
```

### 4. Setup Scripts

#### Telegram Setup (`scripts/setup-telegram.sh`)
- Installs Telegram bot dependencies
- Creates directory structure
- Generates starter bot files
- Creates test script

**Usage:**
```bash
npm run setup:telegram
```

#### Passkey Wallet Setup (`scripts/setup-passkey-wallet.sh`)
- Installs WebAuthn/passkey dependencies
- Creates wallet infrastructure
- Generates passkey service boilerplate
- Sets up API routes

**Usage:**
```bash
npm run setup:passkey
```

#### Complete Setup (`scripts/run-all-setup.sh`)
Runs all setup scripts in sequence.

**Usage:**
```bash
npm run setup:all
```

---

## 🚀 Quick Start

### For New Contributors

1. **Clone the repository**
   ```bash
   git clone https://github.com/4eckd/Justthetip.git
   cd Justthetip
   ```

2. **Run the repository launcher**
   ```bash
   npm run repo:launcher
   ```

   This will guide you through:
   - Prerequisite checks
   - Git configuration
   - Upstream remote setup
   - Dependency installation
   - Environment setup

3. **Install Git hooks**
   ```bash
   npm run setup:hooks
   ```

4. **Verify repository health**
   ```bash
   npm run verify-repo
   ```

5. **Start developing!**
   ```bash
   # Create feature branch
   git checkout -b feature/my-awesome-feature

   # Make changes, commit (hooks will run automatically)
   git add .
   git commit -m "feat(feature): add awesome feature"
   ```

### For Existing Contributors

1. **Update repository foundation**
   ```bash
   git pull origin main
   npm install
   npm run setup:hooks
   ```

2. **Run health check**
   ```bash
   npm run repo:health
   ```

3. **Verify everything is working**
   ```bash
   npm run verify-repo
   ```

---

## 📋 NPM Scripts Reference

### Core Scripts
| Script | Description |
|--------|-------------|
| `npm start` | Start API server |
| `npm run start:bot` | Start Discord bot |
| `npm run start:telegram` | Start Telegram bot |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |

### Setup Scripts
| Script | Description |
|--------|-------------|
| `npm run setup:all` | Run all setup scripts |
| `npm run setup:telegram` | Setup Telegram integration |
| `npm run setup:passkey` | Setup passkey wallet |
| `npm run setup:hooks` | Install Git hooks |

### Verification & Audit
| Script | Description |
|--------|-------------|
| `npm run verify-repo` | Full repository verification |
| `npm run verify-env` | Verify environment variables |
| `npm run repo:launcher` | Interactive repository setup |
| `npm run repo:audit` | Audit repository structure |
| `npm run repo:health` | Repository health check |

### Smart Contracts
| Script | Description |
|--------|-------------|
| `npm run build:contracts` | Build Anchor programs |
| `npm run test:contracts` | Run contract tests |
| `npm run deploy:devnet` | Deploy to Solana devnet |
| `npm run deploy:mainnet` | Deploy to Solana mainnet |

---

## 🔍 Health Check Criteria

The repository health score (0-100) is calculated based on:

### Critical Issues (−10 points each)
- Missing critical files (README, LICENSE, package.json, etc.)
- Security vulnerabilities (exposed .env, secrets in git history)
- Broken dependencies
- Git configuration errors

### Warnings (−2 points each)
- Missing optional documentation
- Missing GitHub templates
- Outdated packages
- Code quality issues
- Working directory not clean

### Health Score Interpretation
- **90-100**: Excellent! Repository in great shape
- **70-89**: Good! Minor improvements recommended
- **50-69**: Fair! Several improvements needed
- **0-49**: Action required! Critical issues found

---

## 🛡️ Security Features

### 1. Sensitive File Protection
Git hooks prevent committing:
- `.env` files
- Private keys (`id_rsa`, etc.)
- Credential files
- Any file matching sensitive patterns

### 2. Git History Scanning
Verification script scans git history for accidentally committed secrets.

### 3. Dependency Vulnerability Scanning
Automatic npm audit checks for known vulnerabilities.

### 4. .gitignore Validation
Ensures sensitive files are properly ignored.

---

## 📚 Documentation Structure

```
/
├── README.md                          # Main project documentation
├── CODEBASE_INDEX.md                  # Complete codebase reference
├── TELEGRAM_INTEGRATION_PLAN.md       # Telegram features planning
├── CONTRIBUTING_PLAN.md               # Fork contribution strategy
├── REPOSITORY_FOUNDATION.md           # This document
├── CONTRIBUTING.md                    # Contribution guidelines
├── CODE_OF_CONDUCT.md                 # Community standards
├── SECURITY.md                        # Security policy
├── CHANGELOG.md                       # Version history
└── docs/                              # Extended documentation
```

---

## 🔄 Git Workflow

### Recommended Workflow

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git merge upstream/main
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/descriptive-name
   ```

3. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   # Hooks will run automatically
   ```

4. **Push to fork**
   ```bash
   git push -u origin feature/descriptive-name
   ```

5. **Create pull request**
   - Use the PR template
   - Fill in all sections
   - Link related issues

### Branch Naming Conventions

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates
- `chore/` - Maintenance tasks

---

## 🎨 Code Quality Standards

### ESLint Configuration
- Node.js + ES2021 environment
- Security plugin enabled
- Prettier integration

### EditorConfig
- 2-space indentation
- UTF-8 encoding
- LF line endings
- Trailing whitespace trimming

### Testing
- Jest for unit tests
- Anchor for contract tests
- Minimum 80% coverage target

---

## 🤝 Contributing

### Before Submitting PR

1. ✅ Run verification: `npm run verify-repo`
2. ✅ Ensure tests pass: `npm test`
3. ✅ Lint code: `npm run lint`
4. ✅ Update CHANGELOG.md
5. ✅ Fill out PR template completely
6. ✅ Link related issues

### PR Review Process

1. Automated checks run (CI)
2. Code review by maintainers
3. Address feedback
4. Approval + merge

---

## 📊 Metrics & Analytics

Track repository health with:
- GitHub Insights
- Dependency vulnerability alerts (Dependabot)
- Code quality metrics (ESLint)
- Test coverage reports
- npm audit results

---

## 🔧 Troubleshooting

### Git Hooks Not Running

```bash
# Reinstall hooks
npm run setup:hooks

# Check hook permissions
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

### Verification Script Failing

```bash
# Update dependencies
npm install

# Check Node.js version
node -v  # Should be 18+

# Run with debug output
DEBUG=1 npm run verify-repo
```

### Linting Errors

```bash
# Auto-fix where possible
npm run lint -- --fix

# Check specific files
npx eslint path/to/file.js
```

---

## 🎯 Roadmap

### Future Enhancements

- [ ] Automated dependency updates (Dependabot/Renovate)
- [ ] Code coverage enforcement in CI
- [ ] Performance benchmarking
- [ ] Automated changelog generation
- [ ] Release automation
- [ ] Documentation site generation (Docusaurus/VitePress)
- [ ] Contribution analytics dashboard

---

## 📞 Support

- **Issues**: https://github.com/jmenichole/Justthetip/issues
- **Discussions**: https://github.com/jmenichole/Justthetip/discussions
- **Security**: See SECURITY.md
- **Discord**: [Community server link]

---

## 📄 License

This repository foundation is part of JustTheTip, licensed under the Custom MIT-based license. See LICENSE for details.

---

## 🙏 Acknowledgments

Built with:
- [Husky](https://typicode.github.io/husky/) - Git hooks
- [ESLint](https://eslint.org/) - Linting
- [Prettier](https://prettier.io/) - Code formatting
- [Conventional Commits](https://www.conventionalcommits.org/) - Commit standards

Inspired by best practices from:
- [GitHub's Open Source Guides](https://opensource.guide/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-12
**Maintainer**: 4eckd <4eckd@users.noreply.github.com>
