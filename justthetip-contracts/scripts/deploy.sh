#!/bin/bash

# JustTheTip Smart Contract Deployment Script
# This script helps deploy the Solana program to devnet or mainnet

set -e

echo "🚀 JustTheTip Smart Contract Deployment"
echo "========================================"
echo ""

# Check if cluster argument is provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/deploy.sh [devnet|mainnet]"
    exit 1
fi

CLUSTER=$1

# Validate cluster
if [ "$CLUSTER" != "devnet" ] && [ "$CLUSTER" != "mainnet" ]; then
    echo "❌ Error: Cluster must be 'devnet' or 'mainnet'"
    exit 1
fi

echo "📋 Deployment Configuration:"
echo "   Cluster: $CLUSTER"
echo ""

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Error: Anchor CLI not found. Please install it first."
    echo "   Visit: https://www.anchor-lang.com/docs/installation"
    exit 1
fi

# Check Solana CLI
if ! command -v solana &> /dev/null; then
    echo "❌ Error: Solana CLI not found. Please install it first."
    echo "   Visit: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Set Solana config
echo "⚙️  Configuring Solana CLI..."
if [ "$CLUSTER" = "devnet" ]; then
    solana config set --url devnet
else
    solana config set --url mainnet-beta
fi
echo ""

# Check balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance 2>/dev/null | awk '{print $1}')
echo "   Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
    echo "⚠️  Warning: Low balance. Deployment requires ~0.5-1 SOL"
    if [ "$CLUSTER" = "devnet" ]; then
        echo "   Getting devnet SOL..."
        solana airdrop 2
    else
        echo "   Please add more SOL to your wallet for mainnet deployment"
        exit 1
    fi
fi
echo ""

# Build program
echo "🔨 Building program..."
anchor build
echo "✅ Build complete"
echo ""

# Get program ID
PROGRAM_ID=$(anchor keys list | grep justthetip | awk '{print $2}')
echo "📝 Program ID: $PROGRAM_ID"
echo ""

# Confirm deployment
if [ "$CLUSTER" = "mainnet" ]; then
    echo "⚠️  WARNING: You are about to deploy to MAINNET!"
    echo "   This will cost real SOL and cannot be easily undone."
    echo ""
    read -p "   Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Deployment cancelled"
        exit 0
    fi
    echo ""
fi

# Deploy
echo "🚀 Deploying to $CLUSTER..."
anchor deploy --provider.cluster $CLUSTER
echo ""

# Verify deployment
echo "✅ Deployment complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Update Anchor.toml with program ID: $PROGRAM_ID"
echo "   2. Copy IDL to contracts: cp target/idl/justthetip.json ../contracts/"
echo "   3. Update bot configuration with new program ID"
echo "   4. Test the deployment with: anchor test --skip-local-validator"
echo ""

if [ "$CLUSTER" = "mainnet" ]; then
    echo "🔍 Verify on Solana Explorer:"
    echo "   https://explorer.solana.com/address/$PROGRAM_ID"
else
    echo "🔍 Verify on Solana Explorer:"
    echo "   https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
fi
echo ""

echo "🎉 Deployment successful!"
