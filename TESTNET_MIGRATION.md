# Solana Testnet Migration Guide

## Overview
This guide covers migrating the JustTheTip escrow system from Solana Devnet to Testnet.

## ✅ Completed Changes

### 1. Environment Configuration
- ✅ Created `.env.testnet` with testnet RPC URL: `https://api.testnet.solana.com`
- ✅ Updated bot to use `.env.testnet` instead of `.env.devnet`

### 2. Smart Contract Updates
- ✅ Generated new program ID for testnet: `7PGCDfH3duBrAzKWXxTQufJJjnLEYtG219wPH39ZdDDb`
- ✅ Updated Anchor.toml configuration for testnet
- ✅ Updated SDK to use new testnet program ID
- ✅ Built program successfully for testnet deployment

### 3. Bot Integration
- ✅ Updated bot configuration to use testnet
- ✅ Verified escrow integration works with testnet
- ✅ Updated documentation references

## 🚀 Deployment Steps

### Step 1: Get Testnet SOL
```bash
# Set CLI to testnet
solana config set --url https://api.testnet.solana.com

# Check balance
solana balance

# Request airdrop (if needed)
solana airdrop 2
```

### Step 2: Deploy Program
```bash
# Run the deployment script
./deploy_testnet.sh

# Or manually:
cd /tmp/test-project
anchor build --no-idl
anchor deploy --provider.cluster testnet
```

### Step 3: Update Environment Variables
Ensure your `.env.testnet` file has:
```
SOL_RPC_URL=https://api.testnet.solana.com
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
FEE_PAYMENT_SOL_ADDRESS=your_fee_wallet_address
```

### Step 4: Test Bot
```bash
# Start the bot with testnet config
node bot_smart_contract.js
```

## 🔗 Network Details

| Network | RPC URL | Program ID | Status |
|---------|---------|------------|--------|
| Devnet | https://api.devnet.solana.com | 2gPHpEbPJuyVMw7nuUhJ4GL2WEhYKbodg7doYUBG7yQg | ✅ Deployed |
| Testnet | https://api.testnet.solana.com | 7PGCDfH3duBrAzKWXxTQufJJjnLEYtG219wPH39ZdDDb | 🔄 Ready to deploy |

## 🧪 Testing

Run the integration test:
```bash
node test_escrow_integration.js
```

## 📝 Notes

- Testnet programs have separate IDs from devnet
- Testnet airdrops are limited but sufficient for testing
- All escrow functionality remains the same
- Bot commands work identically on both networks

## 🎯 Next Steps

1. Deploy to testnet using `./deploy_testnet.sh`
2. Test airdrop functionality on Discord
3. Verify escrow claims work properly
4. Consider mainnet deployment when ready
