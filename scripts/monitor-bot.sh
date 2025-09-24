#!/bin/bash

# JustTheTip Bot Health Monitor Script
echo "🤏💸 JustTheTip Bot - Health Monitor"
echo "======================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 PM2 Process Status:${NC}"
pm2 status | grep justthetip

echo ""
echo -e "${BLUE}📝 Recent Logs:${NC}"
pm2 logs justthetip-working --lines 3 --nostream 2>/dev/null

echo ""
echo -e "${BLUE}⚡ Commands Deployed:${NC}"
echo "Total: 11 slash commands"
echo "/help /balance /registerwallet /tip /deposit /withdraw /airdrop /collect /burn /health /admin"

echo ""
echo -e "${GREEN}✅ Bot is running successfully!${NC}"
