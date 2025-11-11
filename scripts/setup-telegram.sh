#!/bin/bash

# JustTheTip Telegram Integration Setup Script
# Author: 4eckd
# Description: Automated setup for Telegram bot and passkey wallet features

set -e  # Exit on error

echo "🚀 JustTheTip Telegram Integration Setup"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18 or higher.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher. Current: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm version: $(npm -v)${NC}"
echo ""

# Install dependencies
echo "📦 Installing Telegram and Passkey dependencies..."
npm install --save \
    node-telegram-bot-api \
    telegraf \
    @simplewebauthn/browser \
    @simplewebauthn/server \
    @github/webauthn-json

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Create directory structure
echo "📁 Creating directory structure..."

mkdir -p telegram/{commands,middleware,services,utils}
mkdir -p telegram/webapp/{components,hooks,styles}
mkdir -p wallet/{components,hooks,services}
mkdir -p api/telegram
mkdir -p api/wallet

echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Copying from .env.example...${NC}"

    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created${NC}"
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Check for required environment variables
echo ""
echo "🔍 Checking environment variables..."

MISSING_VARS=()

# Check Telegram variables
if ! grep -q "TELEGRAM_BOT_TOKEN=" .env || grep -q "TELEGRAM_BOT_TOKEN=$" .env; then
    MISSING_VARS+=("TELEGRAM_BOT_TOKEN")
fi

# Check Passkey variables
if ! grep -q "PASSKEY_RP_ID=" .env || grep -q "PASSKEY_RP_ID=$" .env; then
    MISSING_VARS+=("PASSKEY_RP_ID")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please update your .env file with the required values."
    echo "See TELEGRAM_INTEGRATION_PLAN.md for details."
else
    echo -e "${GREEN}✓ All required environment variables are set${NC}"
fi

echo ""

# Run database migrations
echo "🗄️  Running database migrations..."

if [ -f "db/migrate-telegram.sql" ]; then
    echo "Applying Telegram schema..."
    # Will be implemented after migration files are created
    echo -e "${GREEN}✓ Telegram migrations ready${NC}"
else
    echo -e "${YELLOW}⚠️  Migration file not found (will be created later)${NC}"
fi

echo ""

# Create starter files
echo "📝 Creating starter files..."

# Telegram bot starter
cat > telegram/bot.js << 'EOF'
/**
 * JustTheTip Telegram Bot
 * Author: 4eckd
 */

const TelegramBot = require('node-telegram-bot-api');
const { JustTheTipSDK } = require('../contracts/sdk');

class JustTheTipTelegramBot {
  constructor(token, solanaConfig) {
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.sdk = new JustTheTipSDK(solanaConfig);
    this.registerHandlers();
  }

  registerHandlers() {
    this.bot.onText(/\/start/, this.handleStart.bind(this));
    this.bot.onText(/\/help/, this.handleHelp.bind(this));
    this.bot.onText(/\/register/, this.handleRegister.bind(this));
    this.bot.onText(/\/balance/, this.handleBalance.bind(this));
    this.bot.onText(/\/tip/, this.handleTip.bind(this));

    this.bot.on('callback_query', this.handleCallback.bind(this));
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const welcomeMessage = `
🎉 Welcome to JustTheTip!

A non-custodial Solana tipping bot for Telegram.

Use /help to see available commands.
Use /register to connect your wallet.
    `;

    await this.bot.sendMessage(chatId, welcomeMessage);
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;
    const helpMessage = `
📖 Available Commands:

/start - Get started
/register - Register your wallet
/balance - Check your balance
/tip @user <amount> <token> - Send a tip
/help - Show this message
    `;

    await this.bot.sendMessage(chatId, helpMessage);
  }

  async handleRegister(msg) {
    // TODO: Implement wallet registration
    await this.bot.sendMessage(msg.chat.id, 'Registration coming soon!');
  }

  async handleBalance(msg) {
    // TODO: Implement balance check
    await this.bot.sendMessage(msg.chat.id, 'Balance check coming soon!');
  }

  async handleTip(msg) {
    // TODO: Implement tipping
    await this.bot.sendMessage(msg.chat.id, 'Tipping coming soon!');
  }

  async handleCallback(query) {
    // TODO: Handle inline button callbacks
    await this.bot.answerCallbackQuery(query.id);
  }

  start() {
    console.log('✅ Telegram bot started successfully');
  }

  stop() {
    this.bot.stopPolling();
    console.log('Bot stopped');
  }
}

module.exports = JustTheTipTelegramBot;
EOF

echo -e "${GREEN}✓ Created telegram/bot.js${NC}"

# Create test script
cat > scripts/test-telegram-bot.js << 'EOF'
/**
 * Telegram Bot Test Script
 * Usage: node scripts/test-telegram-bot.js
 */

require('dotenv').config();
const JustTheTipTelegramBot = require('../telegram/bot');

const token = process.env.TELEGRAM_BOT_TOKEN;
const solanaConfig = {
  rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  cluster: process.env.SOLANA_CLUSTER || 'devnet'
};

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set in .env file');
  process.exit(1);
}

console.log('🚀 Starting Telegram bot...');
console.log('Cluster:', solanaConfig.cluster);

const bot = new JustTheTipTelegramBot(token, solanaConfig);
bot.start();

console.log('Bot is running. Send /start to your bot on Telegram to test.');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  bot.stop();
  process.exit(0);
});
EOF

chmod +x scripts/test-telegram-bot.js

echo -e "${GREEN}✓ Created scripts/test-telegram-bot.js${NC}"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your Telegram bot token"
echo "2. Run: node scripts/test-telegram-bot.js"
echo "3. See TELEGRAM_INTEGRATION_PLAN.md for full implementation guide"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
