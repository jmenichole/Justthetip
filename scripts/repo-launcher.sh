#!/bin/bash

# ==================================================
# 🚀 JustTheTip Repository Launcher & Auditor
# Universal setup script for fork and contribution setup
# Author: 4eckd
# ==================================================

set -e  # Exit on error

# ============== CONFIGURATION ==============
SCRIPT_VERSION="1.0.0"
REPO_NAME="Justthetip"
DEFAULT_ORG="jmenichole"
FORK_ORG="${FORK_ORG:-4eckd}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============== FUNCTIONS ==============

print_banner() {
    echo -e "${MAGENTA}"
    cat << "EOF"
    ╔════════════════════════════════════════════════════╗
    ║                                                    ║
    ║        JustTheTip Repository Launcher v1.0         ║
    ║        Universal Git Foundation Auditor            ║
    ║                                                    ║
    ╚════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${CYAN}▶️  $1${NC}"; }

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."

    local missing=0

    # Git
    if ! command -v git &> /dev/null; then
        log_error "Git not installed. Install from: https://git-scm.com/"
        ((missing++))
    else
        log_success "Git: $(git --version)"
    fi

    # GitHub CLI (optional but recommended)
    if ! command -v gh &> /dev/null; then
        log_warning "GitHub CLI not found (optional). Install from: https://cli.github.com/"
        USE_GH_CLI=false
    else
        log_success "GitHub CLI: $(gh --version | head -n1)"
        USE_GH_CLI=true

        if ! gh auth status &> /dev/null; then
            log_warning "GitHub CLI not authenticated. Run: gh auth login"
            USE_GH_CLI=false
        fi
    fi

    # Node.js
    if ! command -v node &> /dev/null; then
        log_warning "Node.js not found. Some features may not work."
    else
        local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -lt 18 ]; then
            log_warning "Node.js version should be 18+. Current: $(node -v)"
        else
            log_success "Node.js: $(node -v)"
        fi
    fi

    # npm
    if ! command -v npm &> /dev/null; then
        log_warning "npm not found."
    else
        log_success "npm: $(npm -v)"
    fi

    if [ $missing -gt 0 ]; then
        log_error "Missing required dependencies. Please install and try again."
        exit 1
    fi

    echo ""
}

# Audit repository structure
audit_repository() {
    log_step "Auditing repository structure..."

    local issues=0
    local warnings=0

    echo ""
    echo "📁 Directory Structure Audit"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check critical directories
    local critical_dirs=("src" "api" "contracts" "db" ".github/workflows")
    for dir in "${critical_dirs[@]}"; do
        if [ -d "$dir" ]; then
            log_success "Found: $dir/"
        else
            log_warning "Missing: $dir/"
            ((warnings++))
        fi
    done

    echo ""
    echo "📄 Documentation Audit"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check critical files
    local critical_files=(
        "README.md"
        "LICENSE"
        "CONTRIBUTING.md"
        "CODE_OF_CONDUCT.md"
        "SECURITY.md"
        "CHANGELOG.md"
        ".gitignore"
        "package.json"
    )

    for file in "${critical_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "Found: $file"
        else
            log_error "Missing: $file"
            ((issues++))
        fi
    done

    echo ""
    echo "⚙️  GitHub Configuration Audit"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check GitHub templates
    local gh_templates=(
        ".github/ISSUE_TEMPLATE/bug_report.md"
        ".github/ISSUE_TEMPLATE/feature_request.md"
        ".github/PULL_REQUEST_TEMPLATE.md"
    )

    for template in "${gh_templates[@]}"; do
        if [ -f "$template" ]; then
            log_success "Found: $template"
        else
            log_warning "Missing: $template"
            ((warnings++))
        fi
    done

    # Check workflows
    if [ -d ".github/workflows" ]; then
        local workflow_count=$(find .github/workflows -name "*.yml" -o -name "*.yaml" | wc -l)
        log_success "Found $workflow_count workflow(s)"
    else
        log_warning "No workflows directory found"
        ((warnings++))
    fi

    echo ""
    echo "🔐 Security Audit"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check for common security issues
    if grep -r "PRIVATE_KEY" .env.example &> /dev/null; then
        log_warning "Private key references in .env.example (ensure they're placeholders)"
    fi

    if [ -f ".env" ]; then
        log_warning ".env file exists (ensure it's in .gitignore)"
        if grep "^\.env$" .gitignore &> /dev/null; then
            log_success ".env is properly ignored"
        else
            log_error ".env should be in .gitignore!"
            ((issues++))
        fi
    fi

    # Check for exposed secrets
    if git log --all --pretty=format: --name-only --diff-filter=A | grep -E "\\.env$|id_rsa|credentials" &> /dev/null; then
        log_error "Potential secrets found in git history!"
        ((issues++))
    fi

    echo ""
    echo "📊 Audit Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ $issues -eq 0 ] && [ $warnings -eq 0 ]; then
        log_success "Repository is in excellent shape! 🎉"
    elif [ $issues -eq 0 ]; then
        log_warning "Repository is good, with $warnings minor issue(s)"
    else
        log_error "Found $issues critical issue(s) and $warnings warning(s)"
    fi

    echo ""
}

# Setup git configuration
setup_git_config() {
    log_step "Configuring Git..."

    # Get current git config
    local current_name=$(git config user.name 2>/dev/null || echo "")
    local current_email=$(git config user.email 2>/dev/null || echo "")

    if [ -z "$current_name" ] || [ -z "$current_email" ]; then
        log_warning "Git user not configured"

        read -p "Enter your name (for commits): " git_name
        read -p "Enter your email: " git_email

        git config user.name "$git_name"
        git config user.email "$git_email"

        log_success "Git configured: $git_name <$git_email>"
    else
        log_success "Git already configured: $current_name <$current_email>"
    fi

    # Suggest GPG signing
    if ! git config commit.gpgsign &> /dev/null; then
        log_warning "GPG commit signing not enabled"
        read -p "Enable GPG signing? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "See: https://docs.github.com/en/authentication/managing-commit-signature-verification"
        fi
    fi

    echo ""
}

# Setup upstream remote
setup_upstream() {
    log_step "Setting up upstream remote..."

    if git remote get-url upstream &> /dev/null; then
        local upstream_url=$(git remote get-url upstream)
        log_success "Upstream already configured: $upstream_url"
    else
        log_info "Adding upstream remote..."
        git remote add upstream "https://github.com/${DEFAULT_ORG}/${REPO_NAME}.git"
        log_success "Upstream added: https://github.com/${DEFAULT_ORG}/${REPO_NAME}.git"
    fi

    log_info "Fetching upstream..."
    git fetch upstream

    echo ""
}

# Install dependencies
install_dependencies() {
    log_step "Installing dependencies..."

    if [ -f "package.json" ]; then
        if [ -f "package-lock.json" ]; then
            log_info "Running npm ci..."
            npm ci
        else
            log_info "Running npm install..."
            npm install
        fi
        log_success "Dependencies installed"
    else
        log_warning "No package.json found, skipping npm install"
    fi

    echo ""
}

# Run setup scripts
run_setup_scripts() {
    log_step "Running setup scripts..."

    if [ -x "scripts/setup-telegram.sh" ]; then
        log_info "Telegram setup available: npm run setup:telegram"
    fi

    if [ -x "scripts/setup-passkey-wallet.sh" ]; then
        log_info "Passkey wallet setup available: npm run setup:passkey"
    fi

    read -p "Run all setup scripts now? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f "scripts/run-all-setup.sh" ]; then
            bash scripts/run-all-setup.sh
        fi
    fi

    echo ""
}

# Health check
health_check() {
    log_step "Running health check..."

    local health_score=100
    local issues=()

    # Check if dependencies are installed
    if [ -d "node_modules" ]; then
        log_success "Dependencies installed"
    else
        log_warning "Dependencies not installed"
        issues+=("Run: npm install")
        ((health_score-=10))
    fi

    # Check if .env exists
    if [ -f ".env" ]; then
        log_success ".env file exists"
    else
        log_warning ".env file missing"
        issues+=("Copy .env.example to .env and configure")
        ((health_score-=20))
    fi

    # Check git status
    if [ -z "$(git status --porcelain)" ]; then
        log_success "Working directory clean"
    else
        log_warning "Uncommitted changes detected"
        ((health_score-=5))
    fi

    # Check if on a feature branch
    local current_branch=$(git branch --show-current)
    if [[ "$current_branch" == "main" || "$current_branch" == "master" ]]; then
        log_warning "Currently on $current_branch (create a feature branch for development)"
        issues+=("Create feature branch: git checkout -b feature/your-feature")
        ((health_score-=10))
    else
        log_success "On feature branch: $current_branch"
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}🏥 Repository Health Score: ${health_score}/100${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ ${#issues[@]} -gt 0 ]; then
        echo ""
        echo "📋 Action Items:"
        for issue in "${issues[@]}"; do
            echo "  • $issue"
        done
    fi

    echo ""
}

# Display next steps
show_next_steps() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         🎉 Repository Setup Complete!              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "📚 Documentation:"
    echo "   • CODEBASE_INDEX.md - Complete codebase documentation"
    echo "   • TELEGRAM_INTEGRATION_PLAN.md - Telegram feature plan"
    echo "   • CONTRIBUTING_PLAN.md - Fork contribution strategy"
    echo ""
    echo "🚀 Quick Commands:"
    echo "   npm run setup:all         # Run all setup scripts"
    echo "   npm run setup:telegram    # Setup Telegram bot"
    echo "   npm run setup:passkey     # Setup passkey wallet"
    echo "   npm run start:bot         # Start Discord bot"
    echo "   npm run start:telegram    # Start Telegram bot"
    echo "   npm test                  # Run tests"
    echo "   npm run lint              # Lint code"
    echo ""
    echo "🔄 Git Workflow:"
    echo "   git fetch upstream        # Fetch latest from upstream"
    echo "   git checkout -b feature/my-feature  # Create feature branch"
    echo "   git add . && git commit   # Commit changes"
    echo "   git push -u origin feature/my-feature  # Push to fork"
    echo ""
    echo "📖 Resources:"
    echo "   • GitHub: https://github.com/${DEFAULT_ORG}/${REPO_NAME}"
    echo "   • Docs: https://${DEFAULT_ORG}.github.io/${REPO_NAME}"
    echo "   • Issues: https://github.com/${DEFAULT_ORG}/${REPO_NAME}/issues"
    echo ""
}

# Main menu
show_menu() {
    echo ""
    echo "What would you like to do?"
    echo ""
    echo "  1) 🔍 Audit repository structure"
    echo "  2) ⚙️  Setup Git configuration"
    echo "  3) 🔄 Setup upstream remote"
    echo "  4) 📦 Install dependencies"
    echo "  5) 🚀 Run setup scripts"
    echo "  6) 🏥 Health check"
    echo "  7) 📊 Full setup (all of the above)"
    echo "  8) ❓ Help"
    echo "  9) 🚪 Exit"
    echo ""
    read -p "Choose an option [1-9]: " choice

    case $choice in
        1) audit_repository ;;
        2) setup_git_config ;;
        3) setup_upstream ;;
        4) install_dependencies ;;
        5) run_setup_scripts ;;
        6) health_check ;;
        7) full_setup ;;
        8) show_help ;;
        9) exit 0 ;;
        *) log_error "Invalid option"; show_menu ;;
    esac

    show_menu
}

# Full setup
full_setup() {
    check_prerequisites
    audit_repository
    setup_git_config
    setup_upstream
    install_dependencies
    run_setup_scripts
    health_check
    show_next_steps
}

# Show help
show_help() {
    cat << EOF

JustTheTip Repository Launcher - Help
═══════════════════════════════════════════════════════════

USAGE:
    ./scripts/repo-launcher.sh [OPTIONS]

OPTIONS:
    --audit         Run repository audit only
    --setup         Run full setup
    --health        Run health check only
    --help          Show this help message

EXAMPLES:
    # Interactive mode (default)
    ./scripts/repo-launcher.sh

    # Run audit only
    ./scripts/repo-launcher.sh --audit

    # Full automated setup
    ./scripts/repo-launcher.sh --setup

DOCUMENTATION:
    See CODEBASE_INDEX.md for complete documentation

EOF
}

# ============== MAIN EXECUTION ==============

main() {
    print_banner

    # Parse command line arguments
    case "${1:-}" in
        --audit)
            check_prerequisites
            audit_repository
            ;;
        --setup)
            full_setup
            ;;
        --health)
            health_check
            ;;
        --help)
            show_help
            ;;
        *)
            # Interactive mode
            show_menu
            ;;
    esac
}

# Run if not sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
