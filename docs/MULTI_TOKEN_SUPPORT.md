# Multi-Token Support - Technical Overview

## One Signature, All Tokens

### How It Works

When you register your wallet with JustTheTip using `/register-wallet`, you sign a **single verification message** that proves ownership of your Solana wallet address. This one signature enables tipping with **all supported tokens** because:

1. **Solana Address = All Tokens**
   - Your Solana wallet address (e.g., `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`) holds ALL tokens
   - SOL, USDC, BONK, USDT, and all other SPL tokens use the **same address**
   - You don't have separate addresses for each token

2. **Signature Proves Wallet Ownership**
   - The signature verifies you control the private key for that address
   - It doesn't grant token-specific permissions
   - Once verified, the bot knows you own that entire wallet

3. **Non-Custodial Architecture**
   - The bot NEVER holds your funds or private keys
   - Tips are sent directly from your wallet to recipients
   - You maintain full control of all your tokens

### Example Flow

```
User Registration:
1. User runs /register-wallet
2. User signs ONE message: "I own wallet ABC123..."
3. Bot records: "Discord User XYZ owns wallet ABC123"
4. ✅ Registration complete!

Tipping Any Token:
1. User runs /tip @friend 10 USDC
2. Bot checks: "Does Discord User XYZ own a registered wallet?" ✅ Yes (ABC123)
3. Bot sends USDC from ABC123 to friend's wallet
4. No new signature needed! Already verified.

Later, same user:
1. User runs /tip @friend 0.5 SOL
2. Bot checks: "Does Discord User XYZ own a registered wallet?" ✅ Yes (ABC123) 
3. Bot sends SOL from ABC123 to friend's wallet
4. Still no new signature needed!
```

## Supported Tokens

### Currently Implemented (v1.0)
- ✅ **SOL** - Fully functional tipping via x402 micropayments
  - Instant transfers
  - Sub-cent fees
  - No repeated signatures

### Coming Soon (Hackathon Enhancement)
- 🔄 **USDC** - USD Coin (6 decimals)
- 🔄 **BONK** - Bonk (5 decimals)  
- 🔄 **USDT** - Tether USD (6 decimals)

All tokens will use the **same wallet registration** - no additional signatures required!

## Technical Details

### Token Registry
Located in: `src/utils/tokenRegistry.js`

Defines all supported tokens with:
- Mint address (token contract)
- Decimals (for amount formatting)
- Display name and symbol
- Metadata for integrations

### Balance Checking
Located in: `src/utils/balanceChecker.js`

Functions:
- `getTokenBalance(walletAddress, tokenSymbol)` - Get balance for one token
- `getAllTokenBalances(walletAddress)` - Get all token balances at once
- Handles both native SOL and SPL tokens

### Tip Command Enhancement
Located in: `src/commands/tipCommand.js`

Updated to:
- Accept `currency` parameter (SOL, USDC, BONK, USDT)
- Validate token support
- Show helpful message for tokens not yet implemented
- Maintain backward compatibility (defaults to SOL)

## Why This Matters for x402 Hackathon

### Trustless Agent Benefits

1. **Reduced Friction**
   - Users sign ONCE
   - Tip with unlimited tokens
   - No repeated authentication

2. **True Non-Custodial**
   - Bot never holds funds
   - Users maintain key control
   - All transactions verifiable on-chain

3. **Scalable Architecture**
   - Easy to add new tokens
   - Just update registry
   - No changes to registration flow

4. **Enhanced UX**
   - Works on mobile & desktop
   - WalletConnect support
   - Same experience for all tokens

## Comparison: Traditional vs Trustless

### Traditional Discord Bots
```
❌ Custodial - Bot holds your tokens
❌ Sign for every tip
❌ Different process per token
❌ Need to trust bot operator
❌ Limited to bot's supported tokens
```

### JustTheTip Trustless Agent
```
✅ Non-custodial - You control your tokens
✅ Sign once, tip unlimited times
✅ Same process for all tokens
✅ Cryptographically verifiable
✅ Easy to add new tokens
```

## Future Enhancements

### Phase 1 (Current Hackathon)
- [x] Wallet registration system
- [x] SOL tipping implementation
- [x] Mobile wallet support (WalletConnect)
- [ ] USDC tipping
- [ ] BONK tipping
- [ ] USDT tipping

### Phase 2 (Post-Hackathon)
- [ ] Token swaps (Jupiter integration)
- [ ] Portfolio view (all token balances)
- [ ] Price feeds (Pyth/Jupiter)
- [ ] Advanced analytics (x402 premium)
- [ ] Custom token support

## Security Considerations

### Signature Replay Protection
- Each registration link includes a unique nonce
- Nonces expire after 10 minutes
- Nonces can only be used once
- Prevents signature replay attacks

### Token Account Safety
- SPL tokens stored in Associated Token Accounts (ATAs)
- ATAs are derived deterministically from wallet address
- Bot cannot create fake token accounts
- All transfers verifiable on Solana Explorer

### Amount Validation
- Minimum and maximum amounts per token
- Balance checking before transfer
- Transaction simulation before execution
- Rate limiting per user and token

## For Developers

### Adding a New Token

1. **Update Token Registry** (`src/utils/tokenRegistry.js`):
```javascript
NEWTOKEN: {
  mint: 'MintAddressHere...',
  decimals: 9,
  name: 'New Token',
  symbol: 'NEWTOKEN',
  isNative: false,
  coingeckoId: 'new-token'
}
```

2. **Add to Tip Command Choices** (`bot.js`):
```javascript
{ name: 'NEWTOKEN - New Token', value: 'NEWTOKEN' }
```

3. **Test**:
```bash
npm test
/tip @user 10 NEWTOKEN  # In Discord
```

That's it! The registration system automatically supports it.

## FAQ

**Q: Do I need to register separately for each token?**  
A: No! One registration works for all tokens because they all use the same Solana address.

**Q: What if I want to add USDC support after registering with SOL?**  
A: No action needed! Your registration already covers USDC. Just wait for the feature to launch.

**Q: Can I use different wallets for different tokens?**  
A: Not with the same Discord account. One Discord account = One wallet = All tokens in that wallet.

**Q: What if I want to switch wallets?**  
A: Use `/disconnectwallet` then register a new wallet with `/register-wallet`. The new wallet will work with all tokens.

**Q: Is my signature stored forever?**  
A: No! Signatures are only used for verification and then discarded. Only your wallet address is stored.

**Q: Can the bot access my tokens without permission?**  
A: No! The bot is non-custodial. It cannot access your funds. All tips require you to have registered your wallet, but the actual transfers happen through your wallet provider.

---

**Last Updated:** November 11, 2025  
**Version:** 1.0.0  
**Hackathon:** Solana x402 2025
