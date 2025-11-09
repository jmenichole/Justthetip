# JustTheTip Database Schema Diagram

## Table Relationships

```
┌─────────────────┐
│     users       │
│─────────────────│
│ id (PK)         │◄──────────────────────┐
│ user_id (UQ)    │                       │
│ created_at      │                       │
│ updated_at      │                       │
└─────────────────┘                       │
        ▲                                 │
        │                                 │
        │ FK                              │ FK
        │                                 │
┌───────┴─────────┐              ┌────────┴──────────┐
│   balances      │              │   transactions    │
│─────────────────│              │───────────────────│
│ id (PK)         │              │ id (PK)           │
│ user_id (FK)    │              │ transaction_type  │
│ currency        │              │ sender_id (FK)    │
│ amount          │              │ recipient_id (FK) │
│ created_at      │              │ amount            │
│ updated_at      │              │ currency          │
└─────────────────┘              │ status            │
                                 │ created_at        │
                                 └───────────────────┘

┌─────────────────────────────┐
│         tips                │
│─────────────────────────────│
│ id (PK)                     │
│ sender (Discord ID)         │
│ receiver (Discord ID)       │
│ amount                      │
│ currency                    │
│ signature (blockchain)      │
│ created_at                  │
└─────────────────────────────┘

┌─────────────────────────────┐
│      trust_badges           │
│─────────────────────────────│
│ id (PK)                     │
│ discord_id (UQ)             │
│ wallet_address              │
│ mint_address (NFT)          │
│ reputation_score            │
│ discord_username            │
│ created_at                  │
│ updated_at                  │
└─────────────────────────────┘

┌──────────────────────────────┐
│   wallet_registrations       │
│──────────────────────────────│
│ id (PK)                      │
│ discord_user_id (UQ)         │
│ discord_username             │
│ wallet_address               │
│ verified_at                  │
│ nonce                        │
│ message_data (JSONB)         │
│ created_at                   │
└──────────────────────────────┘

┌──────────────────────────────┐
│   registration_nonces        │
│──────────────────────────────│
│ id (PK)                      │
│ nonce (UQ)                   │
│ discord_user_id              │
│ discord_username             │
│ used (boolean)               │
│ used_at                      │
│ created_at                   │
│ (auto-expires after 10 min)  │
└──────────────────────────────┘

┌──────────────────────────────┐
│      verifications           │
│──────────────────────────────│
│ id (PK)                      │
│ discord_id (UQ)              │
│ discord_username             │
│ wallet_address               │
│ terms_version                │
│ timestamp                    │
│ verified (boolean)           │
│ nft_mint_address             │
│ created_at                   │
└──────────────────────────────┘

┌──────────────────────────────┐
│          tickets             │
│──────────────────────────────│
│ id (PK)                      │
│ discord_id                   │
│ discord_username             │
│ subject                      │
│ description                  │
│ status                       │
│ priority                     │
│ created_at                   │
│ updated_at                   │
└──────────────────────────────┘
```

## Table Categories

### 🔐 Core User & Financial Tables
- **users** - Discord user records (base table)
- **balances** - User cryptocurrency balances with high precision
- **transactions** - Complete audit trail for all financial operations

### 💰 Tipping System
- **tips** - Records of all tip transactions between users
  - Stores sender, receiver, amount, currency
  - Includes blockchain signature for verification

### 🏆 Trust & Reputation System
- **trust_badges** - NFT-based trust badges with reputation scores
  - Links Discord ID to wallet and NFT mint address
  - Tracks reputation score for each user

### 🔗 Wallet Management
- **wallet_registrations** - Verified Solana wallet addresses
  - One wallet per Discord user
  - Includes verification timestamp and metadata
- **registration_nonces** - Temporary verification tokens
  - Auto-expires after 10 minutes
  - Prevents replay attacks

### ✅ Verification System
- **verifications** - NFT verification records
  - Proves ownership of Discord + wallet
  - Stores terms acceptance and NFT mint address

### 🎫 Support System
- **tickets** - User support tickets
  - Tracks issues and requests
  - Includes status and priority

## Key Features

### 🔒 Security
- UNIQUE constraints prevent duplicate registrations
- Foreign keys ensure referential integrity
- Indexes on sensitive fields for fast lookups
- Auto-expiring nonces prevent replay attacks

### ⚡ Performance
- 20+ indexes for optimal query speed
- Indexes on: user_id, discord_id, wallet_address, created_at
- Composite indexes for common query patterns

### 🔄 Automation
- Triggers auto-update `updated_at` timestamps
- Function to cleanup expired nonces
- Can schedule with pg_cron for automatic maintenance

### 💵 Financial Safety
- NUMERIC(20, 8) for precise decimal amounts
- Transaction table for complete audit trail
- ACID compliance prevents partial transfers

## Data Flow Examples

### 1. Tip Transaction
```
User A tips User B
├── Check balance in `balances` table
├── Record in `tips` table
├── Update sender balance in `balances`
├── Update receiver balance in `balances`
└── Log in `transactions` table
```

### 2. Wallet Registration
```
User wants to register wallet
├── Generate nonce → store in `registration_nonces`
├── User signs message with wallet
├── Verify signature
├── Store in `wallet_registrations`
└── Mark nonce as used
```

### 3. Trust Badge Minting
```
User registers wallet
├── Check `verifications` table
├── Mint NFT on Solana
├── Store in `trust_badges`
└── Link to user in `users` table
```

## Indexes Summary

### Primary Lookups
- `idx_users_user_id` - Find user by Discord ID
- `idx_trust_badges_discord_id` - Find badge by Discord ID
- `idx_wallet_reg_discord_user` - Find wallet by Discord ID

### Secondary Lookups
- `idx_tips_created_at` - Recent tips
- `idx_transactions_created_at` - Recent transactions
- `idx_tickets_status` - Open tickets

### Verification Lookups
- `idx_wallet_reg_wallet_addr` - Find user by wallet
- `idx_trust_badges_wallet` - Find badge by wallet
- `idx_verifications_nft_mint` - Find verification by NFT

## Storage Estimates

For 1,000 active users:
- **users**: ~100 KB
- **balances**: ~300 KB (3 currencies avg)
- **transactions**: ~1 MB (10 transactions/user)
- **tips**: ~500 KB (5 tips/user)
- **trust_badges**: ~200 KB
- **wallet_registrations**: ~150 KB
- **verifications**: ~200 KB
- **tickets**: ~500 KB (5 tickets/user)
- **Total**: ~3 MB

Supabase free tier: 500 MB (plenty of space!)

## Maintenance

### Daily
- Nonces auto-cleanup (built-in)

### Weekly
- Backup database (Supabase automatic)

### Monthly
- Review ticket status
- Check transaction volume
- Monitor reputation scores

### As Needed
- Vacuum/analyze (Supabase automatic)
- Index maintenance (Supabase automatic)
