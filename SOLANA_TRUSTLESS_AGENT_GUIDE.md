# Solana Trustless Agent Development Guide

## x402 Hackathon Submission - Building a Solana Trustless Agent

This guide outlines the steps needed to create a Solana trustless agent that supports multi-token functionality for the x402 hackathon submission.

---

## Overview

A **Solana Trustless Agent** is a non-custodial bot service that enables:
- ✅ Secure wallet registration via signature verification
- ✅ Multi-token support (SOL, USDC, and SPL tokens)
- ✅ On-chain transaction execution
- ✅ x402 payment protocol integration
- ✅ User-controlled funds (non-custodial)

---

## Architecture Components

### 1. **Wallet Registration System** ✅ (Implemented)

**Location:** `/api/registerwallet/verify` endpoint

**Features:**
- One-click wallet registration
- Signature-based verification
- Nonce system prevents replay attacks
- 10-minute link expiration
- Support for Phantom and Solflare wallets

**Implementation Status:** ✅ Complete

### 2. **Multi-Token Support** 

**Required Steps:**

#### Step 1: Token Registry Setup
```javascript
// Add to: src/utils/tokenRegistry.js
const SUPPORTED_TOKENS = {
  SOL: {
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    name: 'Solana',
    symbol: 'SOL'
  },
  USDC: {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // mainnet
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC'
  },
  // Add more SPL tokens as needed
  BONK: {
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,
    name: 'Bonk',
    symbol: 'BONK'
  }
};
```

#### Step 2: Token Balance Checker
```javascript
// Add to: src/utils/balanceChecker.js
async function getTokenBalance(walletAddress, tokenMint) {
  const connection = new Connection(process.env.SOLANA_RPC_URL);
  
  if (tokenMint === SUPPORTED_TOKENS.SOL.mint) {
    // Get SOL balance
    const balance = await connection.getBalance(new PublicKey(walletAddress));
    return balance / LAMPORTS_PER_SOL;
  } else {
    // Get SPL token balance
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(walletAddress),
      { mint: new PublicKey(tokenMint) }
    );
    
    if (tokenAccounts.value.length === 0) return 0;
    
    const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    return balance;
  }
}
```

#### Step 3: Multi-Token Transaction Builder
```javascript
// Add to: src/utils/transactionBuilder.js
async function buildTokenTransferTx(from, to, amount, tokenMint) {
  const connection = new Connection(process.env.SOLANA_RPC_URL);
  
  if (tokenMint === SUPPORTED_TOKENS.SOL.mint) {
    // Build SOL transfer
    return SystemProgram.transfer({
      fromPubkey: new PublicKey(from),
      toPubkey: new PublicKey(to),
      lamports: amount * LAMPORTS_PER_SOL
    });
  } else {
    // Build SPL token transfer
    const fromTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(tokenMint),
      new PublicKey(from)
    );
    
    const toTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(tokenMint),
      new PublicKey(to)
    );
    
    return Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      fromTokenAccount,
      toTokenAccount,
      new PublicKey(from),
      [],
      amount
    );
  }
}
```

### 3. **x402 Payment Integration** ✅ (Partially Implemented)

**Location:** `/api/x402/` endpoints

**Current Status:**
- ✅ x402 handler initialized
- ✅ Premium endpoints with payment requirements
- ✅ Payment verification middleware
- ⚠️ Needs: More utility endpoints

**Enhancement Recommendations:**

#### Add Token-Specific Premium Features
```javascript
// api/server.js

// Premium: Multi-token swap with priority
app.post('/api/x402/premium/multi-token-swap', requireX402Payment({
  amount: "3000000", // $3 USDC
  description: "Priority Multi-Token Swap Service",
  resource: "multi-token-swap"
}), async (req, res) => {
  const { fromToken, toToken, amount } = req.body;
  // Implement Jupiter aggregator integration
  // Return swap transaction for user to sign
});

// Premium: Portfolio Analytics
app.get('/api/x402/premium/portfolio/:walletAddress', requireX402Payment({
  amount: "500000", // $0.50 USDC
  description: "Detailed Portfolio Analytics",
  resource: "portfolio-analytics"
}), async (req, res) => {
  const { walletAddress } = req.params;
  // Return detailed token holdings, value, and history
});
```

---

## Implementation Checklist

### Phase 1: Foundation ✅
- [x] Wallet registration endpoint
- [x] Signature verification
- [x] Database storage for wallet mappings
- [x] x402 payment handler initialization

### Phase 2: Multi-Token Support
- [ ] Create token registry with SPL token support
- [ ] Implement multi-token balance checker
- [ ] Build transaction builder for all token types
- [ ] Add token validation and error handling
- [ ] Test with devnet tokens

### Phase 3: Enhanced Features
- [ ] Add Jupiter aggregator integration for swaps
- [ ] Implement token price feeds (via Pyth/Jupiter)
- [ ] Add portfolio tracking
- [ ] Build multi-token airdrop system
- [ ] Add token transfer limits/validation

### Phase 4: x402 Premium Services
- [ ] Priority transaction processing
- [ ] Advanced analytics endpoints
- [ ] Multi-token swap endpoints
- [ ] Portfolio management API
- [ ] Historical data access

### Phase 5: Security & Testing
- [ ] Comprehensive input validation
- [ ] Rate limiting per user/token
- [ ] Transaction simulation before execution
- [ ] Audit logging for all transactions
- [ ] Load testing with multiple tokens

---

## Key Files to Modify/Create

### New Files Needed:
1. `src/utils/tokenRegistry.js` - Token metadata and mint addresses
2. `src/utils/balanceChecker.js` - Multi-token balance queries
3. `src/utils/transactionBuilder.js` - Build transactions for any token
4. `src/utils/jupiterIntegration.js` - Token swap via Jupiter
5. `src/commands/tokenCommands.js` - Discord commands for tokens

### Existing Files to Enhance:
1. `api/server.js` - Add x402 premium token endpoints
2. `bot.js` - Add multi-token support to commands
3. `src/commands/tipCommand.js` - Support more tokens
4. `db/database.js` - Store token transaction history

---

## Security Best Practices

### 1. **Non-Custodial Design**
- ✅ Never store private keys
- ✅ Users sign transactions in their wallet
- ✅ Bot only facilitates, never executes without user signature

### 2. **Transaction Validation**
```javascript
async function validateTransaction(tx, expectedParams) {
  // Verify recipient address matches expected
  // Verify amount matches expected
  // Verify token mint matches expected
  // Simulate transaction before submission
  const simulation = await connection.simulateTransaction(tx);
  if (simulation.value.err) {
    throw new Error('Transaction simulation failed');
  }
}
```

### 3. **Rate Limiting**
```javascript
// Per-user rate limits for each token
const TOKEN_RATE_LIMITS = {
  SOL: { max: 10, window: 60000 }, // 10 txs/minute
  USDC: { max: 20, window: 60000 },
  OTHER: { max: 5, window: 60000 }
};
```

### 4. **Amount Validation**
```javascript
function validateAmount(amount, token) {
  const minAmount = TOKEN_MINIMUMS[token] || 0.001;
  const maxAmount = TOKEN_MAXIMUMS[token] || 1000;
  
  if (amount < minAmount || amount > maxAmount) {
    throw new Error(`Amount must be between ${minAmount} and ${maxAmount} ${token}`);
  }
}
```

---

## x402 Hackathon Deliverables

### Required Submissions:

1. **Working Prototype**
   - Multi-token wallet registration ✅
   - At least 3 tokens supported (SOL, USDC, BONK)
   - x402 payment integration ✅
   - Non-custodial architecture ✅

2. **Documentation**
   - Setup guide (this document)
   - API documentation
   - User guide
   - Security audit

3. **Demo Video**
   - Show wallet registration
   - Demonstrate multi-token support
   - Show x402 payment flow
   - Highlight security features

4. **GitHub Repository**
   - Clean, documented code
   - README with quick start
   - License file
   - Contribution guidelines

---

## Testing Plan

### Unit Tests
```bash
npm test
```

### Integration Tests
1. Test wallet registration with multiple wallets
2. Test balance checks for each token
3. Test transaction building for each token type
4. Test x402 payment verification
5. Test rate limiting

### Manual Testing Checklist
- [ ] Register wallet with Phantom
- [ ] Register wallet with Solflare
- [ ] Check SOL balance
- [ ] Check USDC balance
- [ ] Check BONK balance
- [ ] Test tip with each token
- [ ] Test x402 premium endpoint
- [ ] Verify non-custodial (no keys stored)

---

## Deployment Checklist

### Environment Variables Required:
```env
# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_CLUSTER=mainnet-beta

# Discord
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id

# API
API_BASE_URL=https://your-domain.com

# x402
X402_TREASURY_WALLET=your_treasury_address

# Database
MONGODB_URI=your_mongodb_connection_string
```

### Pre-Launch Checklist:
- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Rate limiting configured
- [ ] Error monitoring enabled (Sentry)
- [ ] Logging configured
- [ ] Backup strategy in place
- [ ] Security audit completed

---

## Resources

### Documentation:
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token Program](https://spl.solana.com/token)
- [Jupiter Aggregator](https://docs.jup.ag/)
- [x402 Protocol](https://github.com/payai/x402-solana)

### Tools:
- Solana Explorer: https://explorer.solana.com/
- Phantom Wallet: https://phantom.app/
- Solflare Wallet: https://solflare.com/

---

## Support

For questions about this implementation:
- GitHub Issues: https://github.com/jmenichole/Justthetip/issues
- Discord: [Your Discord Server]
- Email: [Your Email]

---

## License

This project is licensed under the Custom MIT-based License. See LICENSE file for details.

---

**Last Updated:** November 7, 2025
**Version:** 1.0.0
**Status:** Active Development
