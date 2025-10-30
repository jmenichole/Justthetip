# ⚡ Quick Reference Card

## 🚀 What's New

### ✅ Enhanced Airdrop with Time Duration
- **File:** `src/commands/airdropCommand.js`
- **Duration Options:** 1h, 6h, 12h, 24h, 7d, 30d
- **Features:** Auto-expiration, claim tracking, dynamic updates

### 🔒 Three-Tier Security System
1. **User Wallet Connection** - Non-custodial, users keep private keys
2. **Withdrawal Approval** - Admin approval for large withdrawals
3. **Multi-Sig Wallets** - Distributed signing authority

---

## 📦 Files Created

```
src/
├── security/
│   ├── walletConnection.js      # User wallet connections
│   ├── withdrawalQueue.js       # Withdrawal approval system
│   └── multiSig.js              # Multi-signature wallets
├── commands/
│   ├── secureCommands.js        # All security Discord commands
│   └── airdropCommand.js        # Enhanced airdrop with duration
└── utils/
    └── ...

docs/
├── SECURITY_ARCHITECTURE.md     # Complete security documentation
└── INTEGRATION_GUIDE.md         # Step-by-step integration

RAILWAY_READY_TO_PASTE.txt       # Updated (SOL_PRIVATE_KEY commented out)
package.json                      # Updated (@sqds/sdk, tweetnacl added)
```

---

## 🎯 Commands Added

### Airdrop (Enhanced)
```
/airdrop 
  currency: SOL | USDC
  amount: 1.0
  recipients: 5
  duration: 1h | 6h | 12h | 24h | 7d | 30d
  message: Optional custom message
```

### Wallet Connection
```
/connectwallet              # Start connection
/verifywallet              # Complete with signature
  session: sess_xxx
  wallet: address
  signature: base58
/disconnectwallet          # Remove connection
```

### Withdrawal Approval
```
/withdraw                  # Request withdrawal
  address: destination
  amount: 1.0
  currency: SOL | USDC

# Admin only:
/pending                   # View queue
/approve id:WD123...       # Approve
/reject id:WD123... reason:text  # Reject
```

### Multi-Sig
```
# Admin only:
/multisig-create
  signers: addr1,addr2,addr3
  threshold: 2

# Signers:
/multisig-propose
  multisig: address
  recipient: address
  amount: 10
  currency: SOL

/multisig-approve
  proposal: PROP123...
  signer: your_address
```

---

## 🔧 Configuration

### Auto-Approval Threshold
Edit `src/security/withdrawalQueue.js`:
```javascript
this.AUTO_APPROVE_THRESHOLD = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL
```

### Pending Timeout
```javascript
this.PENDING_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
```

### Multi-Sig Threshold
```javascript
this.MULTISIG_THRESHOLD = 1 * 1e9; // 1 SOL
this.REQUIRED_APPROVALS = 2; // 2-of-N
```

### Airdrop Durations
Edit `src/commands/airdropCommand.js`:
```javascript
const durationMap = {
  '1h': 1 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  // Add more as needed
};
```

---

## 🚀 Deployment Checklist

### Local Testing
- [ ] `npm install` (dependencies installed)
- [ ] Test `/airdrop` with different durations
- [ ] Test `/connectwallet` flow
- [ ] Test `/withdraw` approval system
- [ ] Check MongoDB connection
- [ ] Verify all commands registered

### Railway Deployment
- [ ] Push code to GitHub
- [ ] Railway auto-deploys
- [ ] Check logs for errors
- [ ] Update `SOL_PRIVATE_KEY` to `[]` (optional)
- [ ] Test commands in Discord
- [ ] Verify audit logging

### Security Setup
- [ ] Confirm admin user IDs
- [ ] Test withdrawal approval flow
- [ ] Create multi-sig if needed
- [ ] Monitor audit logs
- [ ] Document procedures

---

## 🔥 Quick Start (Copy-Paste)

### 1. Test Airdrop
```
/airdrop currency:SOL amount:1.0 recipients:5 duration:1h message:Test giveaway!
```

### 2. Connect Wallet
```
/connectwallet
# → Sign message in Phantom
/verifywallet session:sess_xxx wallet:9zuf... signature:5Js...
```

### 3. Request Withdrawal
```
/withdraw address:9zuf... amount:0.05 currency:SOL
# → Auto-approved (< 0.1 SOL)
```

### 4. Admin Approval
```
/withdraw address:9zuf... amount:1.0 currency:SOL
# → Requires approval

/pending
/approve id:WD1234...
```

---

## 🛡️ Security Modes

### Mode 1: Current (With Private Key)
- **Status:** `SOL_PRIVATE_KEY` = full array
- **Security:** Private key on Railway (risky)
- **Use Case:** Testing with 0.25 SOL

### Mode 2: Hybrid (Recommended)
- **Status:** `SOL_PRIVATE_KEY` = full array
- **Security:** Auto-approve < 0.1 SOL, manual approve >= 0.1 SOL
- **Use Case:** Production with admin oversight

### Mode 3: Fully Non-Custodial (Best)
- **Status:** `SOL_PRIVATE_KEY` = `[]`
- **Security:** No private keys stored, users connect wallets
- **Use Case:** Maximum security, zero custody

---

## 📊 MongoDB Collections

Auto-created on first use:

```javascript
// Wallet Connections
connectedWallets: {
  userId, walletAddress, connectedAt, lastUsed, verified
}

// Withdrawal Queue
withdrawalQueue: {
  id, userId, toAddress, amount, status, approvedBy, txSignature
}

// Multi-Sig Wallets
multiSigWallets: {
  address, signers[], threshold, createdAt, active
}

// Multi-Sig Proposals
multiSigProposals: {
  id, multisigAddress, transactionData, status, approvals[], requiredApprovals
}

// Audit Logs
auditLog: {
  action, userId, adminId, timestamp, details
}

// Airdrops (existing, enhanced)
airdrops: {
  airdropId, creator, currency, totalAmount, amountPerUser,
  maxRecipients, claimedUsers[], expiresAt, duration, active
}
```

---

## 🐛 Troubleshooting

### Issue: "Module not found: @sqds/sdk"
```bash
cd /Users/fullsail/justthetip
npm install @sqds/sdk tweetnacl
```

### Issue: "Database not connected"
Check `MONGODB_URI` in Railway variables matches:
```
mongodb+srv://justthetip1:JWjwE7xgOmmc6k3O@justhetip.0z3jtr.mongodb.net/?retryWrites=true&w=majority
```

### Issue: Commands not showing
```bash
node clear-commands.js
# Restart Railway bot
```

### Issue: "Permission denied" on admin commands
Add your Discord ID to Railway variables:
```
ADMIN_USER_IDS=1153034319271559328
```

---

## 📈 Next Steps

1. **Test Locally** 
   ```bash
   node bot.js
   ```

2. **Deploy to Railway**
   ```bash
   git add .
   git commit -m "feat: enhanced security and airdrops"
   git push origin main
   ```

3. **Test in Discord**
   - Try all new commands
   - Monitor logs
   - Check audit trail

4. **Remove Private Key** (Optional)
   - Railway → Variables → `SOL_PRIVATE_KEY` = `[]`
   - Now fully non-custodial!

---

## 📚 Documentation

- **Security Architecture:** `docs/SECURITY_ARCHITECTURE.md`
- **Integration Guide:** `docs/INTEGRATION_GUIDE.md`
- **This Reference:** `docs/QUICK_REFERENCE.md`

---

## 🎉 Success Indicators

✅ Bot comes online in Railway
✅ MongoDB connects successfully
✅ All slash commands registered
✅ Airdrop with duration works
✅ Wallet connection flow works
✅ Withdrawal approval flow works
✅ Audit logs populating
✅ No errors in Railway logs

**You're production-ready! 🚀**
