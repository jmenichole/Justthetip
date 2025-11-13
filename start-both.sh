#!/bin/bash
# Start both API server and Discord bot

echo "🚀 Starting API Server..."
node api/server.js &
API_PID=$!

echo "🤖 Starting Discord Bot..."
node bot_smart_contract.js &
BOT_PID=$!

echo "✅ Both services started"
echo "   API Server PID: $API_PID"
echo "   Discord Bot PID: $BOT_PID"

# Wait for both processes
wait
