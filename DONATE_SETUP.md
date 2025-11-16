# 💝 Donate Command Setup

## Overview
The `/donate` command shows users your Solana wallet address with a beautiful embed, QR code link, and copy functionality.

## Setting Your Wallet Address

### Option 1: Environment Variable (Recommended)
Add to your `.env` file:
```bash
DEVELOPER_WALLET=YourSolanaWalletAddressHere
```

### Option 2: Direct Edit
Edit `src/commands/handlers/donateHandler.js` line 12:
```javascript
const DEVELOPER_WALLET = 'YourSolanaWalletAddressHere';
```

## Command Features

### User Experience
When users type `/donate`, they see:
- ✅ Clear message that bot is 100% free
- ✅ Your Solana wallet address in a copyable code block
- ✅ Three buttons:
  - 📋 Copy Wallet Address (ephemeral popup with address)
  - 🔗 View on Solscan (opens your wallet on explorer)
  - 💜 Support Page (links to GitHub repository)

### What Users See
```
☕ Support JustTheTip Development

JustTheTip is 100% free with zero transaction fees.
Every tip goes directly from sender to recipient. We never take a cut.

💰 Developer Wallet
YourSolanaWalletAddressHere

🎯 Why Donate?
• Keeps the bot running 24/7
• Supports new feature development
• Covers hosting and infrastructure costs
• Shows appreciation for free, non-custodial service

✨ What Makes JustTheTip Special
• 100% Free - No transaction fees ever
• Non-Custodial - You control your funds
• x402 Trustless Agent - Cryptographic proof of ownership
• Direct P2P - Transfers happen on-chain

[📋 Copy Wallet Address] [🔗 View on Solscan] [💜 Support Page]
```

## Testing
1. Set your wallet address (see above)
2. Restart the bot
3. Type `/donate` in Discord
4. Verify your wallet address appears
5. Test the "Copy Wallet Address" button

## Integration Points

The donate command is also promoted in:
- `/tip` command embed (☕ Tip the Dev button)
- Tip confirmation messages (footer mentions 100% free)

## Analytics
Logs when users view the donate command:
```
💝 Donate command used by username#1234
```

## Security Notes
- ✅ Wallet address is public information (safe to share)
- ✅ Shows view-only links (Solscan)
- ✅ No private keys or signatures involved
- ✅ Completely optional for users

