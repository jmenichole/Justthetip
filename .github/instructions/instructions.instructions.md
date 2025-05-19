---
applyTo: '**'
---
# JustTheTip Bot Instructions

## Overview
This project is a multi-coin Discord tip bot supporting Solana (SOL, USDC), Litecoin (LTC), Bitcoin (BTC, testnet), and Bitcoin Cash (BCH). It allows users to tip, withdraw, airdrop, and donate crypto via Discord commands.

## Setup

### 1. Install Dependencies
```zsh
npm install
```

### 2. Environment Variables
Create or update your `.env` file in the project root with the following:
```env
BOT_TOKEN=your_discord_bot_token
SOL_PRIVATE_KEY=[...64-byte array...]
LTC_WALLET_KEY=your_litecoin_private_key
BTC_WIF=your_bitcoin_testnet_wif
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your_api_key
```
- Use `solana-mnemonic-to-json.js` to generate the Solana key.
- Use `generate-btc-testnet-key.js` to generate a Bitcoin testnet WIF and address.

### 3. Key Generation Scripts
- **Solana:**
  ```zsh
  node solana-mnemonic-to-json.js
  # Copy the output array to SOL_PRIVATE_KEY in .env
  ```
- **Bitcoin Testnet:**
  ```zsh
  node generate-btc-testnet-key.js
  # Copy the WIF to BTC_WIF in .env
  ```

### 4. Run the Bot
```zsh
node bot.js
```

## Supported Commands
- `!balance` — Show your balances
- `!tip @user amount coin` — Tip a user (e.g. `!tip @bob 0.1 sol`)
- `!registerwallet coin address` — Register your wallet address
- `!withdraw address amount coin` — Withdraw to external wallet
- `!deposit` — Get deposit instructions
- `!airdrop amount coin` — Create an airdrop for others to collect
- `!collect` — Collect from the latest airdrop
- `!burn amount coin` — Donate to support development
- `!help` — Show help message

Supported coins: `SOL`, `USDC` (Solana), `LTC`, `BTC` (testnet), `BCH`

## Notes
- USDC is supported as an SPL token on Solana.
- BTC is testnet only by default.
- Dogecoin support is removed due to library incompatibility.
- For production, use secure key management and mainnet keys.

## Troubleshooting
- If you see a `bad secret key size` error, ensure your Solana key is a 64-byte array.
- If you see a `Cannot read properties of undefined (reading 'fromWIF')` error, ensure you are using the correct ECPair factory and have set the WIF in `.env`.
- For missing dependencies, run `npm install`.

---
Coding standards, domain knowledge, and preferences that AI should follow.