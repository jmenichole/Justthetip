#!/bin/bash

echo "🚀 Deploying Escrow Program to Solana Mainnet"
echo "=============================================="

# Set Solana CLI to mainnet
echo "📡 Setting Solana CLI to mainnet..."
solana config set --url https://api.mainnet-beta.solana.com

# Check balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance | awk '{print $1}')
echo "Current balance: $BALANCE SOL"

REQUIRED_SOL="2.0"
if (( $(echo "$BALANCE < $REQUIRED_SOL" | bc -l) )); then
    echo "❌ Insufficient balance. You need at least $REQUIRED_SOL SOL for deployment."
    echo "Please fund your wallet with SOL before proceeding."
    echo "Mainnet wallet address: $(solana address)"
    exit 1
fi

# Go to contracts directory
cd justthetip-contracts

# Build and deploy
echo "🔨 Building program..."
anchor build --no-idl

echo "📦 Deploying to mainnet..."
anchor deploy --provider.cluster mainnet

echo "✅ Deployment complete!"
echo "Program ID: DfH4cf9ydEAoNwodv2jezSRJbVxsSgcXvko847UabTsJ"
echo "Network: Mainnet"
