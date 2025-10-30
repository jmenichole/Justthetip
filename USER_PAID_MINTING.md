# 💰 User-Paid NFT Minting Implementation

## Overview

Your NFT verification system now uses a **user-paid model** where users cover their own minting costs plus a small profit margin for you.

## 💵 Fee Structure

```javascript
NFT_MINT_FEE_SOL=0.02  // User pays 0.02 SOL per verification NFT
```

**Breakdown:**
- **Actual mint cost**: ~0.01 SOL (Solana account creation + metadata)
- **Your profit**: ~0.01 SOL per verification
- **User total**: 0.02 SOL (~$3-4 USD at current prices)

## 🚀 How It Works

### User Flow:

1. **User completes Discord OAuth** ✅
2. **User connects Solana wallet** ✅
3. **System displays payment requirement**: "0.02 SOL required"
4. **User sends payment to your fee wallet** 💰
5. **Backend verifies payment on-chain** ✅
6. **Backend mints NFT to user's wallet** 🎨
7. **User receives verification badge** ✨

### Backend Flow:

```javascript
POST /api/mintBadge
  ↓
  1. Validate user data (Discord ID, wallet, signature)
  ↓
  2. Check if payment received (query Solana blockchain)
  ↓
  3. Verify payment amount (>= 0.02 SOL)
  ↓
  4. Mint NFT using mint authority wallet
  ↓
  5. Save verification to MongoDB
  ↓
  6. Return success + NFT address
```

## 📝 Required Changes

### 1. Update `.env` / Railway Variables

Add these new variables:

```bash
NFT_MINT_FEE_SOL=0.02
NFT_MINT_FEE_ENABLED=true
```

### 2. Update `api/server.js`

Add payment verification before minting (see code below)

### 3. Update `docs/landing-app.js`

Add payment step in verification flow:

```javascript
// Step 3.5: Request payment
async function requestMintPayment() {
    const fee = 0.02; // SOL
    const message = `Send ${fee} SOL to mint your verification NFT`;
    
    // Show payment UI
    showPaymentRequest({
        amount: fee,
        recipient: 'H8m2gN2GEPSbk4u6PoWa8JYkEZRJWH45DyWjbAm76uCX',
        message: message
    });
    
    // Wait for payment confirmation
    await waitForPayment(userWallet, fee);
    
    // Proceed to mint
    await mintVerificationNFT();
}
```

## 💻 Implementation Code

### Server-Side Payment Verification

```javascript
// Add to api/server.js BEFORE the mint call

async function verifyPayment(walletAddress, requiredAmount) {
    try {
        const connection = new Connection(CONFIG.SOLANA_RPC_URL);
        const feeWallet = new PublicKey(process.env.FEE_PAYMENT_SOL_ADDRESS);
        const userWallet = new PublicKey(walletAddress);
        
        // Get recent transactions to fee wallet
        const signatures = await connection.getSignaturesForAddress(
            feeWallet,
            { limit: 100 }
        );
        
        // Check if payment from user exists (last 10 minutes)
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        
        for (const sig of signatures) {
            if (sig.blockTime * 1000 < tenMinutesAgo) break;
            
            const tx = await connection.getParsedTransaction(sig.signature);
            const instructions = tx.transaction.message.instructions;
            
            for (const ix of instructions) {
                if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
                    const info = ix.parsed.info;
                    if (
                        info.source === walletAddress &&
                        info.destination === feeWallet.toString() &&
                        info.lamports >= requiredAmount * 1e9
                    ) {
                        return {
                            verified: true,
                            signature: sig.signature,
                            amount: info.lamports / 1e9
                        };
                    }
                }
            }
        }
        
        return { verified: false };
    } catch (error) {
        console.error('Payment verification error:', error);
        return { verified: false, error: error.message };
    }
}

// Update the /api/mintBadge endpoint:
app.post('/api/mintBadge', async (req, res) => {
    try {
        // ... existing validation code ...
        
        // NEW: Check payment if fee enabled
        if (process.env.NFT_MINT_FEE_ENABLED === 'true') {
            const requiredFee = parseFloat(process.env.NFT_MINT_FEE_SOL || 0.02);
            
            const payment = await verifyPayment(walletAddress, requiredFee);
            
            if (!payment.verified) {
                return res.status(402).json({
                    error: 'Payment required',
                    message: `Send ${requiredFee} SOL to ${process.env.FEE_PAYMENT_SOL_ADDRESS} to mint your NFT`,
                    requiredAmount: requiredFee,
                    paymentAddress: process.env.FEE_PAYMENT_SOL_ADDRESS
                });
            }
            
            console.log('✅ Payment verified:', payment.signature);
        }
        
        // Proceed with minting...
        const { nft } = await metaplex.nfts().create({ ... });
        
        // ... rest of existing code ...
    } catch (error) {
        // ... error handling ...
    }
});
```

## 💡 Benefits

### For You:
✅ **Zero upfront cost** - No need to fund mint authority wallet
✅ **Profit per verification** - Earn ~0.01 SOL per user
✅ **Scalable** - Works for unlimited users
✅ **Self-sustaining** - System pays for itself

### For Users:
✅ **Transparent pricing** - Clear upfront cost
✅ **Immediate value** - Get NFT badge right away
✅ **Proof of investment** - Users value what they pay for
✅ **Optional** - Can still use free tier without NFT

## 🎯 Alternative Models

### Freemium (Recommended)

```javascript
// Two tiers
FREE_TIER = {
    verification: true,
    nftBadge: false,
    tipping: true
}

PREMIUM_TIER = {
    verification: true,
    nftBadge: true,      // Costs 0.02 SOL
    tipping: true,
    specialRole: true,
    prioritySupport: true
}
```

### Subscription Model

```javascript
MONTHLY_PASS = {
    cost: 0.1 SOL/month,
    benefits: [
        'Verified badge NFT',
        'No tipping fees',
        'Priority support',
        'Early access features'
    ]
}
```

## 📊 Revenue Projections

**Scenario: 100 verifications/month**
- Revenue: 100 × 0.02 SOL = 2 SOL/month (~$300-400)
- Costs: 100 × 0.01 SOL = 1 SOL (actual minting)
- Profit: 1 SOL/month (~$150-200)

**Scenario: 1,000 verifications/month**
- Revenue: 1,000 × 0.02 SOL = 20 SOL/month (~$3,000-4,000)
- Costs: 1,000 × 0.01 SOL = 10 SOL
- Profit: 10 SOL/month (~$1,500-2,000)

## 🚀 Deployment Steps

1. **Update Railway environment variables**:
   ```bash
   NFT_MINT_FEE_SOL=0.02
   NFT_MINT_FEE_ENABLED=true
   ```

2. **Deploy updated `api/server.js`**:
   - Add payment verification function
   - Update `/api/mintBadge` endpoint

3. **Update frontend `docs/landing-app.js`**:
   - Add payment request UI
   - Add payment confirmation wait
   - Update flow: OAuth → Wallet → Payment → Mint

4. **Test flow**:
   - Complete verification
   - Send 0.02 SOL payment
   - Verify NFT mints
   - Check fee wallet receives payment

5. **Go live!** 🎉

## ⚠️ Important Notes

- **Payment window**: 10 minutes after user starts flow
- **Refund policy**: Consider auto-refund if mint fails
- **Transparency**: Show breakdown (0.01 SOL mint cost + 0.01 SOL service fee)
- **Support**: Users will ask about payment - have docs ready

## 🛠️ Testing

```bash
# Test payment verification
curl -X POST http://localhost:3000/api/mintBadge \
  -H "Content-Type: application/json" \
  -d '{
    "discordId": "123456",
    "discordUsername": "testuser",
    "walletAddress": "YourWalletAddress",
    "signature": "...",
    "termsVersion": "1.0",
    "timestamp": "2025-01-01T00:00:00Z"
  }'

# Should return 402 Payment Required if no payment
# Should return 200 OK after payment sent
```

## 📚 Related Files

- `api/server.js` - Backend payment verification
- `docs/landing-app.js` - Frontend payment flow
- `RAILWAY_ENV_VARS.txt` - Environment configuration
- `.env` - Local development config

---

**Questions?** This model makes your system self-sustaining and profitable from day one! 🚀
