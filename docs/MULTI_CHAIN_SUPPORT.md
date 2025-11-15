# Multi-Chain Wallet Support

JustTheTip now supports multiple blockchain networks through Magic wallet integration!

## Supported Blockchains

### ☀️ Solana (Default)
- **Symbol:** SOL
- **Token Standard:** SPL
- **Features:** Tips, Airdrops, Swaps, NFTs
- **Description:** Fast, low-cost blockchain - supports SOL and all SPL tokens
- **Explorer:** https://solscan.io

**Usage:**
```
/register-magic
```
or
```
/register-magic chain:solana
```

### ⟠ Ethereum
- **Symbol:** ETH
- **Token Standard:** ERC-20
- **Features:** Tips, NFTs, DeFi
- **Description:** Leading smart contract platform - supports ETH and all ERC-20 tokens
- **Explorer:** https://etherscan.io

**Usage:**
```
/register-magic chain:ethereum
```

### 🟣 Polygon
- **Symbol:** MATIC
- **Token Standard:** ERC-20 (Polygon)
- **Features:** Tips, NFTs
- **Description:** Ethereum Layer 2 - fast and cheap transactions
- **Explorer:** https://polygonscan.com

**Usage:**
```
/register-magic chain:polygon
```

### ₿ Bitcoin
- **Symbol:** BTC
- **Token Standard:** Native
- **Features:** Tips
- **Description:** Original cryptocurrency - store of value
- **Explorer:** https://blockstream.info

**Usage:**
```
/register-magic chain:bitcoin
```

### 🌊 Flow
- **Symbol:** FLOW
- **Token Standard:** Native
- **Features:** NFTs
- **Description:** NFT-focused blockchain by Dapper Labs
- **Explorer:** https://flowscan.org

**Usage:**
```
/register-magic chain:flow
```

## Multi-Chain Features

### Create Multiple Wallets
Users can create wallets on different blockchains:
```
/register-magic chain:solana    # Create Solana wallet
/register-magic chain:ethereum  # Create Ethereum wallet
/register-magic chain:bitcoin   # Create Bitcoin wallet
```

Each chain gets its own unique wallet address!

### View All Wallets
```
/wallet-info
```
Shows all your wallets across different blockchains.

### Chain-Specific Operations
- **Tips:** Currently supports Solana (expanding to other chains)
- **Swaps:** Solana-only (via Jupiter)
- **NFTs:** Solana, Ethereum, Polygon, Flow
- **Airdrops:** Solana

## Default Behavior

When users don't specify a chain, **Solana** is used by default because:
- ✅ Fast transactions (400ms block time)
- ✅ Low fees ($0.00025 per transaction)
- ✅ Full feature support (tips, swaps, NFTs, airdrops)
- ✅ Best user experience for Discord tipping

## Technical Details

### Magic Extensions Used:
- `@magic-ext/solana` - Solana blockchain
- `@magic-ext/bitcoin` - Bitcoin blockchain
- `@magic-ext/flow` - Flow blockchain
- Built-in Ethereum support for ETH and Polygon

### Authentication:
- Discord OAuth instead of email
- One-click wallet creation
- Non-custodial (user controls keys)
- Enterprise-grade security (SOC 2 Type 2)

### Database Schema:
```sql
ALTER TABLE user_wallets ADD COLUMN blockchain TEXT DEFAULT 'solana';
ALTER TABLE user_wallets ADD COLUMN chain_id TEXT;
```

## Help Command

The `/help magic` command shows:
- All supported blockchains with emojis
- Features available on each chain
- How to create wallets for each chain
- Comparison of chains

## Future Additions

Potential chains to add:
- Avalanche
- Base (Coinbase Layer 2)
- Arbitrum
- Optimism
- Cosmos
- Near

To request a new chain, open an issue or contact support!

## Security Notes

- All wallets are non-custodial
- Private keys never leave Magic's secure enclave
- Each blockchain has independent security model
- Users should understand risks of each chain
- Always verify addresses before transactions

## Examples

### New User (Defaults to Solana):
```
User: /register-magic
Bot: Creates Solana wallet
User: Can immediately receive SOL tips
```

### Power User (Multiple Chains):
```
User: /register-magic chain:solana
Bot: ☀️ Solana wallet created: abc123...

User: /register-magic chain:ethereum
Bot: ⟠ Ethereum wallet created: 0x456...

User: /wallet-info
Bot: Shows both wallets:
     ☀️ Solana: abc123...
     ⟠ Ethereum: 0x456...
```

## FAQ

**Q: Can I use the same wallet address across chains?**
A: No, each blockchain has its own address format and cryptography.

**Q: Which chain should I choose?**
A: For Discord tipping, use Solana (default). It's fast and cheap!

**Q: Can I create wallets on all chains?**
A: Yes! Create as many as you want.

**Q: Do I need to pay for wallet creation?**
A: No, it's completely free!

**Q: What if I lose access?**
A: Your wallet is tied to your Discord account. As long as you have Discord access, you can recover it.

---

**Built with ❤️ for the multi-chain future!**
