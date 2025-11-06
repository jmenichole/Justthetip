# 💰 User-Paid NFT Minting Implementation

## Overview

Your NFT verification system now uses a **user-paid model** where users cover their own minting costs plus a small profit margin for you.

## ⚙️ Quick Setup Checklist (Jamie)

1. **Confirm GitHub Actions secrets** – `MINT_AUTHORITY_KEYPAIR`, `FEE_PAYMENT_SOL_ADDRESS`, and `NFT_STORAGE_API_KEY` already live in your repo secrets. Double-check their values under *Settings → Secrets and variables → Actions* so deployments inherit them automatically.
2. **Set mint fee env vars** – Add `NFT_MINT_FEE_ENABLED=true` and your chosen `NFT_MINT_FEE_SOL` (e.g. `0.02`) to the same secrets page or your hosting dashboard.
3. **Route payments to your wallet** – Point `FEE_PAYMENT_SOL_ADDRESS` at the Solana wallet you control. Every user payment and platform fee now flows there.
4. **Optional tune-ups** – Use `NFT_PAYMENT_LOOKBACK_MINUTES`, `NFT_PAYMENT_SEARCH_LIMIT`, and `NFT_PAYMENT_REQUIRED_CONFIRMATIONS` to match your RPC provider’s limits.
5. **Smoke test** – Hit `GET https://<your-api>/api/health` and confirm `mintPayment.enabled` is `true` and the `paymentAddress` matches your wallet before letting users in.
6. **Fund the mint authority** – Drop a little SOL (≈0.05) into the mint authority wallet so it can pay rent for new NFTs.

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

### 1. Update `.env` / hosting variables

Set the following values wherever you manage environment variables (Railway, Fly.io, GitHub Actions secrets, etc.):

```bash
NFT_MINT_FEE_ENABLED=true
NFT_MINT_FEE_SOL=0.02          # adjust if you want a different price
FEE_PAYMENT_SOL_ADDRESS=<your-sol-wallet>
TIP_PLATFORM_FEE_BPS=250       # optional: 2.5% fee on every tip
TIP_PLATFORM_FEE_WALLET=<same-or-different-sol-wallet>
```

> 💡 Because your secrets already live in GitHub Actions, you can add these as new repository secrets and they’ll flow into deployments automatically.

### 2. Backend payment verification (already committed)

`api/server.js` now calls `verifyMintPayment()` before minting. It scans your `FEE_PAYMENT_SOL_ADDRESS` for recent transfers from the requesting wallet and blocks minting until the required SOL arrives. No extra code changes needed—just keep your RPC credentials healthy.

### 3. Frontend messaging (optional polish)

If you want the landing flow to spell out the price, update the modal copy in `docs/landing.html` or `docs/index.html`. The backend already enforces payment even if the UI forgets to mention it.

## 💻 Implementation Code

### Server-Side Payment Verification

```javascript
// api/server.js (excerpt)
async function verifyMintPayment(walletAddress, requiredAmountSol) {
  const feeWallet = new PublicKey(CONFIG.FEE_PAYMENT_SOL_ADDRESS);
  const minimumLamports = Math.floor(requiredAmountSol * LAMPORTS_PER_SOL);
  const signatures = await connection.getSignaturesForAddress(feeWallet, {
    limit: CONFIG.NFT_PAYMENT_SEARCH_LIMIT,
  });
  const cutoff = Date.now() - CONFIG.NFT_PAYMENT_LOOKBACK_MINUTES * 60 * 1000;

  // Look for a recent system transfer from the user wallet into your fee wallet
  for (const sigInfo of signatures) {
    if (sigInfo.blockTime * 1000 < cutoff) break;
    const tx = await connection.getParsedTransaction(sigInfo.signature, { maxSupportedTransactionVersion: 0 });
    // ...match transfer + lamport amount...
  }

  return { verified: true, signature, amountSol };
}

app.post('/api/mintBadge', async (req, res) => {
  const paymentVerification = await verifyMintPayment(walletAddress, CONFIG.NFT_MINT_FEE_SOL);
  if (!paymentVerification?.verified) {
    return res.status(402).json({
      error: 'Payment required',
      details: {
        requiredAmount: CONFIG.NFT_MINT_FEE_SOL,
        paymentAddress: CONFIG.FEE_PAYMENT_SOL_ADDRESS,
      },
    });
  }

  // continue with metadata upload + minting
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
