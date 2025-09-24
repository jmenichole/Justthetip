#!/bin/bash

echo "🚀 Starting JustTheTip Bot on Mainnet"
echo "====================================="

# Copy mainnet environment file
echo "📋 Setting up mainnet environment..."
cp .env.mainnet .env

# Start the bot
echo "🤖 Starting Discord bot..."
npm start
