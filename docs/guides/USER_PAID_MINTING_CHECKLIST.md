# ✅ User-Paid Minting Implementation Checklist

## 📋 Overview
Convert your NFT verification system from operator-funded to user-paid model.

**Benefits:**
- ✅ No upfront costs (only need 0.1 SOL for testing)
- ✅ Earn ~0.01 SOL profit per verification
- ✅ Self-sustaining and scalable
- ✅ Users value what they pay for

---

## 🔧 Step 1: Update Environment Variables

Add to `.env` and Railway:

```bash
NFT_MINT_FEE_SOL=0.02
NFT_MINT_FEE_ENABLED=true
```

**Already added to:** `RAILWAY_ENV_VARS.txt` ✅

---

## 💻 Step 2: Update Backend (`api/server.js`)

### 2.1 Update CONFIG section

```javascript
const CONFIG = {
    // ... existing config ...
    NFT_MINT_FEE_SOL: parseFloat(process.env.NFT_MINT_FEE_SOL || '0.02'),
    NFT_MINT_FEE_ENABLED: process.env.NFT_MINT_FEE_ENABLED === 'true',
};
```

### 2.2 Add Payment Verification Function

**Copy from:** `USER_PAID_MINTING_CODE.js` → `verifyPayment()` function

### 2.3 Update `/api/mintBadge` Endpoint

**Copy from:** `USER_PAID_MINTING_CODE.js` → entire `/api/mintBadge` implementation

### 2.4 Add Payment Check Endpoint

**Copy from:** `USER_PAID_MINTING_CODE.js` → `/api/checkPayment/:walletAddress`

### 2.5 Update Health Endpoint

**Copy from:** `USER_PAID_MINTING_CODE.js` → updated `/api/health`

---

## 🎨 Step 3: Update Frontend (`docs/landing-app.js`)

### 3.1 Add Payment Configuration

```javascript
const CONFIG = {
    // ... existing ...
    MINT_FEE_SOL: 0.02,
    FEE_WALLET: 'H8m2gN2GEPSbk4u6PoWa8JYkEZRJWH45DyWjbAm76uCX'
};
```

### 3.2 Add Payment UI Step

```javascript
function showPaymentStep() {
    const container = document.getElementById('verification-container');
    container.innerHTML = `
        <div class="payment-step">
            <h3>💰 Payment Required</h3>
            <p>Send <strong>0.02 SOL</strong> to mint your verification NFT</p>
            
            <div class="payment-breakdown">
                <div class="fee-item">
                    <span>Minting Cost:</span>
                    <span>0.01 SOL</span>
                </div>
                <div class="fee-item">
                    <span>Service Fee:</span>
                    <span>0.01 SOL</span>
                </div>
                <div class="fee-total">
                    <span>Total:</span>
                    <span>0.02 SOL</span>
                </div>
            </div>
            
            <div class="payment-address">
                <label>Send to:</label>
                <input type="text" value="${CONFIG.FEE_WALLET}" readonly>
                <button onclick="copyAddress()">Copy</button>
            </div>
            
            <button onclick="checkPaymentAndMint()" class="btn-primary">
                I've Sent Payment - Mint NFT
            </button>
            
            <p class="help-text">
                Payment must be received within 10 minutes
            </p>
        </div>
    `;
}
```

### 3.3 Add Payment Verification

```javascript
async function checkPaymentAndMint() {
    showLoading(true, 'Verifying payment...');
    
    try {
        // Check if payment received
        const response = await fetch(
            `${CONFIG.API_BASE_URL}/api/checkPayment/${userWalletAddress}`
        );
        const data = await response.json();
        
        if (!data.verified) {
            alert('Payment not found. Please ensure you sent 0.02 SOL to the correct address.');
            showLoading(false);
            return;
        }
        
        console.log('✅ Payment verified:', data.paymentDetails.signature);
        
        // Proceed with minting
        await mintVerificationNFT();
        
    } catch (error) {
        console.error('Payment check error:', error);
        alert('Error verifying payment. Please try again.');
        showLoading(false);
    }
}
```

### 3.4 Update Verification Flow

```javascript
async function completeVerification() {
    // Step 1: Discord OAuth ✅
    await authenticateDiscord();
    
    // Step 2: Connect Wallet ✅
    await connectWallet();
    
    // Step 3: Sign Terms ✅
    await signTerms();
    
    // Step 3.5: Request Payment (NEW)
    showPaymentStep();
    
    // Step 4: Mint NFT (after payment)
    // Triggered by user clicking "I've Sent Payment"
}
```

---

## 🧪 Step 4: Testing

### 4.1 Local Testing

```bash
# Start server
node api/server.js

# Test health endpoint
curl http://localhost:3000/api/health
# Should show: "paymentRequired": true, "mintFee": "0.02 SOL"

# Test payment check (no payment)
curl http://localhost:3000/api/checkPayment/YourWalletAddress
# Should return: "verified": false

# Send 0.02 SOL from test wallet to fee wallet
# Then test again - should return: "verified": true
```

### 4.2 Full Flow Test

1. Open frontend in browser
2. Click "Get Verified"
3. Complete Discord OAuth
4. Connect Solana wallet
5. Sign terms agreement
6. **NEW:** See payment request (0.02 SOL)
7. Send payment from wallet
8. Click "I've Sent Payment"
9. Backend verifies payment
10. NFT mints to your wallet
11. Success! ✨

---

## 🚀 Step 5: Deploy to Railway

### 5.1 Copy Environment Variables

Use `RAILWAY_ENV_VARS.txt` (already updated with fee config)

### 5.2 Deploy Updated Code

```bash
# Commit changes
git add api/server.js docs/landing-app.js
git commit -m "Implement user-paid NFT minting"
git push

# Railway auto-deploys from GitHub
```

### 5.3 Test Production

```bash
# Check health
curl https://your-app.railway.app/api/health

# Complete verification flow on live site
# Send real 0.02 SOL payment
# Verify NFT mints successfully
```

---

## 💰 Step 6: Fund Mint Authority (Minimal)

Since users now pay for their own mints, you only need minimal funding:

```bash
# Send to: 9zufkJ5YBcojw4caL4zSu39c97xg4Dq7HM8GKr9j74bH

# Option 1: Minimal testing (10 mints)
Amount: 0.1 SOL

# Option 2: Production buffer (50 mints)
Amount: 0.5 SOL

# Users' payments (0.02 SOL each) go to FEE_PAYMENT_SOL_ADDRESS
# You collect revenue there, separate from minting wallet
```

---

## 📊 Revenue Tracking

### Monitor Your Earnings

```javascript
// Check fee wallet balance
const feeWallet = 'H8m2gN2GEPSbk4u6PoWa8JYkEZRJWH45DyWjbAm76uCX';
const balance = await connection.getBalance(new PublicKey(feeWallet));
console.log(`Revenue: ${balance / 1e9} SOL`);
```

### Expected Revenue

- **10 verifications**: 0.2 SOL revenue (~0.1 SOL profit)
- **100 verifications**: 2 SOL revenue (~1 SOL profit)
- **1,000 verifications**: 20 SOL revenue (~10 SOL profit)

---

## 🎯 Next Steps

### Option 1: Basic Implementation
- ✅ Add backend payment verification
- ✅ Add frontend payment step
- ✅ Deploy and test
- ✅ Start earning!

### Option 2: Enhanced Features
- 🔄 Auto-refund if mint fails
- 📧 Email receipt with payment proof
- 🎁 Loyalty rewards (10th mint free)
- 📊 Revenue dashboard

### Option 3: Freemium Model
- 🆓 Free tier: Basic verification (no NFT)
- 💎 Premium tier: NFT badge (0.02 SOL)
- ⭐ VIP tier: NFT + perks (0.05 SOL)

---

## 📚 Documentation

All implementation details are in:
- `USER_PAID_MINTING.md` - Complete guide
- `USER_PAID_MINTING_CODE.js` - Ready-to-use code
- `RAILWAY_ENV_VARS.txt` - Environment variables

---

## ✅ Completion Checklist

- [ ] Updated `.env` with fee variables
- [ ] Added `verifyPayment()` to `api/server.js`
- [ ] Updated `/api/mintBadge` endpoint
- [ ] Added `/api/checkPayment` endpoint
- [ ] Updated frontend payment flow
- [ ] Added payment UI components
- [ ] Tested locally with test payments
- [ ] Deployed to Railway
- [ ] Tested production flow
- [ ] Funded mint authority (0.1-0.5 SOL)
- [ ] Completed first paid verification! 🎉

---

**Ready to make your system profitable?** Start with Step 1! 💰🚀
