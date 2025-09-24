#!/bin/bash

echo "🚀 Deploying Escrow Program to Solana Testnet"
echo "=============================================="

# Set Solana CLI to testnet
echo "📡 Setting Solana CLI to testnet..."
solana config set --url https://api.testnet.solana.com

# Check balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance | awk '{print $1}')
echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 1" | bc -l) )); then
    echo "❌ Insufficient balance. Requesting airdrop..."
    solana airdrop 2
    sleep 5
fi

# Go to test project directory
cd /tmp/test-project

# Build and deploy
echo "🔨 Building program..."
anchor build --no-idl

echo "📦 Deploying to testnet..."
anchor deploy --provider.cluster testnet

echo "✅ Deployment complete!"
echo "Program ID: 7PGCDfH3duBrAzKWXxTQufJJjnLEYtG219wPH39ZdDDb"
echo "Network: Testnet"
