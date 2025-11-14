# 🔧 Cryptocurrency Support Guide

## ✅ What Your Bot SHOULD Support

Your bot is built on **Solana**, so it can ONLY handle tokens that exist on the Solana blockchain.

### Currently Supported (CORRECT):
1. **SOL** (Solana) - ✅ Native Solana token
2. **USDC** (USD Coin) - ✅ SPL token on Solana
   - Mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

### Currently Supported (INCORRECT - Should Remove):
3. **LTC** (Litecoin) - ❌ **NOT on Solana!**
   - This is a separate blockchain
   - Cannot be used with Solana smart contracts
   - Should be removed from bot commands

---

## 🚀 What You CAN Add (Solana SPL Tokens):

All of these work with your smart contracts because they're SPL tokens on Solana:

### Popular SPL Tokens:
- **BONK** - Solana meme coin
- **WIF** - dogwifhat token  
- **JUP** - Jupiter DEX token
- **RAY** - Raydium DEX token
- **ORCA** - Orca DEX token
- **MNGO** - Mango Markets token

### How to Add New SPL Tokens:

```javascript
// In your bot.js or smart contract config
const SPL_TOKENS = {
  'SOL': {
    mint: null, // Native SOL
    decimals: 9
  },
  'USDC': {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6
  },
  'BONK': {
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5
  },
  'USDT': {
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6
  }
};
```

---

## ❌ What You CANNOT Add (Different Blockchains):

These require completely separate infrastructure:

### Bitcoin Blockchain:
- **BTC** (Bitcoin)
- **LTC** (Litecoin)
- **DOGE** (Dogecoin)
- **BCH** (Bitcoin Cash)

### Ethereum Blockchain:
- **ETH** (Ethereum)
- **USDC** on Ethereum (different from Solana USDC!)
- **WETH**, **LINK**, **UNI**, etc.

### Other Blockchains:
- **ADA** (Cardano)
- **DOT** (Polkadot)
- **AVAX** (Avalanche)

---

## 🔄 How to Remove Litecoin Support

### Step 1: Update Commands
```javascript
// BEFORE (in bot.js commands array):
{ name: 'currency', type: 3, description: 'Currency (SOL, USDC, LTC)', choices: [
  { name: 'SOL', value: 'SOL' },
  { name: 'USDC', value: 'USDC' },
  { name: 'LTC', value: 'LTC' }  // ❌ REMOVE THIS
]}

// AFTER:
{ name: 'currency', type: 3, description: 'Currency (SOL, USDC)', choices: [
  { name: 'SOL', value: 'SOL' },
  { name: 'USDC', value: 'USDC' }
  // LTC removed - not a Solana token!
]}
```

### Step 2: Remove LTC References
```bash
# Find all LTC references in your code
grep -r "LTC" --include="*.js" .

# Update these files:
# - bot.js (command choices)
# - bot_smart_contract.js (if exists)
# - Any validation or helper files
```

### Step 3: Update Help Messages
```javascript
// BEFORE:
**Supported Cryptocurrencies:**
☀️ **SOL** (Solana) - Active
💚 **USDC** (USD Coin on Solana) - Active  
🚀 **LTC** (Litecoin) - Active  // ❌ REMOVE

// AFTER:
**Supported Cryptocurrencies:**
☀️ **SOL** (Solana) - Native token, instant transfers
💚 **USDC** (USD Coin) - Stable $1.00 value, perfect for payments
```

---

## 🎯 Recommended Token Setup

**For a verification bot, you only need:**

1. **SOL** - For payments and fees
2. **USDC** - For stable USD-pegged payments (optional)

That's it! Keep it simple. Users can pay in SOL (0.02 SOL) or USDC (~$3-4).

---

## 💡 Why This Matters:

### Smart Contract Compatibility:
- ✅ **Solana programs** work with SOL + SPL tokens
- ❌ **Solana programs** CANNOT interact with Bitcoin/Litecoin
- 🔗 Different blockchains need different APIs, wallets, and infrastructure

### Your Current Setup:
```javascript
// api/server.js - Uses Solana connection
const connection = new Connection(SOLANA_RPC_URL);
const metaplex = Metaplex.make(connection); // Solana only!

// This ONLY works with Solana blockchain tokens
// Cannot handle BTC, LTC, ETH, etc.
```

---

## 🔧 Quick Fix Commands:

```bash
# 1. Remove LTC from bot commands
# Edit bot.js and bot_smart_contract.js
# Remove LTC from all command choice arrays

# 2. Remove LTC wallet support
# Remove FEE_PAYMENT_LTC_ADDRESS from config

# 3. Update documentation
# Remove LTC references from README, help messages

# 4. Re-register slash commands
node register-commands.js
```

---

## 📚 Learn More:

- **SPL Token List**: https://token.jup.ag/
- **Solana Token Program**: https://spl.solana.com/token
- **Metaplex Standards**: https://docs.metaplex.com/

**Bottom Line:** Stick to SOL and USDC for your verification bot. They're both on Solana and work perfectly with your smart contracts! 🚀
