# 🔒 Security Architecture Guide

## Overview

This guide explains the three-tier security system implemented to protect user funds:

1. **User Wallet Connection** - Non-custodial wallet integration
2. **Withdrawal Approval System** - Admin-controlled withdrawal queue
3. **Multi-Signature Wallets** - Distributed signing authority

---

## 🔑 User Wallet Connection (Non-Custodial)

### What It Is
Users connect their existing Solana wallets (Phantom, Solflare, etc.) to the bot. The bot **never** stores private keys - users sign transactions in their own wallets.

### How It Works

#### 1. Connection Process
```
User runs /connectwallet
  ↓
Bot generates challenge message
  ↓
User signs message in their wallet
  ↓
User submits signature with /verifywallet
  ↓
Bot verifies signature cryptographically
  ↓
✅ Wallet connected (stored: userId → walletAddress)
```

#### 2. Transaction Flow
```
User wants to tip/withdraw
  ↓
Bot creates unsigned transaction
  ↓
Bot sends transaction data to user
  ↓
User signs in their wallet
  ↓
User submits signed transaction to bot
  ↓
✅ Bot broadcasts to Solana network
```

### Commands

**`/connectwallet`**
- Generates a challenge message for signing
- Returns session ID and message to sign
- Expires in 5 minutes

**`/verifywallet <session> <wallet> <signature>`**
- Verifies signature using nacl.sign.detached.verify
- Links Discord user ID to wallet address
- Stores connection in MongoDB

**`/disconnectwallet`**
- Removes wallet connection
- User must reconnect to use bot

### Database Schema
```javascript
{
  userId: "Discord user ID",
  walletAddress: "Solana public key",
  connectedAt: Date,
  lastUsed: Date,
  verified: true
}
```

### Security Benefits
✅ Bot never has access to private keys
✅ Users maintain full custody of funds
✅ Every transaction requires explicit user approval
✅ Transparent on-chain verification

---

## ⏳ Withdrawal Approval System

### What It Is
A queue-based system where withdrawals above a threshold require admin approval before processing.

### Configuration
```javascript
AUTO_APPROVE_THRESHOLD = 0.1 SOL  // Withdrawals under this: instant
PENDING_TIMEOUT = 24 hours         // Requests expire after this
```

### How It Works

#### Small Withdrawals (< 0.1 SOL)
```
User: /withdraw 0.05 SOL
  ↓
✅ Auto-approved instantly
  ↓
Transaction processed immediately
```

#### Large Withdrawals (≥ 0.1 SOL)
```
User: /withdraw 1.0 SOL
  ↓
⏳ Enters approval queue
  ↓
Admin reviews with /pending
  ↓
Admin: /approve <id>  OR  /reject <id> <reason>
  ↓
✅ Transaction processed  OR  ❌ Request rejected
```

### Commands

**`/withdraw <address> <amount> <currency>`** (User)
- Requests a withdrawal
- Auto-approves if under threshold
- Otherwise enters pending queue

**`/pending`** (Admin Only)
- Lists all pending withdrawal requests
- Shows user, amount, address, timestamp

**`/approve <withdrawal_id>`** (Admin Only)
- Approves and processes withdrawal
- Logs admin action in audit trail
- Notifies user

**`/reject <withdrawal_id> <reason>`** (Admin Only)
- Rejects withdrawal request
- Logs rejection reason
- Notifies user with reason

### Database Schema

**withdrawalQueue Collection**
```javascript
{
  id: "WD1640123456ABC",
  userId: "Discord user ID",
  username: "Discord username",
  toAddress: "Destination wallet",
  amount: 1000000000,  // lamports
  currency: "SOL",
  status: "PENDING | AUTO_APPROVED | COMPLETED | REJECTED | EXPIRED | FAILED",
  requestedAt: Date,
  expiresAt: Date,
  approvedBy: "Admin user ID",
  approvedAt: Date,
  rejectedBy: "Admin user ID",
  rejectedAt: Date,
  rejectionReason: "String",
  txSignature: "Solana tx hash"
}
```

**auditLog Collection**
```javascript
{
  action: "WITHDRAWAL_REQUESTED | WITHDRAWAL_APPROVED | WITHDRAWAL_REJECTED",
  userId: "User ID",
  adminId: "Admin ID (if applicable)",
  withdrawalId: "WD1640123456ABC",
  amount: 1000000000,
  currency: "SOL",
  timestamp: Date,
  txSignature: "Solana tx hash (if completed)"
}
```

### Security Benefits
✅ Prevents unauthorized large withdrawals
✅ Admin oversight for high-value transactions
✅ Complete audit trail of all actions
✅ Time-limited requests prevent stale approvals
✅ Automatic cleanup of expired requests

---

## 🔐 Multi-Signature Wallets

### What It Is
Uses [Squads Protocol](https://squads.so/) to create wallets requiring M-of-N signatures for transactions.

Example: 2-of-3 wallet needs 2 out of 3 authorized signers to approve any transaction.

### How It Works

#### 1. Create Multi-Sig Wallet
```
Admin: /multisig-create
  signers: Alice, Bob, Charlie
  threshold: 2
  ↓
✅ 2-of-3 wallet created on Squads
```

#### 2. Create Transaction Proposal
```
Alice: /multisig-propose
  multisig: <wallet_address>
  recipient: <destination>
  amount: 10 SOL
  ↓
📝 Proposal created (1/2 approvals)
```

#### 3. Approve Proposal
```
Bob: /multisig-approve <proposal_id>
  ↓
✅ 2/2 approvals met
  ↓
🚀 Transaction automatically executed on-chain
```

#### 4. Or Reject Proposal
```
Charlie: /multisig-reject <proposal_id> <reason>
  ↓
❌ Proposal rejected
```

### Commands

**`/multisig-create <signers> <threshold>`** (Admin Only)
- Creates new multi-sig wallet via Squads
- `signers`: Comma-separated wallet addresses
- `threshold`: Required number of approvals
- Returns multi-sig wallet address

**`/multisig-propose <multisig> <recipient> <amount> <currency>`** (Signer Only)
- Creates transaction proposal
- Proposer automatically approves (counts as 1)
- Expires after 7 days

**`/multisig-approve <proposal_id> <signer_wallet>`** (Signer Only)
- Adds approval to proposal
- Auto-executes when threshold met
- Verifies signer is authorized

**`/multisig-reject <proposal_id> <reason>`** (Signer Only)
- Rejects proposal with reason
- Proposal cannot be executed after rejection

### Database Schema

**multiSigWallets Collection**
```javascript
{
  address: "Multi-sig wallet address",
  signers: ["Alice wallet", "Bob wallet", "Charlie wallet"],
  threshold: 2,
  createdAt: Date,
  active: true
}
```

**multiSigProposals Collection**
```javascript
{
  id: "PROP1640123456XYZ",
  multisigAddress: "Multi-sig wallet",
  proposerId: "Discord user ID",
  transactionData: {
    recipient: "Destination wallet",
    amount: 10000000000,  // lamports
    currency: "SOL"
  },
  status: "PENDING | APPROVED | EXECUTED | REJECTED | EXPIRED | FAILED",
  approvals: ["userId1", "userId2"],
  rejections: [],
  requiredApprovals: 2,
  createdAt: Date,
  expiresAt: Date,
  executedAt: Date,
  txSignature: "Solana tx hash"
}
```

### Security Benefits
✅ No single point of failure
✅ Requires consensus for large transactions
✅ Transparent approval process
✅ On-chain verification via Squads
✅ Time-limited proposals
✅ Rejection veto power

---

## 🚀 Integration Guide

### Step 1: Install Dependencies
```bash
npm install @sqds/sdk tweetnacl bs58
```

### Step 2: Initialize Managers
```javascript
const WalletConnectionManager = require('./src/security/walletConnection');
const WithdrawalQueue = require('./src/security/withdrawalQueue');
const MultiSigManager = require('./src/security/multiSig');
const SecureCommands = require('./src/commands/secureCommands');

// Initialize
const walletManager = new WalletConnectionManager(database);
const withdrawalQueue = new WithdrawalQueue(database, connection);
const multiSigManager = new MultiSigManager(database, connection);
const commands = new SecureCommands(walletManager, withdrawalQueue, multiSigManager, database);
```

### Step 3: Register Commands
```javascript
// Register all secure commands
const commandBuilders = commands.getCommands();
client.commands.push(...commandBuilders);

// Register commands with Discord
await client.application.commands.set(commandBuilders);
```

### Step 4: Handle Interactions
```javascript
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  switch (interaction.commandName) {
    case 'connectwallet':
      await commands.connectWallet(interaction);
      break;
    case 'verifywallet':
      await commands.verifyWallet(
        interaction,
        interaction.options.getString('session'),
        interaction.options.getString('wallet'),
        interaction.options.getString('signature')
      );
      break;
    case 'withdraw':
      await commands.requestWithdrawal(
        interaction,
        interaction.options.getString('address'),
        interaction.options.getNumber('amount'),
        interaction.options.getString('currency')
      );
      break;
    case 'approve':
      await commands.approveWithdrawal(
        interaction,
        interaction.options.getString('id')
      );
      break;
    // ... other commands
  }
});
```

### Step 5: Set Up Cleanup Tasks
```javascript
// Clean up expired sessions/requests every hour
setInterval(async () => {
  walletManager.cleanupExpired();
  await withdrawalQueue.cleanupExpired();
  await multiSigManager.cleanupExpired();
}, 60 * 60 * 1000);
```

### Step 6: Configure Admin Access
```env
ADMIN_USER_IDS=1153034319271559328,987654321098765432
SUPER_ADMIN_USER_IDS=1153034319271559328
```

---

## 📊 Monitoring & Auditing

### Audit Log Events
All security-sensitive actions are logged:

- `WALLET_CONNECTED` - User connects wallet
- `WALLET_DISCONNECTED` - User disconnects wallet
- `WITHDRAWAL_REQUESTED` - Withdrawal request created
- `WITHDRAWAL_APPROVED` - Admin approves withdrawal
- `WITHDRAWAL_REJECTED` - Admin rejects withdrawal
- `MULTISIG_CREATED` - New multi-sig wallet created
- `MULTISIG_PROPOSAL_CREATED` - Transaction proposal created
- `MULTISIG_PROPOSAL_APPROVED` - Proposal approved
- `MULTISIG_PROPOSAL_REJECTED` - Proposal rejected

### Query Audit Logs
```javascript
// Get all actions by user
await db.collection('auditLog').find({ userId: "123" }).toArray();

// Get all withdrawal approvals
await db.collection('auditLog').find({ action: "WITHDRAWAL_APPROVED" }).toArray();

// Get actions in date range
await db.collection('auditLog').find({
  timestamp: {
    $gte: new Date('2025-01-01'),
    $lte: new Date('2025-01-31')
  }
}).toArray();
```

---

## ⚠️ Security Considerations

### What This Solves
✅ Private key custody (users keep their own keys)
✅ Unauthorized withdrawals (admin approval required)
✅ Single point of failure (multi-sig distribution)
✅ Lack of accountability (complete audit trail)

### What This Doesn't Solve
❌ User device security (if user's wallet is compromised)
❌ Admin account compromise (secure admin Discord accounts with 2FA)
❌ Smart contract bugs (audit Squads Protocol separately)
❌ Network attacks (use trusted RPC endpoints)

### Best Practices

1. **Admin Access Control**
   - Use 2FA on all admin Discord accounts
   - Limit number of admins
   - Regularly rotate admin list

2. **Threshold Configuration**
   - Start with low auto-approval threshold (0.1 SOL)
   - Increase based on usage patterns
   - Monitor for unusual activity

3. **Multi-Sig Setup**
   - Use 2-of-3 or 3-of-5 for production
   - Store signer keys in different locations
   - Test proposal flow before going live

4. **Monitoring**
   - Set up alerts for large withdrawal requests
   - Review audit logs weekly
   - Monitor proposal approval patterns

5. **User Education**
   - Explain non-custodial model clearly
   - Warn users about wallet security
   - Provide clear instructions for signing

---

## 🔧 Troubleshooting

### "Invalid signature" error
- Check that user signed exact challenge message
- Verify wallet address matches
- Ensure signature is base58 encoded
- Check session hasn't expired (5 minutes)

### "Withdrawal request not found"
- Verify withdrawal ID is correct
- Check if request expired (24 hours)
- Ensure request wasn't already processed

### "Cannot approve proposal"
- Verify user is authorized signer
- Check proposal hasn't expired (7 days)
- Ensure proposal is still PENDING status
- Verify signer wallet matches multi-sig signers

### "Multi-sig creation failed"
- Ensure Squads SDK is initialized
- Check signer addresses are valid
- Verify threshold ≤ number of signers
- Confirm sufficient SOL for rent

---

## 📚 Additional Resources

- [Squads Protocol Documentation](https://docs.squads.so/)
- [Solana Web3.js Guide](https://solana-labs.github.io/solana-web3.js/)
- [TweetNaCl Crypto Library](https://github.com/dchest/tweetnacl-js)
- [MongoDB Best Practices](https://www.mongodb.com/docs/manual/administration/security-checklist/)

---

## 🎯 Migration Path

### From Current Setup (Private Key on Railway)

**Phase 1: Add User Wallet Connection** (Week 1)
1. Deploy wallet connection modules
2. Add `/connectwallet` commands
3. Keep existing system running
4. Let users voluntarily connect wallets

**Phase 2: Enable Withdrawal Approvals** (Week 2)
1. Deploy withdrawal queue
2. Set auto-approve threshold high (1 SOL)
3. Test approval flow with test transactions
4. Gradually lower threshold

**Phase 3: Implement Multi-Sig** (Week 3)
1. Create 2-of-3 multi-sig wallet
2. Transfer funds from hot wallet to multi-sig
3. Test proposal flow
4. Route large transactions through multi-sig

**Phase 4: Remove Private Key** (Week 4)
1. Verify all systems working
2. Remove SOL_PRIVATE_KEY from Railway
3. Update documentation
4. Announce fully non-custodial operation

---

## ✅ Testing Checklist

### Wallet Connection
- [ ] User can connect wallet
- [ ] Signature verification works
- [ ] Invalid signatures rejected
- [ ] Expired sessions rejected
- [ ] User can disconnect wallet
- [ ] Duplicate connections prevented

### Withdrawal Approval
- [ ] Small withdrawals auto-approved
- [ ] Large withdrawals enter queue
- [ ] Admin can view pending
- [ ] Admin can approve withdrawal
- [ ] Admin can reject withdrawal
- [ ] Expired requests cleaned up
- [ ] Users notified of status

### Multi-Sig
- [ ] Multi-sig wallet created
- [ ] Proposals created successfully
- [ ] Signers can approve
- [ ] Transaction executes at threshold
- [ ] Rejection prevents execution
- [ ] Expired proposals cleaned up
- [ ] Unauthorized signers rejected

### Audit Trail
- [ ] All actions logged
- [ ] Logs include timestamps
- [ ] User/admin IDs recorded
- [ ] Transaction hashes stored
- [ ] Logs queryable

---

**Last Updated:** October 30, 2025
**Version:** 1.0.0
**Status:** Ready for Production
