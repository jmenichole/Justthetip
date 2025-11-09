#!/bin/bash
#
# JustTheTip - Railway Deployment Setup Script
# This script prepares your project for Railway deployment
#
# Copyright (c) 2025 JustTheTip Bot
#
# This file is part of JustTheTip.
#
# Licensed under the JustTheTip Custom License (Based on MIT).
# See LICENSE file in the project root for full license information.
#
# SPDX-License-Identifier: MIT
#
# This software may not be sold commercially without permission.

set -e  # Exit on error

echo "🚂 JustTheTip - Railway Deployment Setup"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "✅ Project directory confirmed"
echo ""

# Step 1: Generate mint authority keypair
echo "📝 Step 1: Generate Mint Authority Keypair"
echo "-------------------------------------------"

if [ -f "security/mint-authority.json" ]; then
    echo -e "${YELLOW}⚠️  Mint authority keypair already exists${NC}"
    read -p "Regenerate? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping keypair generation"
    else
        rm security/mint-authority.json
    fi
fi

if [ ! -f "security/mint-authority.json" ]; then
    mkdir -p security
    echo "Generating new keypair..."
    solana-keygen new --outfile security/mint-authority.json --no-bip39-passphrase
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Keypair generated successfully${NC}"
        
        # Get public key
        PUBKEY=$(solana-keygen pubkey security/mint-authority.json)
        echo ""
        echo -e "${YELLOW}🔑 Mint Authority Public Key:${NC}"
        echo "$PUBKEY"
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANT: Send 0.5-1 SOL to this address!${NC}"
        echo ""
        
        # Convert to array
        echo "Converting keypair to array format for Railway..."
        node -e "const fs = require('fs'); const kp = JSON.parse(fs.readFileSync('security/mint-authority.json')); console.log(JSON.stringify(Array.from(kp)));" > mint-keypair.txt
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Keypair array saved to mint-keypair.txt${NC}"
            echo ""
        else
            echo -e "${RED}❌ Failed to convert keypair${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Failed to generate keypair${NC}"
        echo "Make sure solana-keygen is installed: https://docs.solana.com/cli/install-solana-cli-tools"
        exit 1
    fi
fi

# Step 2: Check Discord Client Secret
echo "📝 Step 2: Discord Client Secret"
echo "--------------------------------"

if grep -q "DISCORD_CLIENT_SECRET=" .env 2>/dev/null; then
    SECRET=$(grep "DISCORD_CLIENT_SECRET=" .env | cut -d'=' -f2)
    if [ ! -z "$SECRET" ] && [ "$SECRET" != "YOUR_SECRET_HERE" ]; then
        echo -e "${GREEN}✅ Discord Client Secret found in .env${NC}"
    else
        echo -e "${YELLOW}⚠️  Discord Client Secret not set in .env${NC}"
        echo "Get it from: https://discord.com/developers/applications/1419742988128616479/oauth2"
    fi
else
    echo -e "${YELLOW}⚠️  Discord Client Secret not found in .env${NC}"
    echo "Get it from: https://discord.com/developers/applications/1419742988128616479/oauth2"
fi
echo ""

# Step 3: Create deployment files
echo "📝 Step 3: Create Deployment Configuration Files"
echo "------------------------------------------------"

# Check if railway.json exists
if [ -f "railway.json" ]; then
    echo -e "${GREEN}✅ railway.json exists${NC}"
else
    echo -e "${YELLOW}⚠️  railway.json not found (should have been created)${NC}"
fi

# Check if .railwayignore exists
if [ -f ".railwayignore" ]; then
    echo -e "${GREEN}✅ .railwayignore exists${NC}"
else
    echo -e "${YELLOW}⚠️  .railwayignore not found (should have been created)${NC}"
fi

# Check if Procfile exists
if [ -f "Procfile" ]; then
    echo -e "${GREEN}✅ Procfile exists${NC}"
else
    echo -e "${YELLOW}⚠️  Procfile not found (should have been created)${NC}"
fi

echo ""

# Step 4: Test API server locally
echo "📝 Step 4: Test API Server Locally (Optional)"
echo "---------------------------------------------"

read -p "Test API server locally before deploying? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting API server..."
    echo "Press Ctrl+C to stop"
    echo ""
    
    # Start server in background
    node api/server.js &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 3
    
    # Test health endpoint
    echo "Testing health endpoint..."
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Server is running${NC}"
        echo "Response: $HEALTH_RESPONSE"
    else
        echo -e "${RED}❌ Server test failed${NC}"
    fi
    
    # Kill server
    kill $SERVER_PID 2>/dev/null
    echo ""
else
    echo "Skipping local test"
    echo ""
fi

# Step 5: Summary
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Deploy to Railway:"
echo "   → Go to https://railway.app"
echo "   → Create new project from GitHub"
echo "   → Select jmenichole/Justthetip repository"
echo ""
echo "2. Add Environment Variables in Railway:"
echo "   → DISCORD_CLIENT_ID=1419742988128616479"
echo "   → DISCORD_CLIENT_SECRET=<from Discord portal>"
echo "   → MINT_AUTHORITY_KEYPAIR=<paste content from mint-keypair.txt>"
echo "   → MONGODB_URI=<from your .env file>"
echo "   → SOLANA_RPC_URL=https://api.mainnet-beta.solana.com"
echo "   → PORT=3000"
echo "   → NODE_ENV=production"
echo ""
echo "3. Generate Railway Domain:"
echo "   → Settings → Networking → Generate Domain"
echo "   → Copy the URL"
echo ""
echo "4. Update Frontend:"
echo "   → Edit docs/landing-app.js"
echo "   → Update CONFIG.API_BASE_URL with Railway URL"
echo "   → Commit and push to GitHub"
echo ""
echo "5. Fund Mint Wallet:"
if [ -f "security/mint-authority.json" ]; then
    PUBKEY=$(solana-keygen pubkey security/mint-authority.json)
    echo "   → Send 0.5-1 SOL to: $PUBKEY"
fi
echo ""
echo "📚 Documentation:"
echo "   → Full Guide: DEPLOY_BACKEND.md"
echo "   → Config Help: .env.validation-report.md"
echo ""
echo -e "${YELLOW}⚠️  SECURITY REMINDERS:${NC}"
echo "   → Never commit mint-keypair.txt to Git"
echo "   → Never commit security/*.json files"
echo "   → Keep .env file in .gitignore"
echo "   → Rotate secrets regularly"
echo ""
echo "🚀 Ready to deploy! Follow DEPLOY_BACKEND.md for detailed instructions."
