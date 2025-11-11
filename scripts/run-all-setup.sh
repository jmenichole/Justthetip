#!/bin/bash

# JustTheTip Complete Setup Script
# Author: 4eckd
# Description: Run all setup scripts for Telegram and Passkey integration

set -e

echo "🚀 JustTheTip Complete Integration Setup"
echo "========================================"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Make scripts executable
chmod +x scripts/setup-telegram.sh
chmod +x scripts/setup-passkey-wallet.sh

echo "1️⃣  Running Telegram setup..."
echo ""
bash scripts/setup-telegram.sh

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "2️⃣  Running Passkey Wallet setup..."
echo ""
bash scripts/setup-passkey-wallet.sh

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Complete setup finished!${NC}"
echo ""
echo "📚 Next steps:"
echo "1. Review TELEGRAM_INTEGRATION_PLAN.md for implementation details"
echo "2. Update .env with your bot tokens and configuration"
echo "3. Run database migrations (when available)"
echo "4. Test Telegram bot: node scripts/test-telegram-bot.js"
echo "5. Deploy to production (HTTPS required for passkeys)"
echo ""
echo -e "${YELLOW}⚠️  Remember: Passkeys require HTTPS in production!${NC}"
echo ""
echo "Happy building! 🎉"
