#!/bin/bash

# JustTheTip Discord Bot - Quick Setup Script

echo "🤖 JustTheTip Discord Bot Setup"
echo "================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    if [ -f .env.template ]; then
        cp .env.template .env
        echo "✅ Created .env file from template"
    else
        echo "❌ No .env.template found. Please create one manually."
        exit 1
    fi
else
    echo "✅ Found existing .env file"
fi

# Check if BOT_TOKEN is set
if ! grep -q "^BOT_TOKEN=[^your_discord_bot_token_here]" .env; then
    echo ""
    echo "⚠️  BOT_TOKEN not configured!"
    echo "📝 Please edit your .env file and add your Discord bot token:"
    echo "   1. Go to https://discord.com/developers/applications"
    echo "   2. Create a new application and bot"
    echo "   3. Copy the bot token"
    echo "   4. Replace 'your_discord_bot_token_here' in .env with your actual token"
    echo ""
    echo "After setting up your token, run this script again or use: npm start"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create logs directory
mkdir -p logs

echo ""
echo "🚀 Starting JustTheTip Bot..."
echo "Press Ctrl+C to stop the bot"
echo ""

# Start the bot
node bot-demo.js